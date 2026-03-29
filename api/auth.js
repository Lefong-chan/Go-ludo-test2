const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const generateShortId = () =>
  Math.floor(100000000 + Math.random() * 900000000).toString();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { searchParams } = new URL(req.url, 'http://localhost');
  const action = searchParams.get('action');

  try {

    // ════════════════════════════════════════════════════════════
    // REGISTER
    // POST /api/auth?action=register
    // body: { email, password }
    // ════════════════════════════════════════════════════════════
    if (action === 'register') {
      const { email, password } = req.body;

      const userRecord = await admin.auth().createUser({ email, password });
      const shortId    = generateShortId();

      await db.collection('users').doc(userRecord.uid).set({
        shortId,
        email,
        wallet:        0,
        username:      'New Player',
        usernameLower: 'new player',
        createdAt:     admin.firestore.FieldValue.serverTimestamp(),
      });

      const customToken = await admin.auth().createCustomToken(userRecord.uid);
      return res.status(201).json({
        message:     'Success',
        token:       customToken,
        uid:         shortId,
        firebaseUid: userRecord.uid,
      });
    }

    // ════════════════════════════════════════════════════════════
    // LOGIN
    // POST /api/auth?action=login
    // body: { email, password }
    // ════════════════════════════════════════════════════════════
    if (action === 'login') {
      const { email, password } = req.body;
      const FIREBASE_API_KEY    = process.env.FIREBASE_API_KEY;

      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );

      const authData = await authResponse.json();
      if (!authResponse.ok) throw new Error(authData.error.message);

      const userDoc  = await db.collection('users').doc(authData.localId).get();
      const userData = userDoc.data();

      return res.status(200).json({
        token:        authData.idToken,
        refreshToken: authData.refreshToken,
        uid:          userData ? userData.shortId  : '000000000',
        wallet:       userData ? userData.wallet   : 0,
        username:     userData ? userData.username : 'New Player',
        firebaseUid:  authData.localId,
      });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Auth API Error:', error);
    res.status(400).json({ message: error.message });
  }
};
