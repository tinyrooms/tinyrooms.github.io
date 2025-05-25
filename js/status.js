document.addEventListener("DOMContentLoaded", () => {
  // Disable right-click context menu gently
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  // Optional: Disable common shortcuts for opening dev tools
  document.addEventListener("keydown", function (e) {
    if (e.key === "F12") e.preventDefault();
    if (
      e.ctrlKey &&
      e.shiftKey &&
      ["I", "C", "J"].includes(e.key.toUpperCase())
    ) {
      e.preventDefault();
    }
  });

  // Helper loader functions
  function showLoader() {
    const loader = document.getElementById("loaderWrapper");
    if (loader) loader.style.display = "flex";
  }

  function hideLoader() {
    const loader = document.getElementById("loaderWrapper");
    if (loader) loader.style.display = "none";
  }
  

  // Grab DOM elements
  const loginForm = document.getElementById("loginForm");
  const details = document.getElementById("details");
  const paymentForm = document.getElementById("paymentForm");
  const progressSection = document.getElementById("progressSection");
  const upiLink = document.getElementById("upiLink");
  const qrCodeDiv = document.getElementById("qrCode");
  const qrCodeContainer = document.getElementById("qrCodeContainer");
  const txnInput = document.getElementById("txnInput");
  const txnError = document.getElementById("txnError");
  const thankYouCard = document.getElementById("thankYouCard");
  const progressInner = document.getElementById("progressInner");
  const planSelect = document.getElementById("plan");

  let selectedAmount = 100;
  let selectedMonths = 1;
  let currentUserDocId = null;
  let userData = null;
  let progressAnimationFrame = null;

  // Format date as "18 May 2025"
  function formatDate(date) {
    const options = { day: "numeric", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options);
  }

  // Plan selection handler
  planSelect.addEventListener("change", (e) => {
    const [amount, months] = e.target.value.split("|");
    selectedAmount = parseInt(amount);
    selectedMonths = parseInt(months);
  });

  // Login form submit handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader();

    if (typeof db === "undefined") {
      console.error(
        "Firebase DB is not defined. Please ensure firebase.js is loaded before status.js."
      );
      alert("Firebase not initialized. Please refresh the page.");
      hideLoader();
      return;
    }

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const snapshot = await db
        .collection("homestays")
        .where("username", "==", username)
        .where("password", "==", password)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        currentUserDocId = doc.id;
        userData = doc.data();

        const info =
          `Name: ${userData.name}\n` +
          `Username: ${userData.username}\n` +
          `Phone: ${userData.phone || "N/A"}\n` +
          `Total Rooms: ${userData.totalRooms || "N/A"}\n` +
          `Transaction ID: ${userData.transactionId || "N/A"}\n` +
          `Plan Amount: ₹${userData.planAmount || "N/A"}\n` +
          `Plan Duration: ${userData.planDurationMonths || "N/A"} Months\n` +
          `Account Created: ${userData.accountCreated || "N/A"}\n` +
          `Plan Expires: ${userData.planExpires || "N/A"}`;

        details.textContent = info;
        details.style.display = "block";
        paymentForm.style.display = "block";
        thankYouCard.style.display = "none";
        progressSection.style.display = "none";
        qrCodeContainer.style.display = "none";
        txnError.style.display = "none";
        txnInput.value = "";
        progressInner.style.width = "0%";
      } else {
        alert("Invalid credentials");
        details.style.display = "none";
        paymentForm.style.display = "none";
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Error checking credentials.");
    } finally {
      hideLoader();
    }
  });

  // ✅ Payment form submission handler with 3s loader delay
  paymentForm.addEventListener("submit", (e) => {
    e.preventDefault();

    showLoader(); // Show loader before generating UPI

    setTimeout(() => {
      const upiURL = `upi://pay?pa=9449991672@ibl&pn=Tiny Rooms&am=${selectedAmount}&cu=INR&tn=Subscription%20Renewal`;
      upiLink.href = upiURL;

      qrCodeDiv.innerHTML = "";
      new QRCode(qrCodeDiv, {
        text: upiURL,
        width: 180,
        height: 180,
      });

      qrCodeContainer.style.display = "flex";
      progressSection.style.display = "block";
      thankYouCard.style.display = "none";
      txnInput.value = "";
      txnError.style.display = "none";

      startProgressAnimation(35000); // 35s progress bar

      hideLoader(); // Hide loader after setup
    }, 3000); // 3-second delay
  });

  // Animate progress bar
  function startProgressAnimation(duration) {
    progressInner.style.width = "0%";
    if (progressAnimationFrame) cancelAnimationFrame(progressAnimationFrame);

    let start = null;
    function animate(timestamp) {
      if (!start) start = timestamp;
      let elapsed = timestamp - start;
      let progressPercent = Math.min((elapsed / duration) * 100, 100);
      progressInner.style.width = progressPercent + "%";

      if (progressPercent < 100) {
        progressAnimationFrame = requestAnimationFrame(animate);
      }
    }
    progressAnimationFrame = requestAnimationFrame(animate);
  }

  // Transaction ID input handler
  let updateTimeout = null;
  txnInput.addEventListener("input", () => {
    txnError.style.display = "none";
    thankYouCard.style.display = "none";

    if (updateTimeout) clearTimeout(updateTimeout);

    updateTimeout = setTimeout(async () => {
      const txnId = txnInput.value.trim();
      if (txnId.length <= 10) {
        txnError.style.display = "block";
        return;
      }

      if (!currentUserDocId || typeof db === "undefined") {
        alert("Please login first.");
        return;
      }

      showLoader();
      try {
        let baseDate = new Date();
        if (userData.planExpires) {
          const oldExpiry = new Date(userData.planExpires);
          if (oldExpiry > baseDate) baseDate = oldExpiry;
        }
        baseDate.setMonth(baseDate.getMonth() + selectedMonths);
        const formattedExpiry = formatDate(baseDate);

        await db.collection("homestays").doc(currentUserDocId).update({
          transactionId: txnId,
          planAmount: selectedAmount,
          planDurationMonths: selectedMonths,
          planExpires: formattedExpiry,
          subscribed: true,
          blocked: false,
        });

        Object.assign(userData, {
          transactionId: txnId,
          planAmount: selectedAmount,
          planDurationMonths: selectedMonths,
          planExpires: formattedExpiry,
          subscribed: true,
          blocked: false,
        });

        progressSection.style.display = "none";
        qrCodeContainer.style.display = "none";
        thankYouCard.style.display = "block";

        const updatedInfo =
          `Name: ${userData.name}\n` +
          `Username: ${userData.username}\n` +
          `Phone: ${userData.phone || "N/A"}\n` +
          `Total Rooms: ${userData.totalRooms || "N/A"}\n` +
          `Transaction ID: ${userData.transactionId}\n` +
          `Plan Amount: ₹${userData.planAmount}\n` +
          `Plan Duration: ${userData.planDurationMonths} Months\n` +
          `Account Created: ${userData.accountCreated || "N/A"}\n` +
          `Plan Expires: ${userData.planExpires}`;

        details.textContent = updatedInfo;
      } catch (error) {
        console.error("Error updating Firestore:", error);
        alert("Failed to update payment info.");
      } finally {
        hideLoader();
      }
    }, 500);
  });
});
