// src/utils/network.js
// ─────────────────────────────────────────────────────────────
// NOTE: ny "lojika Reconnexion" (netState reactive/"reconnecting"
// status + ny overlay manerana ny app, NetworkOverlay.vue) dia
// nesorina (nangatahin'ny mpampiasa, 2026-09) — mbola mety haverina
// any aoriana. "fetchWithTimeout" (fototra ampiasain'ny app rehetra
// hanaovana request) sy "NetworkError" kosa mijanona, satria tsy io
// ilay "Reconnexion" fa ny fototry ny fetch/timeout mihitsy.
// ─────────────────────────────────────────────────────────────

const TIMEOUT_MS = 10000

export class NetworkError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NetworkError'
  }
}

export async function fetchWithTimeout(url, options = {}) {
  if (!navigator.onLine) {
    throw new NetworkError('Connexion perdue. Vérifiez votre connexion.')
  }

  // "AbortController"
  if (typeof AbortController === 'undefined') {
    return await fetch(url, options)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (!navigator.onLine) {
      throw new NetworkError('Connexion perdue. Vérifiez votre connexion.')
    }
    throw new NetworkError('Connexion réseau instable. Réessayez.')
  } finally {
    clearTimeout(timer)
  }
}
