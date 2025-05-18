import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkAtqE9G5EgtC5o116Pg1239yKJ2lq-NY",
  authDomain: "greenhouse-457a1.firebaseapp.com",
  databaseURL:
    "https://greenhouse-457a1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "greenhouse-457a1",
  storageBucket: "greenhouse-457a1.firebasestorage.app",
  messagingSenderId: "1037755273757",
  appId: "1:1037755273757:web:e8456350a8a04cef0e6cf4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
