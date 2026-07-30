// ==========================================================
// JS/firebase.js - FIREBASE INITIALIZATION
// ==========================================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "trippysmehfill.firebaseapp.com",
  projectId: "trippysmehfill",
  storageBucket: "trippysmehfill.appspot.com",
  messagingSenderId: "274607734718",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
