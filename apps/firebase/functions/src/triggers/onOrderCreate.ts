import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onOrderCreate = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    try {
      const order = snap.data();
      const orderId = context.params.orderId;
      
      console.log('New order created:', orderId);
      
      // Notify customer
      await db.collection('notifications').add({
        userId: order.userId,
        type: 'order',
        title: 'Order Placed Successfully',
        body: `Your order #${orderId.substring(0, 8)} has been placed. Waiting for business owner confirmation.`,
        data: { orderId },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Notify business owner
      const business = await db.collection('businesses').doc(order.businessId).get();
      const businessData = business.data();
      
      if (businessData?.ownerId) {
        await db.collection('notifications').add({
          userId: businessData.ownerId,
          type: 'order',
          title: 'New Order Received',
          body: `You have received a new order #${orderId.substring(0, 8)}. Please review and confirm.`,
          data: { orderId },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      
      console.log('Order notifications sent');
    } catch (error) {
      console.error('Error in onOrderCreate trigger:', error);
    }
  });
