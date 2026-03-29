const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential:   admin.credential.cert(serviceAccount),
    databaseURL:  process.env.FIREBASE_DATABASE_URL,
  });
}

const db   = admin.firestore();
const rtdb = admin.database();

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
    // SET ONLINE
    // POST /api/presence?action=set-online
    // Headers: Authorization: Bearer <idToken>
    // ════════════════════════════════════════════════════════════
    if (action === 'set-online') {
      const myUid = await verifyToken(req);

      const presenceRef = rtdb.ref(`presence/${myUid}`);

      await presenceRef.set({
        online:    true,
        lastSeen:  admin.database.ServerValue.TIMESTAMP,
      });

      return res.status(200).json({ message: 'Online status set.' });
    }

    // ════════════════════════════════════════════════════════════
    // SET OFFLINE
    // POST /api/presence?action=set-offline
    // Headers: Authorization: Bearer <idToken>
    // ════════════════════════════════════════════════════════════
    if (action === 'set-offline') {
      const myUid = await verifyToken(req);

      const presenceRef = rtdb.ref(`presence/${myUid}`);

      await presenceRef.set({
        online:   false,
        lastSeen: admin.database.ServerValue.TIMESTAMP,
      });

      return res.status(200).json({ message: 'Offline status set.' });
    }

    // ════════════════════════════════════════════════════════════
    // GET PRESENCE (batch)
    // POST /api/presence?action=get-presence
    // Headers: Authorization: Bearer <idToken>
    // body: { uids: ['uid1', 'uid2', ...] }
    // ════════════════════════════════════════════════════════════
    if (action === 'get-presence') {
      await verifyToken(req);
      const { uids } = req.body;

      if (!Array.isArray(uids) || uids.length === 0) {
        return res.status(400).json({ message: 'uids array required' });
      }

      const results = {};

      await Promise.all(
        uids.map(async (uid) => {
          const snap = await rtdb.ref(`presence/${uid}`).get();
          results[uid] = snap.exists()
            ? snap.val()
            : { online: false, lastSeen: null };
        })
      );

      return res.status(200).json({ presence: results });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Presence API Error:', error);

    if (error.message === 'NO_TOKEN') {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(400).json({ message: error.message });
  }
};
