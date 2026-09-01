<template>
  <!-- ERROR SCREEN -->
  <div v-if="debugError" class="debug-error">
    <div class="debug-error-header">
      ⚠️ APPLICATION ERROR
    </div>

    <div class="debug-error-content">
      <strong>Message:</strong>
      <pre>{{ debugError.message }}</pre>

      <template v-if="debugError.source">
        <strong>Source:</strong>
        <pre>{{ debugError.source }}</pre>
      </template>

      <template v-if="debugError.line">
        <strong>Location:</strong>
        <pre>
Line: {{ debugError.line }}
Column: {{ debugError.column }}
        </pre>
      </template>

      <template v-if="debugError.stack">
        <strong>Stack:</strong>
        <pre>{{ debugError.stack }}</pre>
      </template>
    </div>
  </div>

  <!-- APPLICATION -->
  <template v-else>
    <Auth
      v-if="!loggedIn"
      @auth-success="onAuthSuccess"
    />

    <Home v-else />
  </template>

  <!-- ── Reconnexion / Connexion perdue — manerana ny app manontolo,
       na aiza na aiza toerana misy ny mpampiasa (Auth na Home) ── -->
  <NetworkOverlay />
</template>

<script setup>
import {
  ref,
  onMounted,
  onBeforeUnmount
} from 'vue'

import Auth from './components/Auth.vue'
import Home from './components/Home.vue'
import NetworkOverlay from './components/NetworkOverlay.vue'

const loggedIn = ref(false)
const debugError = ref(null)


/* =========================================
   SHOW ERROR ON SCREEN
========================================= */

const showError = (
  message,
  source = '',
  line = '',
  column = '',
  error = null
) => {
  console.error('APPLICATION ERROR:', {
    message,
    source,
    line,
    column,
    error
  })

  debugError.value = {
    message: String(message || 'Unknown error'),
    source: String(source || ''),
    line: line || '',
    column: column || '',
    stack: error && error.stack
      ? String(error.stack)
      : ''
  }
}


/* =========================================
   GLOBAL JAVASCRIPT ERROR
========================================= */

const handleWindowError = (event) => {
  showError(
    event.message,
    event.filename,
    event.lineno,
    event.colno,
    event.error
  )
}


/* =========================================
   UNHANDLED PROMISE ERROR
========================================= */

const handleUnhandledRejection = (event) => {
  const reason = event.reason

  showError(
    reason && reason.message
      ? reason.message
      : String(reason || 'Unhandled Promise Rejection'),
    '',
    '',
    '',
    reason instanceof Error
      ? reason
      : null
  )
}


/* =========================================
   REGISTER GLOBAL ERROR LISTENERS
========================================= */

window.addEventListener(
  'error',
  handleWindowError
)

window.addEventListener(
  'unhandledrejection',
  handleUnhandledRejection
)


/* =========================================
   APP INITIALIZATION
========================================= */

onMounted(() => {
  try {
    loggedIn.value = !!localStorage.getItem(
      'goludo_session'
    )
  } catch (error) {
    showError(
      error && error.message
        ? error.message
        : 'Error accessing localStorage',
      '',
      '',
      '',
      error
    )
  }

  // Ny "boot loader" (spinner) ao amin'ny index.html dia tsy
  // ilaina intsony rehefa vita ny mount — esorina.
  const bootLoader = document.getElementById('boot-loader')
  if (bootLoader) {
    bootLoader.remove()
  }
})


/* =========================================
   AUTH SUCCESS
========================================= */

const onAuthSuccess = () => {
  try {
    loggedIn.value = true
  } catch (error) {
    showError(
      error && error.message
        ? error.message
        : 'Authentication error',
      '',
      '',
      '',
      error
    )
  }
}


/* =========================================
   REMOVE LISTENERS
========================================= */

onBeforeUnmount(() => {
  window.removeEventListener(
    'error',
    handleWindowError
  )

  window.removeEventListener(
    'unhandledrejection',
    handleUnhandledRejection
  )
})
</script>


<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

body {
  position: relative;
  overflow-x: hidden;
}

/* Background miaraka amin'ny blur */
body::before {
  content: '';
  position: fixed;
  inset: -5px;

  background-image: url('./assets/images/bg/ludo_bg.png');
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;

  filter: blur(1px) brightness(0.5);

  z-index: -1;
}

/* Content eo ambonin'ny background */
#app {
  position: relative;
  z-index: 1;
}

#app-main {
  width: 100%;
  min-height: 100vh;
}


/* =========================================
   DEBUG ERROR SCREEN
========================================= */

.debug-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  width: 100%;
  min-height: 100vh;

  background: #111;
  color: #ffffff;

  z-index: 999999999;

  overflow-y: auto;

  font-family: Arial, sans-serif;
}

.debug-error-header {
  position: sticky;
  top: 0;

  background: #d50000;
  color: white;

  padding: 16px;

  font-size: 18px;
  font-weight: bold;

  text-align: center;

  z-index: 1;
}

.debug-error-content {
  padding: 20px;

  font-size: 14px;

  word-break: break-word;
}

.debug-error-content strong {
  display: block;

  margin-top: 20px;
  margin-bottom: 8px;

  color: #ff5252;
}

.debug-error-content pre {
  margin: 0;

  padding: 12px;

  white-space: pre-wrap;
  word-break: break-word;

  background: #222;

  border-radius: 8px;

  color: #ffffff;

  font-size: 12px;

  line-height: 1.5;
}
</style>
