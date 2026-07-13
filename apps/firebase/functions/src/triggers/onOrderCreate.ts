import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  NEW_ORDER_SOUND_ANDROID,
  NEW_ORDER_SOUND_IOS,
  notifyOwnerNewOrder,
  notifyUsersByExternalIds,
  sendExpoPushNotification,
} from "../utils/oneSignal";

const db = admin.firestore();

async function sendPushNotification(userId: string, title: string, body: string, data: Record<string, string>) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() ?? {};
    const fcmToken = userData.fcmToken;
    const pushToken = userData.pushToken;
    if (!fcmToken && !pushToken) return;

    if (fcmToken) {
      await admin.messaging().send({
        token: fcmToken,
        notification: {title, body},
        data,
        android: {priority: "high", notification: {channelId: "orders", sound: "default"}},
        apns: {payload: {aps: {sound: "default", badge: 1}}},
      });
    }

    if (!fcmToken && pushToken) {
      await sendExpoPushNotification(pushToken, title, body, data);
    }
  } catch (err) {
    console.warn("FCM send failed for user", userId, err);
  }
}

async function sendOwnerNewOrderPush(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>
) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() ?? {};
    const fcmToken = userData.fcmToken;
    const pushToken = userData.pushToken;
    if (!fcmToken && !pushToken) return;

    if (fcmToken) {
      await admin.messaging().send({
        token: fcmToken,
        notification: {title, body},
        data,
        android: {
          priority: "high",
          notification: {
            channelId: "orders",
            sound: NEW_ORDER_SOUND_ANDROID,
            clickAction: "OPEN_ORDERS",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: NEW_ORDER_SOUND_IOS,
              badge: 1,
              category: "ORDER_REVIEW",
            },
          },
        },
      });
    }

    if (!fcmToken && pushToken) {
      await sendExpoPushNotification(pushToken, title, body, data);
    }
  } catch (err) {
    console.warn("Owner FCM send failed for user", userId, err);
  }
}

export const onOrderCreate = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    try {
      const order = snap.data();
      const orderId = context.params.orderId;
      const orderRef = orderId.substring(0, 8).toUpperCase();

      console.log("New order created:", orderId);

      const customerTitle = "Order Placed Successfully";
      const customerBody = `Your order #${orderRef} for Rs ${order.finalAmount} has been placed. Waiting for store confirmation.`;

      // In-app notification (Firestore)
      await db.collection("notifications").add({
        userId: order.userId,
        type: "order",
        title: customerTitle,
        body: customerBody,
        data: {orderId, status: "pending"},
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // FCM push to customer
      await sendPushNotification(order.userId, customerTitle, customerBody, {orderId, status: "pending"});
      // OneSignal push to customer (if mobile registered external_user_id)
      const customerOneSignalResult = await notifyUsersByExternalIds([order.userId], customerTitle, customerBody, {orderId, status: "pending"});
      if (!customerOneSignalResult || customerOneSignalResult.ok === false) {
        const customerDoc = await db.collection("users").doc(order.userId).get();
        const customerPushToken = customerDoc.data()?.pushToken;
        if (customerPushToken) {
          await sendExpoPushNotification(customerPushToken, customerTitle, customerBody, {orderId, status: "pending"});
        }
      }

      // Notify business owner
      const business = await db.collection("businesses").doc(order.businessId).get();
      const businessData = business.data();

      if (businessData?.ownerId) {
        const ownerTitle = "🔔 New Order!";
        const ownerBody = `Order #${orderRef} from ${order.userName} — Rs ${order.finalAmount} · ${order.items.length} item(s). Tap to accept or reject.`;

        await db.collection("notifications").add({
          userId: businessData.ownerId,
          type: "order",
          title: ownerTitle,
          body: ownerBody,
          data: {orderId, status: "pending", action: "review"},
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const ownerData = {
          orderId: String(orderId),
          status: "pending",
          action: "review",
        };

        // FCM push to business owner — custom sound + iOS action category
        await sendOwnerNewOrderPush(businessData.ownerId, ownerTitle, ownerBody, ownerData);
        // OneSignal push to business owner — custom sound + accept/reject buttons
        const ownerOneSignalResult = await notifyOwnerNewOrder([businessData.ownerId], ownerTitle, ownerBody, ownerData);
        if (!ownerOneSignalResult || ownerOneSignalResult.ok === false) {
          const ownerDoc = await db.collection("users").doc(businessData.ownerId).get();
          const ownerPushToken = ownerDoc.data()?.pushToken;
          if (ownerPushToken) {
            await sendExpoPushNotification(ownerPushToken, ownerTitle, ownerBody, {orderId, status: "pending", action: "review"});
          }
        }
      }

      console.log("Order notifications sent");
    } catch (error) {
      console.error("Error in onOrderCreate trigger:", error);
    }
  });
