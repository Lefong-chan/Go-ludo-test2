<!--
  NetworkOverlay.vue — fanambarana manerana ny app manontolo (jereo
  App.vue, mihoatra ny "Auth"/"Home" — "Miseho amin'ny Vue rehetra")
  rehefa misy olana reseau, mitovy sary/endrika amin'ilay "boot loader"
  (logo GoLudo + spinner) ao amin'ny index.html:
    - "reconnecting" (fetch tsy nety valiny 10s, fa mbola "online" ny
      navigateur — jereo fetchWithTimeout ao network.js): logo + spinner
      miodina + "Reconnexion…".
    - "offline" (navigator.onLine=false — tena tapaka ny reseau/donné
      mobile): icône wifi tapaka (tsy miodina) + "Connexion perdue".
  "online": tsy misy miseho (v-if).
-->
<template>
  <Teleport to="body">
    <div v-if="netState.status !== 'online'" class="net-ovl">
      <template v-if="netState.status === 'reconnecting'">
        <img class="net-logo" src="../assets/images/logo/Go_Ludo.png" alt="Go Ludo">
        <div class="net-spinner"></div>
        <p class="net-label">Reconnexion…</p>
      </template>
      <template v-else>
        <span class="material-icons net-offline-icon">wifi_off</span>
        <p class="net-label">Connexion perdue</p>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { netState } from '../utils/network'
</script>

<style scoped>
.net-ovl {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #0a111f;
}
/* "gap" (flexbox) — jereo ny fanazavana efa nita matetika amin'ity app
   ity (App.vue/Home.vue, sns): margin eo amin'ny zanaka fa tsy "gap",
   mba ho azo antoka amin'ny navigateur taloha rehetra. */
.net-ovl > * + * { margin-top: 16px; }

.net-logo {
  width: 62vw;
  width: min(180px, 62vw);
  filter: drop-shadow(0 8px 24px rgba(255, 217, 102, 0.25));
}

.net-spinner {
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 3px solid rgba(255, 217, 102, 0.25);
  border-top-color: #ffd966;
  animation: netSpin 0.8s linear infinite;
}
@keyframes netSpin { to { transform: rotate(360deg); } }

.net-offline-icon {
  font-size: 48px;
  color: #ff8080;
}

.net-label {
  font-family: Arial, sans-serif;
  font-size: 14px;
  letter-spacing: 1px;
  color: #dde5f0;
  opacity: 0.85;
}
</style>
