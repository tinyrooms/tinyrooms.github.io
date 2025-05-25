// firebase-config.js

let firebaseConfig;

const dbReady = fetch("https://firebase-config-server-cg75.onrender.com/api/config") // replace with actual URL
  .then((res) => res.json())
  .then((config) => {
    firebaseConfig = config;

    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized");

    window.db = firebase.firestore();
    console.log("db is set globally");
  })
  .catch((err) => {
    console.error("Firebase config fetch failed:", err);
  });

// Optional: expose dbReady for waiting if needed
window.dbReady = dbReady;
