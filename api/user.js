const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('NO_TOKEN');
  const idToken      = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken.uid;
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
    // UPDATE AVATAR
    // POST /api/user?action=update-avatar
    // Headers: Authorization: Bearer <idToken>
    // body: { avatar }   (single emoji string)
    // ════════════════════════════════════════════════════════════
    if (action === 'update-avatar') {
      const uid = await verifyToken(req);

      const { avatar } = req.body;
      if (!avatar) return res.status(400).json({ message: 'Avatar required' });

      const now = admin.firestore.FieldValue.serverTimestamp();

      await db.collection('users').doc(uid).update({ avatar, updatedAt: now });

      try {
        const friendsSnap = await db.collection('users').doc(uid)
          .collection('friends')
          .where('status', '==', 'accepted')
          .get();

        if (!friendsSnap.empty) {
          const BATCH_SIZE = 400;
          let batch       = db.batch();
          let writeCount  = 0;

          for (const friendDoc of friendsSnap.docs) {
            const friendUid = friendDoc.id;
            const ref = db.collection('users').doc(friendUid)
              .collection('friends').doc(uid);
            batch.update(ref, { avatar, updatedAt: now });
            writeCount++;

            if (writeCount === BATCH_SIZE) {
              await batch.commit();
              batch      = db.batch();
              writeCount = 0;
            }
          }

          if (writeCount > 0) await batch.commit();
        }
      } catch {
      }

      return res.status(200).json({ message: 'Avatar updated.', avatar });
    }

    // ════════════════════════════════════════════════════════════
    // GET EMAIL
    // GET /api/user?action=get-email
    // Headers: Authorization: Bearer <idToken>
    // ════════════════════════════════════════════════════════════
    if (action === 'get-email') {
      const uid        = await verifyToken(req);
      const userRecord = await admin.auth().getUser(uid);

      return res.status(200).json({ email: userRecord.email || '' });
    }

    // ════════════════════════════════════════════════════════════
    // GET PROFILE
    // GET /api/user?action=get-profile
    // Headers: Authorization: Bearer <idToken>
    // ════════════════════════════════════════════════════════════
    if (action === 'get-profile') {
      const uid     = await verifyToken(req);
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });

      const d = userDoc.data();
      return res.status(200).json({
        firebaseUid: uid,
        shortId:     d.shortId,
        username:    d.username,
        avatar:      d.avatar || '👤',
        wallet:      d.wallet  || 0,
      });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('User API Error:', error);

    if (error.message === 'NO_TOKEN') {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(400).json({ message: error.message });
  }
};
