// src/firebase.js
// ─────────────────────────────────────────────────────────────
// Firebase CLIENT SDK (navigateur) — nampidirina (2026-09) mba
// hisoloana ny "polling" HTTP (jereo Game.vue teo aloha) an'ny statut
// an'ny lalao (game state) amin'ny fifandraisana "realtime" — tsy
// misy "lecture" fangatahina intsony raha tsy niova tokoa ilay
// document (fa tsy isaky ny "tick" na niova na tsy niova).
//
// BUGFIX (2026-09, "roll tsy mifindra any amin'ny adversaire"): ny
// version voalohany dia nampiasa Firestore ("gameStates" collection,
// onSnapshot + session Firebase Auth client). Raha tsy azo tratrarina
// ny backend Firestore (env vars/session tsy nety), dia "onSnapshot"
// TSY MIANTSO ny "error callback" (natao hiverina amin'ny "fallback")
// — miantso NY "SUCCESS callback" ihany, miaraka amin'ny "snapshot"
// an-toerana ("cache offline", tsy misy angona), ka "silencieux" ny
// fahatapahana. Nangatahin'ny mpampiasa: mifindra ho Firebase
// REALTIME DATABASE (RTDB, efa nampiasaina teo aloha ho an'ny
// "wallets/{uid}", jereo api/wallet.js) ho an'ny "gameStates" (jereo
// api/game.js) — "public read" (jereo database.rules.json: tsy misy
// angona "sensible" ao anatiny — tsy misy uid, mot de passe, mise),
// ka TSY mila session Firebase Auth client intsony (io no antony tsy
// misy "auth"/"firebase/auth" eto intsony).
//
// ── Ireo "environment variable" ilaina (VITE_FIREBASE_*) ───────────
// Alaina ao amin'ny Firebase Console → Paramètres du projet → Général
// → "Vos applications" (Web app — "</>", mamorona iray raha mbola
// tsy misy) — angona PUBLIKA ireo (tsy "secret"), azo aseho amin'ny
// bundle client tsy misy olana. "VITE_FIREBASE_DATABASE_URL" dia
// mitovy VALUE amin'ny "FIREBASE_DATABASE_URL" (server, api/*.js) —
// variable HAFA (VITE_ prefix) satria tsy mitovy "environment" ny
// build client (Vite) sy ny fonction server (Node/Vercel).
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey:      import.meta.env.VITE_FIREBASE_API_KEY,
  projectId:   import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

export const firebaseApp = initializeApp(firebaseConfig)
export const rtdb = getDatabase(firebaseApp)
