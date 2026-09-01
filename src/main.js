import { createApp } from 'vue'
import App from './App.vue'

// ── Fandefasana ny error any amin'ny /api/log (=> hita ao amin'ny
//    logs Vercel). Mitovy lojika amin'ilay ao anaty index.html, fa
//    ity eto dia manokana ho an'ny error avy amin'i Vue mihitsy
//    (component, render, sns), izay tsy voarain'ny window.onerror
//    matetika satria voarindran'i Vue ao anatiny.
const sentLogs = {}
function logToServer(payload) {
  try {
    const key = `${payload.type || ''}|${payload.message || ''}`
    if (sentLogs[key]) return
    sentLogs[key] = true

    payload.url = window.location.href
    payload.userAgent = navigator.userAgent

    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch (e) {
    // Tsy misy azo atao raha na dia ny fetch aza tsy mandeha
  }
}

try {
  const app = createApp(App)

  // ── Error mitranga anaty component (render, lifecycle hook,
  //    watcher, sns) — ity no fomba "officiel" ampiasain'i Vue mba
  //    hisitrahana ny error rehetra, fa tsy hampijanona ny app
  //    manontolo tsy misy trace.
  app.config.errorHandler = (err, instance, info) => {
    logToServer({
      type: 'vue-error',
      message: err && err.message ? String(err.message) : String(err),
      stack: err && err.stack ? String(err.stack) : null,
      extra: { info, component: instance && instance.$options && instance.$options.name },
    })
    console.error('[Vue error]', err, info)
  }

  app.mount('#app')
} catch (err) {
  // Raha mihoatra ny mount() mihitsy (ohatra: App.vue tsy afaka
  // "compile" amin'io navigateur io) dia alefa ihany koa.
  logToServer({
    type: 'mount-error',
    message: err && err.message ? String(err.message) : String(err),
    stack: err && err.stack ? String(err.stack) : null,
  })
  console.error('[Mount error]', err)

  // Esorina ny "boot loader" (spinner) satria tsy hisy mahavita
  // manesotra azy raha tsy vita ny mount — aleo aseho fa maty
  // fotsiny toy izay hijanona ho spinner mandrakizay.
  const bootLoader = document.getElementById('boot-loader')
  if (bootLoader) {
    bootLoader.remove()
  }
}
