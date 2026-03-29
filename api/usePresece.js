/**
 * usePresence.js
 *
 * Composable mikarakara ny presence amin'ny RTDB mivantana avy amin'ny client.
 *
 * Fomba fampiasana:
 *   import { usePresence } from '@/composables/usePresence'
 *   const { initMyPresence, destroyMyPresence, subscribePresence, getPresence, formatLastSeen } = usePresence()
 *
 *   // Rehefa miditra ny user (Dashboard onMounted):
 *   initMyPresence(firebaseUid)
 *
 *   // Rehefa miala ny user (logout / beforeunload):
 *   destroyMyPresence()
 *
 *   // Ho an'ny friends list (ModalSocial):
 *   subscribePresence(uid)   // manomboka mihaino
 *   getPresence(uid)         // averina { online, lastSeen }
 */

import { ref }                                     from 'vue'
import { initializeApp, getApps }                  from 'firebase/app'
import {
  getDatabase,
  ref      as dbRef,
  onValue,
  off,
  set,
  onDisconnect,
  serverTimestamp,
}                                                  from 'firebase/database'

// ── Firebase init (singleton) ──────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       "https://go-ludo-gascar-default-rtdb.europe-west1.firebasedatabase.app",
}
const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const rtdb        = getDatabase(firebaseApp)

// ── Shared state (module-level singleton) ──────────────────────
// presenceMap: { [uid]: { online: bool, lastSeen: number|null } }
const presenceMap    = ref({})
const presenceUnsubs = {}   // { uid: unsubFn }
let   myUid          = null
let   myPresenceRef  = null

// ── initMyPresence ─────────────────────────────────────────────
// Antsoina rehefa miditra ny user.
// Mametraka online: true mivantana amin'ny RTDB,
// ary mametraka onDisconnect mba ho Offline + lastSeen rehefa miala ny WebSocket.
const initMyPresence = async (uid) => {
  if (!uid) return
  myUid        = uid
  myPresenceRef = dbRef(rtdb, `presence/${uid}`)

  // onDisconnect: atao ALOHAN'ny set mba ho voaray tsara
  await onDisconnect(myPresenceRef).set({
    online:   false,
    lastSeen: serverTimestamp(),
  })

  // Mametraka Online
  await set(myPresenceRef, {
    online:   true,
    lastSeen: serverTimestamp(),
  })
}

// ── destroyMyPresence ──────────────────────────────────────────
// Antsoina rehefa logout na rehefa miala am-pahalalana.
const destroyMyPresence = async () => {
  if (!myPresenceRef) return
  try {
    await set(myPresenceRef, {
      online:   false,
      lastSeen: serverTimestamp(),
    })
  } catch { /* tsy maintsy miala na misy olana */ }
  myPresenceRef = null
  myUid         = null
}

// ── subscribePresence ──────────────────────────────────────────
// Manomboka mihaino ny presence an'ilay uid (realtime).
// Tsy misy olana ra antsoina maromaro ho an'ny uid iray.
const subscribePresence = (uid) => {
  if (!uid || presenceUnsubs[uid]) return
  const r = dbRef(rtdb, `presence/${uid}`)
  const handler = (snap) => {
    const val = snap.val()
    presenceMap.value = {
      ...presenceMap.value,
      [uid]: val
        ? { online: !!val.online, lastSeen: val.lastSeen ?? null }
        : { online: false, lastSeen: null },
    }
  }
  onValue(r, handler)
  presenceUnsubs[uid] = () => off(r, 'value', handler)
}

// ── unsubscribePresence ────────────────────────────────────────
const unsubscribePresence = (uid) => {
  if (presenceUnsubs[uid]) {
    presenceUnsubs[uid]()
    delete presenceUnsubs[uid]
  }
}

// ── stopAllPresenceListeners ───────────────────────────────────
const stopAllPresenceListeners = () => {
  Object.keys(presenceUnsubs).forEach(unsubscribePresence)
}

// ── getPresence ────────────────────────────────────────────────
const getPresence = (uid) => {
  return presenceMap.value[uid] ?? { online: false, lastSeen: null }
}

// ── formatLastSeen ─────────────────────────────────────────────
// < 1 min  → "Just now"
// < 1 hr   → "X min ago"
// < 1 day  → "X hr ago"
// ≥ 1 day  → "X days ago"
const formatLastSeen = (ts) => {
  if (!ts) return 'Offline'
  const diffMs  = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
}

// ── Export ─────────────────────────────────────────────────────
export const usePresence = () => ({
  presenceMap,
  initMyPresence,
  destroyMyPresence,
  subscribePresence,
  unsubscribePresence,
  stopAllPresenceListeners,
  getPresence,
  formatLastSeen,
})
