import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    console.log('New user created:', user.uid);
    
    // Send welcome notification
    await db.collection('notifications').add({
      userId: user.uid,
      type: 'system',
      title: 'Welcome to OurBlock!',
      body: 'Thank you for joining our community. Start exploring local businesses in your society.',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('Welcome notification sent to user:', user.uid);
  } catch (error) {
    console.error('Error in onUserCreate trigger:', error);
  }
});
