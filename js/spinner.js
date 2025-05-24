// firebase-config.js

/*function fetchFirebaseConfigSync(url) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false); // false = synchronous request
  xhr.send(null);
  if (xhr.status === 200) {
    return JSON.parse(xhr.responseText);
  } else {
    throw new Error("Failed to fetch Firebase config synchronously");
  }
}

const firebaseConfig = fetchFirebaseConfigSync(
  "https://firebase-config-server-cg75.onrender.com/api/firebase-config"
);

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();*/


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
