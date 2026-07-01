import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { notifyUsersByExternalIds } from '../utils/oneSignal';

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

const statusMessages: Record<string, string> = {
  confirmed: 'Your order has been accepted by the store',
  preparing: 'Your order is being processed',
  ready: 'Your order is ready for collection/delivery',
  outForDelivery: 'Your order is on its way',
  delivered: 'Your order has been completed',
  cancelled: 'Your order has been cancelled',
  rejected: 'Your order has been rejected by the store',
};

export const onOrderUpdate = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      const orderId = context.params.orderId;
      const orderRef = orderId.substring(0, 8).toUpperCase();

      if (before.status !== after.status) {
        console.log(`Order ${orderId} status changed: ${before.status} -> ${after.status}`);

        let message = statusMessages[after.status] || 'Order status updated';

        if (after.status === 'rejected' && after.rejectionReason) {
          message = `Your order was rejected: ${after.rejectionReason}`;
        }

        const title = after.status === 'rejected' ? 'Order Rejected' : 'Order Update';
        const body = `Order #${orderRef}: ${message}`;

        // Firestore in-app notification
        await db.collection('notifications').add({
          userId: after.userId,
          type: 'order',
          title,
          body,
          data: {
            orderId,
            status: after.status,
            ...(after.rejectionReason ? { rejectionReason: after.rejectionReason } : {}),
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // FCM push to customer
        const pushData: Record<string, string> = { orderId, status: after.status };
        if (after.rejectionReason) pushData.rejectionReason = after.rejectionReason;
        await sendPushNotification(after.userId, title, body, pushData);
        // OneSignal push to customer (external_user_id)
        await notifyUsersByExternalIds([after.userId], title, body, pushData);

        console.log('Order update notification sent');
      }
    } catch (error) {
      console.error('Error in onOrderUpdate trigger:', error);
    }
  });
