async function initFirebase() {
  try {
    const response = await fetch(
      "https://firebase-config-server-cg75.onrender.com/api/firebase-config"
    );
    const firebaseConfig = await response.json();

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // You can now use `db` or export it if needed
    window.db = db;
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
}

initFirebase();
