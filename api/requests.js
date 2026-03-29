const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const FRIENDS_LIMIT = 100;

const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('NO_TOKEN');
  const idToken      = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken.uid;
};

const countAcceptedFriends = async (uid) => {
  const snap = await db.collection('users').doc(uid)
    .collection('friends')
    .where('status', '==', 'accepted')
    .get();
  return snap.size;
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { searchParams } = new URL(req.url, 'http://localhost');
  const action = searchParams.get('action');

  try {

    // ════════════════════════════════════════════════════════════
    // SEND REQUEST
    // POST /api/requests?action=send-request
    // Headers: Authorization: Bearer <idToken>
    // body: { targetFirebaseUid }
    // ════════════════════════════════════════════════════════════
    if (action === 'send-request') {
      const myUid = await verifyToken(req);
      const { targetFirebaseUid } = req.body;

      if (!targetFirebaseUid)          return res.status(400).json({ message: 'targetFirebaseUid required' });
      if (targetFirebaseUid === myUid) return res.status(400).json({ message: 'Cannot add yourself' });

      const existingSnap = await db.collection('users').doc(myUid)
        .collection('friends').doc(targetFirebaseUid).get();

      if (existingSnap.exists) {
        return res.status(409).json({ message: 'Request already sent or already friends' });
      }

      const myCount = await countAcceptedFriends(myUid);
      if (myCount >= FRIENDS_LIMIT) {
        return res.status(403).json({
          code:    'FRIENDS_LIMIT_SENDER',
          message: `You've reached your friend limit. Remove someone to add new friends.`,
        });
      }

      const targetCount = await countAcceptedFriends(targetFirebaseUid);
      if (targetCount >= FRIENDS_LIMIT) {
        return res.status(403).json({
          code:    'FRIENDS_LIMIT_TARGET',
          message: `This player's friend list is full.`,
        });
      }

      const [myDoc, targetDoc] = await Promise.all([
        db.collection('users').doc(myUid).get(),
        db.collection('users').doc(targetFirebaseUid).get(),
      ]);

      if (!targetDoc.exists) return res.status(404).json({ message: 'Player not found' });

      const myData     = myDoc.data();
      const targetData = targetDoc.data();
      const now        = admin.firestore.FieldValue.serverTimestamp();

      await Promise.all([
        db.collection('users').doc(myUid)
          .collection('friends').doc(targetFirebaseUid).set({
            status:    'pending_sent',
            username:  targetData.username,
            shortId:   targetData.shortId,
            updatedAt: now,
          }),
        db.collection('users').doc(targetFirebaseUid)
          .collection('friends').doc(myUid).set({
            status:    'pending_received',
            username:  myData.username,
            shortId:   myData.shortId,
            updatedAt: now,
          }),
      ]);

      return res.status(200).json({ message: 'Friend request sent.' });
    }

    // ════════════════════════════════════════════════════════════
    // ACCEPT REQUEST
    // POST /api/requests?action=accept-request
    // Headers: Authorization: Bearer <idToken>
    // body: { requesterFirebaseUid }
    // ════════════════════════════════════════════════════════════
    if (action === 'accept-request') {
      const myUid = await verifyToken(req);
      const { requesterFirebaseUid } = req.body;

      if (!requesterFirebaseUid) return res.status(400).json({ message: 'requesterFirebaseUid required' });

      const myCount = await countAcceptedFriends(myUid);
      if (myCount >= FRIENDS_LIMIT) {
        return res.status(403).json({
          code:    'FRIENDS_LIMIT_ACCEPT',
          message: `You've reached your friend limit. Remove someone to accept new requests.`,
        });
      }

      const requesterCount = await countAcceptedFriends(requesterFirebaseUid);
      if (requesterCount >= FRIENDS_LIMIT) {
        return res.status(403).json({
          code:    'FRIENDS_LIMIT_REQUESTER',
          message: `This player's friend list is now full.`,
        });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      await Promise.all([
        db.collection('users').doc(myUid)
          .collection('friends').doc(requesterFirebaseUid)
          .update({ status: 'accepted', updatedAt: now }),
        db.collection('users').doc(requesterFirebaseUid)
          .collection('friends').doc(myUid)
          .update({ status: 'accepted', updatedAt: now }),
      ]);

      return res.status(200).json({ message: 'Friend request accepted.' });
    }

    // ════════════════════════════════════════════════════════════
    // DECLINE REQUEST
    // POST /api/requests?action=decline-request
    // Headers: Authorization: Bearer <idToken>
    // body: { requesterFirebaseUid }
    // ════════════════════════════════════════════════════════════
    if (action === 'decline-request') {
      const myUid = await verifyToken(req);
      const { requesterFirebaseUid } = req.body;

      if (!requesterFirebaseUid) return res.status(400).json({ message: 'requesterFirebaseUid required' });

      await Promise.all([
        db.collection('users').doc(myUid)
          .collection('friends').doc(requesterFirebaseUid).delete(),
        db.collection('users').doc(requesterFirebaseUid)
          .collection('friends').doc(myUid).delete(),
      ]);

      return res.status(200).json({ message: 'Friend request declined.' });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Requests API Error:', error);

    if (error.message === 'NO_TOKEN') {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(400).json({ message: error.message });
  }
};
