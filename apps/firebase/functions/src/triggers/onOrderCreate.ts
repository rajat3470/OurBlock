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
        body: `Your order #${orderId.substring(0, 8)} has been placed for Rs ${order.finalAmount}. Waiting for business owner confirmation.`,
        data: { orderId, status: 'pending' },
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
          title: '✨ New Order Alert',
          body: `💰 Order #${orderId.substring(0, 8)} from ${order.userName} - Rs ${order.finalAmount}. ${order.items.length} item(s). Tap to review and confirm or reject.`,
          data: { orderId, status: 'pending', action: 'review' },
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
