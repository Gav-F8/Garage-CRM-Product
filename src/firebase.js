import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9dLSpj5P_8dCPUfPzi5ydeIx-_aFBs-0",
  authDomain: "classic-garage-mgmt.firebaseapp.com",
  projectId: "classic-garage-mgmt",
  storageBucket: "classic-garage-mgmt.firebasestorage.app",
  messagingSenderId: "215021063501",
  appId: "1:215021063501:web:c4abed06c04b7955d8fb04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
