// src/utils/network.js
// ─────────────────────────────────────────────────────────────

import { reactive } from 'vue'

export const netState = reactive({ status: 'online' })

const TIMEOUT_MS = 10000

export class NetworkError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NetworkError'
  }
}

// "navigator.onLine" + "online"/"offline"
function syncOnlineStatus() {
  if (!navigator.onLine) {
    netState.status = 'offline'
  } else if (netState.status === 'offline') {
    netState.status = 'online'
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOnlineStatus)
  window.addEventListener('offline', syncOnlineStatus)
  syncOnlineStatus()
}

export async function fetchWithTimeout(url, options = {}) {
  if (!navigator.onLine) {
    netState.status = 'offline'
    throw new NetworkError('Connexion perdue. Vérifiez votre connexion.')
  }

  // "AbortController"
  if (typeof AbortController === 'undefined') {
    const res = await fetch(url, options)
    netState.status = 'online'
    return res
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    netState.status = 'online'
    return res
  } catch (e) {
    if (!navigator.onLine) {
      netState.status = 'offline'
      throw new NetworkError('Connexion perdue. Vérifiez votre connexion.')
    }
    netState.status = 'reconnecting'
    throw new NetworkError('Connexion réseau instable. Réessayez.')
  } finally {
    clearTimeout(timer)
  }
}
