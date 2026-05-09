import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const auth = admin.auth();

/**
 * Firestore trigger: fires whenever a society document is deleted.
 * Cascades the delete to all related data:
 *   businesses → products → orders → business-owner accounts
 *
 * This runs regardless of HOW the society was deleted (API, Firebase Console, etc.)
 * so orphaned data is never left behind.
 */
export const onSocietyDelete = functions.firestore
  .document('societies/{societyId}')
  .onDelete(async (snap, context) => {
    const societyId = context.params.societyId;
    console.log(`Society deleted: ${societyId} — starting cascade cleanup`);

    const BATCH_SIZE = 400;

    const deleteInBatches = async (
      snapshot: FirebaseFirestore.QuerySnapshot
    ) => {
      if (snapshot.empty) return;
      let batch = db.batch();
      let count = 0;
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count === BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    };

    try {
      // 1. Find all businesses in this society
      const businessesSnap = await db
        .collection('businesses')
        .where('societyId', '==', societyId)
        .get();

      const businessIds = businessesSnap.docs.map((d) => d.id);
      console.log(`  Found ${businessIds.length} businesses to cascade-delete`);

      // 2. For each business, delete products and orders
      for (const businessId of businessIds) {
        const [productsSnap, ordersSnap] = await Promise.all([
          db.collection('products').where('businessId', '==', businessId).get(),
          db.collection('orders').where('businessId', '==', businessId).get(),
        ]);
        await Promise.all([
          deleteInBatches(productsSnap),
          deleteInBatches(ordersSnap),
        ]);
        console.log(
          `  Business ${businessId}: deleted ${productsSnap.size} products, ${ordersSnap.size} orders`
        );
      }

      // 3. Delete all business documents
      await deleteInBatches(businessesSnap);

      // 4. Delete business-owner accounts (Firebase Auth + Firestore user docs)
      const ownerUsersSnap = await db
        .collection('users')
        .where('societyId', '==', societyId)
        .where('role', '==', 'businessOwner')
        .get();

      const authDeletePromises = ownerUsersSnap.docs.map((d) =>
        auth.deleteUser(d.id).catch((err) => {
          // Auth user may have already been removed — not fatal
          console.warn(`  Could not delete Auth user ${d.id}: ${err.message}`);
        })
      );
      await Promise.all(authDeletePromises);
      await deleteInBatches(ownerUsersSnap);

      console.log(
        `Society ${societyId} cascade complete — ` +
        `${businessesSnap.size} businesses, ${ownerUsersSnap.size} owner accounts removed`
      );
    } catch (error) {
      console.error(`Cascade delete failed for society ${societyId}:`, error);
      // Do not re-throw — the society is already gone; partial cleanup is better than crashing
    }
  });
