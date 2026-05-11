import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

async function sendPushNotification(userId: string, title: string, body: string, data: Record<string, string>) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) return;

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high', notification: { channelId: 'orders', sound: 'default' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
  } catch (err) {
    console.warn('FCM send failed for user', userId, err);
  }
}

export const onOrderCreate = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    try {
      const order = snap.data();
      const orderId = context.params.orderId;
      const orderRef = orderId.substring(0, 8).toUpperCase();
      
      console.log('New order created:', orderId);
      
      const customerTitle = 'Order Placed Successfully';
      const customerBody = `Your order #${orderRef} for Rs ${order.finalAmount} has been placed. Waiting for store confirmation.`;

      // In-app notification (Firestore)
      await db.collection('notifications').add({
        userId: order.userId,
        type: 'order',
        title: customerTitle,
        body: customerBody,
        data: { orderId, status: 'pending' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // FCM push to customer
      await sendPushNotification(order.userId, customerTitle, customerBody, { orderId, status: 'pending' });
      
      // Notify business owner
      const business = await db.collection('businesses').doc(order.businessId).get();
      const businessData = business.data();
      
      if (businessData?.ownerId) {
        const ownerTitle = '🔔 New Order!';
        const ownerBody = `Order #${orderRef} from ${order.userName} — Rs ${order.finalAmount} · ${order.items.length} item(s). Tap to accept or reject.`;

        await db.collection('notifications').add({
          userId: businessData.ownerId,
          type: 'order',
          title: ownerTitle,
          body: ownerBody,
          data: { orderId, status: 'pending', action: 'review' },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // FCM push to business owner — high priority so it wakes the device
        await sendPushNotification(businessData.ownerId, ownerTitle, ownerBody, { orderId, status: 'pending', action: 'review' });
      }
      
      console.log('Order notifications sent');
    } catch (error) {
      console.error('Error in onOrderCreate trigger:', error);
    }
  });
