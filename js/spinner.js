// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyDJ8sLIFTNVTG19bTS_ceaCFFvFjfjWcs0",
  authDomain: "tinyrooms-66761.firebaseapp.com",
  projectId: "tinyrooms-66761",
  storageBucket: "tinyrooms-66761.firebasestorage.app",
  messagingSenderId: "360096531553",
  appId: "1:360096531553:web:22298f4bd619681bda1620",
  measurementId: "G-936FJ0KH6M",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
