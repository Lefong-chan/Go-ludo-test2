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
    // CHECK SESSION
    // GET /api/session?action=check-session
    // Headers: Authorization: Bearer <idToken>
    // ════════════════════════════════════════════════════════════
    if (action === 'check-session') {
      const myUid  = await verifyToken(req);
      const userDoc = await db.collection('users').doc(myUid).get();

      if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });

      const d = userDoc.data();
      return res.status(200).json({
        firebaseUid: myUid,
        uid:         d.shortId,
        username:    d.username,
        wallet:      d.wallet,
      });
    }

    // ════════════════════════════════════════════════════════════
    // REFRESH TOKEN
    // POST /api/session?action=refresh-token
    // body: { refreshToken }
    // ════════════════════════════════════════════════════════════
    if (action === 'refresh-token') {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

      const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

      const r = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        }
      );

      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'Token refresh failed');

      return res.status(200).json({
        token:        data.id_token,
        refreshToken: data.refresh_token,
      });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Session API Error:', error);

    if (error.message === 'NO_TOKEN') {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(400).json({ message: error.message });
  }
};
