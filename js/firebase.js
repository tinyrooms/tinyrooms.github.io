const SHARED_SECRET = "my_super_secret_123"; // Visible in frontend for now

window.dbReady = (async function loadFirebaseConfig() {
  try {
    const res = await fetch(
      "https://firebase-config-server-sowd.onrender.com/api/config",
      {
        headers: {
          Authorization: `Bearer ${SHARED_SECRET}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch Firebase config: " + res.statusText);
    }

    const firebaseConfig = await res.json();

    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    console.log("Firebase initialized and Firestore is ready");
  } catch (err) {
    console.error("Error loading Firebase config:", err);
    throw err; // rethrow so downstream knows loading failed
  }
})();
