import { Router, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { FIREBASE_CONFIG } from '../shared/constants';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

const MESSAGES = FIREBASE_CONFIG.COLLECTIONS.MESSAGES;
const CHAT_SESSIONS = FIREBASE_CONFIG.COLLECTIONS.CHAT_SESSIONS;
const BUSINESSES = FIREBASE_CONFIG.COLLECTIONS.BUSINESSES;

// Development mock tokens for testing without a real Firebase Auth session.
const MOCK_TOKEN_UIDS: Record<string, string> = {
  'mock-user-token': 'mock-user-uid',
  'mock-business-token': 'mock-business-uid',
  'mock-admin-token': 'mock-admin-uid',
};

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
  if (token in MOCK_TOKEN_UIDS) {
    (req as any).uid = MOCK_TOKEN_UIDS[token];
    return next();
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    (req as any).uid = decoded.uid;
    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

router.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /chat/sessions — list sessions for the authenticated user
// ---------------------------------------------------------------------------
router.get('/sessions', async (req, res) => {
  try {
    const uid = (req as any).uid;
    const snap = await db
      .collection(CHAT_SESSIONS)
      .where('participantIds', 'array-contains', uid)
      .orderBy('lastMessageAt', 'desc')
      .limit(50)
      .get();

    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('List chat sessions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /chat/sessions — start a session with a business (or return existing)
// ---------------------------------------------------------------------------
router.post('/sessions', async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { businessId } = req.body;
    if (!businessId) return res.status(400).json({ success: false, error: 'businessId is required' });

    const businessDoc = await db.collection(BUSINESSES).doc(businessId).get();
    if (!businessDoc.exists) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
    const businessData = businessDoc.data()!;
    const ownerId = businessData.ownerId as string;
    if (!ownerId) {
      return res.status(400).json({ success: false, error: 'Business has no owner' });
    }

    const existing = await db
      .collection(CHAT_SESSIONS)
      .where('businessId', '==', businessId)
      .where('userId', '==', uid)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      return res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const sessionRef = await db.collection(CHAT_SESSIONS).add({
      participantIds: [uid, ownerId],
      businessId,
      userId: uid,
      businessOwnerId: ownerId,
      businessName: businessData.name || '',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const newDoc = await sessionRef.get();
    return res.status(201).json({ success: true, data: { id: newDoc.id, ...newDoc.data() } });
  } catch (error: any) {
    console.error('Create chat session error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /chat/sessions/:id — fetch a single session
// ---------------------------------------------------------------------------
router.get('/sessions/:id', async (req, res) => {
  try {
    const uid = (req as any).uid;
    const doc = await db.collection(CHAT_SESSIONS).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Session not found' });

    const data = doc.data()!;
    if (!data.participantIds?.includes(uid)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    return res.json({ success: true, data: { id: doc.id, ...data } });
  } catch (error: any) {
    console.error('Get chat session error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /chat/sessions/:id/messages — paginated messages
// ---------------------------------------------------------------------------
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const uid = (req as any).uid;
    const sessionId = req.params.id;
    const sessionDoc = await db.collection(CHAT_SESSIONS).doc(sessionId).get();
    if (!sessionDoc.exists) return res.status(404).json({ success: false, error: 'Session not found' });
    if (!sessionDoc.data()!.participantIds?.includes(uid)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const snap = await db
      .collection(MESSAGES)
      .where('chatSessionId', '==', sessionId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse();
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('List messages error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /chat/sessions/:id/messages — send a message
// ---------------------------------------------------------------------------
router.post('/sessions/:id/messages', async (req, res) => {
  try {
    const uid = (req as any).uid;
    const sessionId = req.params.id;
    const { content, type = 'text' } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const sessionDoc = await db.collection(CHAT_SESSIONS).doc(sessionId).get();
    if (!sessionDoc.exists) return res.status(404).json({ success: false, error: 'Session not found' });

    const sessionData = sessionDoc.data()!;
    const participants: string[] = sessionData.participantIds || [];
    if (!participants.includes(uid)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const receiverId = participants.find((id) => id !== uid) || '';

    const now = admin.firestore.FieldValue.serverTimestamp();
    const messageRef = await db.collection(MESSAGES).add({
      chatSessionId: sessionId,
      senderId: uid,
      receiverId,
      content: content.trim(),
      type,
      read: false,
      createdAt: now,
    });

    await db.collection(CHAT_SESSIONS).doc(sessionId).update({
      lastMessage: { senderId: uid, content: content.trim(), type, createdAt: now },
      lastMessageAt: now,
      updatedAt: now,
    });

    const newDoc = await messageRef.get();
    return res.status(201).json({ success: true, data: { id: newDoc.id, ...newDoc.data() } });
  } catch (error: any) {
    console.error('Send message error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
