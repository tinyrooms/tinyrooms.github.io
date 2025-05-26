const loginForm = document.getElementById("loginForm");
const errorDiv = document.getElementById("error");

// Auto-login if already logged in
const storedId =
  localStorage.getItem("homestayId") || sessionStorage.getItem("homestayId");
if (storedId) {
  window.location.href = "dashboard.html";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorDiv.textContent = "";

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();
  const rememberMe = document.getElementById("rememberMe")?.checked;

  if (!username || !password) {
    errorDiv.textContent = "Please enter username and password.";
    return;
  }

  // Show loading animation
  if (window.showLoader) {
    window.showLoader();
  }

  try {
    // Query homestays collection for matching username
    const querySnapshot = await db
      .collection("homestays")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      // Hide loader and show error
      if (window.hideLoader) {
        window.hideLoader();
      }
      errorDiv.textContent = "Invalid username or password.";
      return;
    }

    const homestayDoc = querySnapshot.docs[0];
    const data = homestayDoc.data();

    if (data.password !== password) {
      // Hide loader and show error
      if (window.hideLoader) {
        window.hideLoader();
      }
      errorDiv.textContent = "Invalid username or password.";
      return;
    }

    // Check if user is blocked
    if (data.blocked === true) {
      // Hide loader and show error
      if (window.hideLoader) {
        window.hideLoader();
      }
      errorDiv.textContent =
        "Your access has been blocked. Please contact support.";
      return;
    }

    // Login successful - save data and redirect
    if (rememberMe) {
      localStorage.setItem("homestayId", homestayDoc.id);
      localStorage.setItem("homestayName", data.name);
    } else {
      sessionStorage.setItem("homestayId", homestayDoc.id);
      sessionStorage.setItem("homestayName", data.name);
    }

    // Hide loader before redirect
    if (window.hideLoader) {
      window.hideLoader();
    }

    window.location.href = "dashboard.html";
  } catch (error) {
    // Hide loader and show error
    if (window.hideLoader) {
      window.hideLoader();
    }
    errorDiv.textContent = "Error during login: " + error.message;
  }
});
