// api/auth.js
// ─────────────────────────────────────────────────────────────
// Node handler tokana ( POST { action: 'register' | 'login', email, password } )
// Ity fichier ity dia miandraikitra ny fisoratana anarana (register) sy
// ny fidirana (login) amin'ny alalan'i Firebase Authentication ihany.
//
// Ny famoronana ny profil (customUid, username, avatar → Cloud Firestore)
// sy ny wallet (→ Realtime Database) dia atao ao amin'ny api/session.js,
// antsoina eto mivantana mba tsy hisy doublon amin'ny kaody.
// ─────────────────────────────────────────────────────────────

const admin = require('firebase-admin')
const session = require('./session')

function getAdmin() {
  if (!admin.apps.length) {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    })
  }
  return admin
}

// ── Validation ──────────────────────────────────────────────
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function passwordError(password) {
  if (typeof password !== 'string' || password.length <= 6) {
    return 'Le mot de passe doit contenir plus de 6 caractères.'
  }
  if (/\s/.test(password)) {
    return "Le mot de passe ne doit pas contenir d'espace."
  }
  return null
}

// ── Fanovana ireo error code Firebase ho hafatra mazava (Frantsay) ──
function mapAdminAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Un compte utilise déjà cette adresse e-mail.'
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.'
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir plus de 6 caractères.'
    default:
      return 'Impossible de créer le compte. Réessayez.'
  }
}

function mapRestAuthError(code) {
  switch (code) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'E-mail ou mot de passe incorrect.'
    case 'USER_DISABLED':
      return 'Ce compte a été désactivé.'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Trop de tentatives. Réessayez plus tard.'
    default:
      return "Une erreur est survenue lors de la connexion. Réessayez."
  }
}

// ── Handler ───────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body || {}

  const { action, email, password, uid } = body

  // ── DÉCONNEXION ──────────────────────────────────────────────
  // Révoque les refresh tokens Firebase du compte : toute session
  // serveur active pour cet utilisateur est ainsi invalidée. Le nettoyage
  // du localStorage (session client) est fait côté composant appelant.
  if (action === 'logout') {
    if (!uid || typeof uid !== 'string') {
      res.status(400).json({ error: 'Session invalide.' })
      return
    }
    try {
      const adm = getAdmin()
      await adm.auth().revokeRefreshTokens(uid)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error('api/auth.js logout error:', err)
      res.status(500).json({ error: "Impossible de se connecter au serveur. Réessayez." })
    }
    return
  }

  if (action !== 'register' && action !== 'login') {
    res.status(400).json({ error: 'Action inconnue.' })
    return
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' })
    return
  }
  const pwErr = passwordError(password)
  if (pwErr) {
    res.status(400).json({ error: pwErr })
    return
  }

  try {
    const adm = getAdmin()
    const db = adm.firestore()
    const rtdb = adm.database()

    // ── INSCRIPTION ────────────────────────────────────────
    if (action === 'register') {
      let userRecord
      try {
        userRecord = await adm.auth().createUser({ email, password })
      } catch (e) {
        res.status(400).json({ error: mapAdminAuthError(e.code) })
        return
      }

      let profile
      try {
        // customUid, username (null au départ), avatar → Firestore
        // wallet (0 au départ) → Realtime Database
        profile = await session.createInitialProfile(db, rtdb, userRecord.uid, email)
      } catch (e) {
        // manafoana ny kaonty Auth raha tsy nahomby ny famoronana profil, mba tsy hisy kaonty maty
        await adm.auth().deleteUser(userRecord.uid).catch(() => {})
        throw e
      }

      res.status(200).json({
        success: true,
        uid: userRecord.uid,
        email,
        ...profile, // customUid, username, avatar, wallet
      })
      return
    }

    // ── CONNEXION ──────────────────────────────────────────
    const apiKey = process.env.FIREBASE_WEB_API_KEY
    const restRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    )
    const restData = await restRes.json()

    if (!restRes.ok) {
      const code = restData && restData.error && restData.error.message
      res.status(401).json({ error: mapRestAuthError(code) })
      return
    }

    const uid = restData.localId
    const profile = await session.fetchProfile(db, rtdb, uid)

    res.status(200).json({
      success: true,
      uid,
      email,
      ...profile, // customUid, username, avatar, wallet
    })
  } catch (err) {
    console.error('api/auth.js error:', err)
    res.status(500).json({ error: "Impossible de se connecter au serveur. Réessayez." })
  }
}
