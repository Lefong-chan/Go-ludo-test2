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
    // CHECK USERNAME
    // POST /api/user?action=check-username
    // body: { username }
    // ════════════════════════════════════════════════════════════
    if (action === 'check-username') {
      const { username } = req.body;
      if (!username) return res.status(400).json({ message: 'Username required' });

      const snapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();

      return res.status(200).json({ taken: !snapshot.empty });
    }

    // ════════════════════════════════════════════════════════════
    // SET USERNAME
    // POST /api/user?action=set-username
    // Headers: Authorization: Bearer <idToken>
    // body: { username }
    // ════════════════════════════════════════════════════════════
    if (action === 'set-username') {
      const uid = await verifyToken(req);

      const { username } = req.body;
      if (!username) return res.status(400).json({ message: 'Username required' });

      const trimmed = username.trim();

      // ── Validation ──────────────────────────────────────────
      if (trimmed.length < 3 || trimmed.length > 9) {
        return res.status(400).json({ message: 'Username must be 3–9 characters.' });
      }
      if (!/^[A-Za-z]/.test(trimmed)) {
        return res.status(400).json({ message: 'Username must start with a letter.' });
      }
      if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
        return res.status(400).json({ message: 'No special characters allowed.' });
      }
      if (!/^[A-Za-z]+[0-9]*$/.test(trimmed)) {
        return res.status(400).json({ message: 'Letters must come before numbers.' });
      }

      const finalUsername = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

      const snapshot = await db.collection('users')
        .where('username', '==', finalUsername)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return res.status(409).json({ message: 'This username is already taken.' });
      }

      await db.collection('users').doc(uid).update({
        username:      finalUsername,
        usernameLower: finalUsername.toLowerCase(),
        updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ message: 'Username set successfully.', username: finalUsername });
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
