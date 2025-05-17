// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCRlRwkZrXwIY6b7MgXJe-gvt-tS5-VnjA",
  authDomain: "clean-up-india.firebaseapp.com",
  databaseURL:
    "https://clean-up-india-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clean-up-india",
  storageBucket: "clean-up-india.firebasestorage.app",
  messagingSenderId: "38976459666",
  appId: "1:38976459666:web:ef0c96c351fb5c4b2e274b",
  measurementId: "G-WJZC0WXY2F",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
