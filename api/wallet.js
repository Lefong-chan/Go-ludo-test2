// api/wallet.js
// ─────────────────────────────────────────────────────────────
// Ity fichier ity dia miandraikitra ny wallet (solde) irery ihany,
// tehirizina ao amin'ny Realtime Database (mety hiova haingana,
// mifototra amin'ny lalao).
//
// Ampiasain'i api/session.js (require mivantana) mba hamoronana
// sy hakana ny wallet rehefa profil, ary azo antsoina mivantana
// amin'ny alalan'ny endpoint POST /api/wallet raha mila hamerina
// ny solde fotsiny, tsy misy ny profil manontolo.
// ─────────────────────────────────────────────────────────────

const admin = require('firebase-admin')

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

// ── Lecture du solde ────────────────────────────────────────────
async function getWallet(rtdb, uid) {
  const snap = await rtdb.ref('wallets/' + uid).get()
  return snap.exists() ? snap.val() : 0
}

// ── Initialisation du solde (nouveau compte, register) ──────────
async function initWallet(rtdb, uid, amount = 0) {
  await rtdb.ref('wallets/' + uid).set(amount)
  return amount
}

// ── Crédit / débit atomique (transaction Realtime Database) ─────
// delta > 0 : crédit, delta < 0 : débit. Annule si solde insuffisant.
async function adjustWallet(rtdb, uid, delta) {
  const ref = rtdb.ref('wallets/' + uid)
  const result = await ref.transaction((current) => {
    const value = typeof current === 'number' ? current : 0
    const next = value + delta
    return next < 0 ? value : next
  })
  if (!result.committed) {
    throw new Error('wallet-transaction-failed')
  }
  return result.snapshot.val()
}

// ── Handler HTTP ( POST { action: 'get', uid } ) ─────────────────
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

  const { action, uid } = body

  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ error: 'Session invalide.' })
    return
  }

  try {
    const adm = getAdmin()
    const rtdb = adm.database()

    if (action === 'get') {
      const wallet = await getWallet(rtdb, uid)
      res.status(200).json({ success: true, wallet })
      return
    }

    res.status(400).json({ error: 'Action inconnue.' })
  } catch (err) {
    console.error('api/wallet.js error:', err)
    res.status(500).json({ error: "Impossible de se connecter au serveur. Réessayez." })
  }
}

// ── Exports ho an'i api/session.js (tsy alalan'ny HTTP) ──────────
module.exports.getWallet    = getWallet
module.exports.initWallet   = initWallet
module.exports.adjustWallet = adjustWallet
