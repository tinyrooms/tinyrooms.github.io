const loginForm = document.getElementById("loginForm");
const errorDiv = document.getElementById("error");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorDiv.textContent = "";

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();

  if (!username || !password) {
    errorDiv.textContent = "Please enter username and password.";
    return;
  }

  try {
    // Query homestays collection for matching username
    const querySnapshot = await db
      .collection("homestays")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      errorDiv.textContent = "Invalid username or password.";
      return;
    }

    const homestayDoc = querySnapshot.docs[0];
    const data = homestayDoc.data();

    if (data.password !== password) {
      errorDiv.textContent = "Invalid username or password.";
      return;
    }

    // 🚫 Check if user is blocked
    if (data.blocked === true) {
      errorDiv.textContent =
        "Your access has been blocked. Please contact support.";
      return;
    }

    // ✅ Login successful - save data and redirect
    localStorage.setItem("homestayId", homestayDoc.id);
    localStorage.setItem("homestayName", data.name);
    window.location.href = "dashboard.html";
  } catch (error) {
    errorDiv.textContent = "Error during login: " + error.message;
  }
});
