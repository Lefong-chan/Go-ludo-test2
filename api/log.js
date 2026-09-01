// api/log.js
// ─────────────────────────────────────────────────────────────
// Ity fichier ity dia mandray ny "logs" alefan'ny client (téléphone/
// navigateur an'ny mpampiasa) — error JS, page banga (blank page),
// sns — ary manoratra azy amin'ny console.error mba HITA mivantana
// ao amin'ny logs Vercel (Dashboard → Project → Logs / Runtime Logs).
//
// Ampiasain'i index.html (watchdog "blank page") sy i main.js
// (window.onerror, unhandledrejection, Vue errorHandler).
//
// Tsy mila session/uid ity endpoint ity satria mety mitranga ny error
// ALOHAN'NY hisian'ny session (ohatra: raha tsy mahavita mount i Vue
// mihitsy aza).
// ─────────────────────────────────────────────────────────────

const MAX_LEN = 2000

function truncate(value) {
  if (typeof value !== 'string') return value
  return value.length > MAX_LEN ? value.slice(0, MAX_LEN) + '…(tapaka)' : value
}

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

  const entry = {
    time: new Date().toISOString(),
    type: truncate(body.type) || 'unknown',
    message: truncate(body.message),
    stack: truncate(body.stack),
    url: truncate(body.url),
    userAgent: truncate(req.headers['user-agent'] || body.userAgent),
    viewport: body.viewport || null,
    extra: body.extra ? truncate(JSON.stringify(body.extra)) : null,
  }

  // ── Ity no hita ao amin'ny Vercel → Project → Logs ──────────
  console.error('[CLIENT-LOG]', JSON.stringify(entry))

  res.status(200).json({ success: true })
}
