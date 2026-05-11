import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

const statusMessages: Record<string, string> = {
  confirmed: 'Your order has been confirmed by the business owner',
  preparing: 'Your order is being prepared',
  ready: 'Your order is ready',
  outForDelivery: 'Your order is out for delivery',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled',
  rejected: 'Your order has been rejected by the business owner',
};

export const onOrderUpdate = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      const orderId = context.params.orderId;
      
      // Check if status changed
      if (before.status !== after.status) {
        console.log(`Order ${orderId} status changed: ${before.status} -> ${after.status}`);
        
        let message = statusMessages[after.status] || 'Order status updated';
        
        // For rejected orders, append rejection reason if available
        if (after.status === 'rejected' && after.rejectionReason) {
          message = `${message}: ${after.rejectionReason}`;
        }
        
        // Notify customer
        await db.collection('notifications').add({
          userId: after.userId,
          type: 'order',
          title: after.status === 'rejected' ? 'Order Rejected' : 'Order Status Updated',
          body: `Order #${orderId.substring(0, 8)}: ${message}`,
          data: { 
            orderId, 
            status: after.status,
            rejectionReason: after.rejectionReason || undefined,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log('Order update notification sent');
      }
    } catch (error) {
      console.error('Error in onOrderUpdate trigger:', error);
    }
  });
