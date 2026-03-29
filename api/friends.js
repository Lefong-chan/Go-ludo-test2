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
    // SEARCH PLAYER
    // GET /api/friends?action=search-player&q=<username_or_shortId>
    // Headers: Authorization: Bearer <idToken>
    // ════════════════════════════════════════════════════════════
    if (action === 'search-player') {
      const myUid = await verifyToken(req);
      const q     = (searchParams.get('q') || '').trim();

      if (!q) return res.status(400).json({ message: 'Query required' });

      let results    = [];
      const isShortId = /^\d{9}$/.test(q);

      if (isShortId) {
        const snap = await db.collection('users')
          .where('shortId', '==', q)
          .limit(1)
          .get();

        snap.forEach(doc => {
          if (doc.id !== myUid) {
            const d = doc.data();
            results.push({ firebaseUid: doc.id, username: d.username, shortId: d.shortId });
          }
        });

      } else {
        const lower = q.toLowerCase();
        const snap  = await db.collection('users')
          .where('usernameLower', '>=', lower)
          .where('usernameLower', '<=', lower + '\uf8ff')
          .limit(15)
          .get();

        snap.forEach(doc => {
          if (doc.id !== myUid) {
            const d = doc.data();
            results.push({ firebaseUid: doc.id, username: d.username, shortId: d.shortId });
          }
        });
      }

      return res.status(200).json({ results });
    }

    // ════════════════════════════════════════════════════════════
    // REMOVE FRIEND
    // POST /api/friends?action=remove-friend
    // Headers: Authorization: Bearer <idToken>
    // body: { friendFirebaseUid }
    // ════════════════════════════════════════════════════════════
    if (action === 'remove-friend') {
      const myUid = await verifyToken(req);
      const { friendFirebaseUid } = req.body;

      if (!friendFirebaseUid) return res.status(400).json({ message: 'friendFirebaseUid required' });

      await Promise.all([
        db.collection('users').doc(myUid)
          .collection('friends').doc(friendFirebaseUid).delete(),
        db.collection('users').doc(friendFirebaseUid)
          .collection('friends').doc(myUid).delete(),
      ]);

      return res.status(200).json({ message: 'Friend removed.' });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Friends API Error:', error);

    if (error.message === 'NO_TOKEN') {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(400).json({ message: error.message });
  }
};
