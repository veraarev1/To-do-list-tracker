import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCKxjWl2zkk3FCcsZHEtC-azKTgWhghV_c",
  authDomain: "to-do-tracker-bbfeb.firebaseapp.com",
  projectId: "to-do-tracker-bbfeb",
  storageBucket: "to-do-tracker-bbfeb.firebasestorage.app",
  messagingSenderId: "594902302732",
  appId: "1:594902302732:web:c5efab5af2f543791f6e29"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
