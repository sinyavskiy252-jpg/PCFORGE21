import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDgPag6CgyLrfgfSjxZGfpQtAViXHWTv6Q",
  authDomain: "pcforge-fc451.firebaseapp.com",
  projectId: "pcforge-fc451",
  storageBucket: "pcforge-fc451.firebasestorage.app",
  messagingSenderId: "824849014065",
  appId: "1:824849014065:web:50e340af32f471dc446410",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
