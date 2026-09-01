// src/firebase.js
// ─────────────────────────────────────────────────────────────
// Firebase CLIENT SDK (navigateur) — nampidirina (2026-09) mba
// hisoloana ny "polling" (HTTP, isaky ny 150ms, jereo Game.vue teo
// aloha) an'ny statut an'ny lalao (game state) amin'ny Firestore
// "realtime listener" (onSnapshot), izay tsy misy "lecture" Firestore
// intsony raha tsy niova tokoa ilay document (fa tsy isaky ny "tick"
// na niova na tsy niova, jereo BUGFIX GAME_POLL_MS ao Game.vue) —
// nampihena be ny quota "lecture" Firestore (50k/andro amin'ny forfait
// "Spark").
//
// ── Fampiasana ────────────────────────────────────────────────────
// Ity fichier ity dia mamorona ny "app"/"auth"/"db" Firebase client
// ihany (config publika, azo aseho amin'ny navigateur — TSY mitovy
// amin'ny "clé privée" ampiasain'ny firebase-admin any amin'ny api/*.js,
// izay tsy mba mivoaka ny server mihitsy). Ny fidirana (authentification)
// mihitsy dia atao ao amin'ny Auth.vue (signInWithEmailAndPassword,
// aorian'ny fidirana/fisoratana anarana mahomby tamin'ny api/auth.js —
// mitovy uid amin'ny efa nampiasain'ny app manontolo, satria io
// api/auth.js io ihany koa dia Firebase Authentication tena izy).
//
// ── "Security rules" (jereo firestore.rules any amin'ny raki-tany
//    fototry ny projet) ─────────────────────────────────────────────
// "gameStates/{roomId}" ihany no VAKIAN'NY client mivantana (izay TSY
// misy angona "sensible" — tsy misy uid, mot de passe, na mise, jereo
// api/game.js) — "rooms/{roomId}" (misy mot de passe/mise/uid) sy ny
// sisa dia mijanona "admin ihany" (firebase-admin, api/*.js), tsy
// azon'ny client vakiana/ovaina mihitsy. Ny "write" amin'ny
// "gameStates" dia voarara TANTERAKA amin'ny client (ny server ihany,
// amin'ny alalan'ny "roll", no manoratra azy io).
//
// ── Ireo "environment variable" ilaina (VITE_FIREBASE_*, jereo
//    README/fanazavana nomena) ────────────────────────────────────
// Alaina ao amin'ny Firebase Console → Paramètres du projet → Général
// → "Vos applications" (Web app — "</>", mamorona iray raha mbola
// tsy misy) — angona PUBLIKA ireo (tsy "secret"), azo aseho amin'ny
// bundle client tsy misy olana.
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db   = getFirestore(firebaseApp)
