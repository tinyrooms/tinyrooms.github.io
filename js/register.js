document.addEventListener("DOMContentLoaded", async () => {
  // Wait for Firebase to be ready
  let db;
  try {
    db = await window.ensureFirebaseReady();
    console.log("✅ Firebase ready, initializing registration form");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
    document.getElementById("messageDiv").textContent =
      "Database connection failed. Please refresh the page.";
    document.getElementById("messageDiv").style.display = "block";
    return;
  }

  // Cache all DOM elements
  const elements = {
    form: document.getElementById("registerForm"),
    submitBtn: document.getElementById("submitBtn"),
    progressSection: document.getElementById("progressSection"),
    progressInner: document.getElementById("progressInner"),
    txnInput: document.getElementById("txnInput"),
    txnError: document.getElementById("txnError"),
    thankYouCard: document.getElementById("thankYouCard"),
    upiLink: document.getElementById("upiLink"),
    messageDiv: document.getElementById("messageDiv"),
    qrContainer: document.getElementById("qrCodeContainer"),
    qrCodeDiv: document.getElementById("qrCode"),
    loaderWrapper: document.getElementById("loaderWrapper"),
  };

  // Global state variables
  let tempDocId = null;
  let preparedUserData = null;
  let isSaving = false;
  let cleanupTimeout = null;

  // Utility functions
  const showElement = (el) => (el.style.display = "block");
  const hideElement = (el) => (el.style.display = "none");
  const showLoader = () => (elements.loaderWrapper.style.display = "flex");
  const hideLoader = () => (elements.loaderWrapper.style.display = "none");

  // Progress bar animation
  const animateProgress = (duration = 1000) => {
    return new Promise((resolve) => {
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        elements.progressInner.style.width = `${progress * 100}%`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  // Prepare user data with dates
  const prepareUserData = (formData, amount, months) => {
    const createdAt = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    return {
      ...formData,
      planAmount: amount,
      planDurationMonths: months,
      accountCreated: createdAt.toLocaleString("en-IN"),
      planExpires: expiryDate.toLocaleString("en-IN"),
      blocked: true,
    };
  };

  // Create temporary document in Firebase
  const createTempDocument = async (userData) => {
    try {
      const tempData = {
        ...userData,
        transactionId: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        tempSession: true,
      };

      const docRef = await db.collection("homestays").add(tempData);
      console.log("✅ Temporary document created:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("❌ Failed to create temp document:", error);
      throw error;
    }
  };

  // Complete the temporary document with transaction ID
  const completeTempDocument = async (docId, transactionId) => {
    try {
      await db.collection("homestays").doc(docId).update({
        transactionId: transactionId,
        status: "completed",
        completedAt: new Date().toISOString(),
        tempSession: false,
      });
      console.log("✅ Document completed with transaction:", transactionId);
      return true;
    } catch (error) {
      console.error("❌ Failed to complete document:", error);
      throw error;
    }
  };

  // Cleanup temporary document
  const cleanupTempDocument = async (docId) => {
    if (!docId) return;
    try {
      await db.collection("homestays").doc(docId).delete();
      console.log("🧹 Cleaned up temp document:", docId);
    } catch (error) {
      console.error("❌ Cleanup failed:", error);
    }
  };

  // Setup cleanup system
  const setupCleanup = (docId) => {
    if (cleanupTimeout) clearTimeout(cleanupTimeout);

    // Auto cleanup after 10 minutes
    cleanupTimeout = setTimeout(() => {
      console.log("⏰ Auto cleanup triggered");
      cleanupTempDocument(docId);
    }, 10 * 60 * 1000);

    // Cleanup on page unload
    const handleUnload = () => {
      if (!isSaving) cleanupTempDocument(docId);
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("unload", handleUnload);
  };

  // Check username availability
  const checkUsernameAvailability = async (username) => {
    try {
      const snapshot = await db
        .collection("homestays")
        .where("username", "==", username)
        .where("status", "==", "completed")
        .limit(1)
        .get();
      return snapshot.empty;
    } catch (error) {
      console.error("❌ Username check failed:", error);
      throw new Error("Failed to verify username. Please try again.");
    }
  };

  // Enhanced loader with 5-second delay
  const showEnhancedLoader = () => {
    isSaving = true;

    elements.loaderWrapper.innerHTML = `
      <div class="enhanced-loader">
        <div class="loader-spinner"></div>
        <div class="loader-content">
          <h3 class="loader-title">🔒 Saving Your Registration</h3>
          <p class="loader-message">Please do not close this tab or press the back button</p>
          <p class="loader-warning">⚠️ Your registration data is being securely saved</p>
          <div class="loader-status" id="loaderStatus">
            <span class="status-text">Saving to database...</span>
          </div>
          <div class="loader-progress">
            <div class="progress-bar" id="progressBar"></div>
          </div>
        </div>
      </div>
    `;

    showLoader();
    preventNavigation();
  };

  // Update loader after Firebase completion
  const showCompletionCountdown = () => {
    const statusElement = document.getElementById("loaderStatus");
    const progressBar = document.getElementById("progressBar");

    if (statusElement) {
      statusElement.innerHTML = `
        <span class="status-text success">✅ Registration saved successfully!</span>
        <div class="countdown-section">
          <span class="countdown-text">Redirecting in </span>
          <span class="countdown-number" id="countdownNumber">5</span>
          <span class="countdown-text"> seconds...</span>
        </div>
      `;
    }

    // Start 5-second countdown
    let timeLeft = 5;
    const countdownElement = document.getElementById("countdownNumber");

    const countdown = () => {
      if (countdownElement) {
        countdownElement.textContent = timeLeft;

        // Update progress bar
        const progress = ((5 - timeLeft) / 5) * 100;
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
          progressBar.style.background =
            "linear-gradient(90deg, #10b981, #059669)";
        }

        if (timeLeft > 0) {
          timeLeft--;
          setTimeout(countdown, 1000);
        }
      }
    };

    countdown();
  };

  // Prevent navigation during save
  const preventNavigation = () => {
    const handleBeforeUnload = (e) => {
      if (isSaving) {
        const message =
          "Your registration is being saved. Leaving now may cause data loss.";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const handlePopState = (e) => {
      if (isSaving) {
        window.history.pushState(null, null, window.location.href);
        alert("Please wait while your registration is being saved.");
      }
    };

    window.addEventListener("popstate", handlePopState);

    if (isSaving) {
      window.history.pushState(null, null, window.location.href);
    }
  };

  // Transaction validation
  let validationTimeout;
  const validateTransaction = () => {
    clearTimeout(validationTimeout);
    validationTimeout = setTimeout(() => {
      const txnId = elements.txnInput.value.trim();
      if (txnId.length >= 10) {
        hideElement(elements.txnError);
        elements.txnInput.classList.add("valid");
      } else {
        showElement(elements.txnError);
        elements.txnInput.classList.remove("valid");
      }
    }, 150);
  };

  elements.txnInput.addEventListener("input", validateTransaction);

  // Process transaction with 5-second delay
  const processTransactionWithDelay = () => {
    return new Promise((resolve, reject) => {
      const handleTransaction = async () => {
        const txnId = elements.txnInput.value.trim();
        if (txnId.length >= 10) {
          try {
            hideElement(elements.txnError);
            elements.txnInput.classList.add("processing");
            elements.txnInput.disabled = true;

            console.log("🚀 Starting transaction processing...");

            // Show enhanced loader
            showEnhancedLoader();

            // Complete Firebase operation
            await completeTempDocument(tempDocId, txnId);
            console.log("✅ Firebase operation completed!");

            // Show completion countdown
            showCompletionCountdown();

            // Wait exactly 5 seconds
            console.log("⏳ Starting 5-second delay...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            console.log("✅ 5-second delay completed!");

            // Clear cleanup timeout
            if (cleanupTimeout) clearTimeout(cleanupTimeout);

            isSaving = false;
            resolve({ txnId, docId: tempDocId });
          } catch (error) {
            elements.txnInput.disabled = false;
            elements.txnInput.classList.remove("processing");
            isSaving = false;
            hideLoader();
            reject(error);
          }
        }
      };

      // Check immediately
      handleTransaction();

      // Set up event listener for future input
      const inputHandler = () => {
        const txnId = elements.txnInput.value.trim();
        if (txnId.length >= 10) {
          elements.txnInput.removeEventListener("input", inputHandler);
          handleTransaction();
        }
      };

      elements.txnInput.addEventListener("input", inputHandler);
    });
  };

  // Error display
  const showError = (message) => {
    elements.messageDiv.textContent = message;
    showElement(elements.messageDiv);
    elements.messageDiv.classList.add("error-shake");
    setTimeout(() => elements.messageDiv.classList.remove("error-shake"), 500);
  };

  // Generate QR code
  const generateQRCode = (upiURL) => {
    try {
      elements.qrCodeDiv.innerHTML = "";
      new QRCode(elements.qrCodeDiv, {
        text: upiURL,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });
      return true;
    } catch (error) {
      console.error("❌ QR Code generation failed:", error);
      showError("Failed to generate QR code. Please try again.");
      return false;
    }
  };

  // Main form submission handler
  elements.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    elements.submitBtn.disabled = true;
    showLoader();

    try {
      console.log("🚀 Starting registration process...");

      // Extract form data
      const formData = {
        name: elements.form.name.value.trim(),
        username: elements.form.username.value.trim(),
        password: elements.form.password.value.trim(),
        totalRooms: Number(elements.form.totalRooms.value),
        phone: "+91" + elements.form.phone.value.trim(),
      };

      const [amount, months] = elements.form.plan.value.split("|").map(Number);

      // Check username availability
      const isUsernameAvailable = await checkUsernameAvailability(
        formData.username
      );
      if (!isUsernameAvailable) {
        hideLoader();
        showError("Username already exists. Choose another.");
        elements.submitBtn.disabled = false;
        return;
      }

      // Prepare and save temporary data
      preparedUserData = prepareUserData(formData, amount, months);
      tempDocId = await createTempDocument(preparedUserData);
      setupCleanup(tempDocId);

      console.log("✅ Temporary document created successfully!");

      hideElement(elements.messageDiv);

      // Generate payment interface
      const upiURL = `upi://pay?pa=9449991672@ibl&pn=Tiny Rooms&am=${amount}&cu=INR&tn=Subscription%20Payment%20for%20${months}%20Month(s)`;
      elements.upiLink.href = upiURL;

      if (!generateQRCode(upiURL)) {
        elements.submitBtn.disabled = false;
        cleanupTempDocument(tempDocId);
        return;
      }

      // Show payment interface
      hideLoader();
      hideElement(elements.form);
      showElement(elements.qrContainer);
      showElement(elements.progressSection);

      // Animate progress bar
      await animateProgress(1000);
      hideElement(elements.progressSection);

      // Wait for transaction with 5-second delay
      console.log("⏳ Waiting for transaction input...");
      const result = await processTransactionWithDelay();

      // Show success
      hideLoader();
      showElement(elements.thankYouCard);
      elements.thankYouCard.classList.add("success-animation");

      console.log("🎉 Registration completed successfully:", result);
    } catch (error) {
      console.error("❌ Registration error:", error);
      hideLoader();
      elements.txnInput.disabled = false;
      elements.txnInput.classList.remove("processing");
      isSaving = false;
      showError(error.message || "Something went wrong. Please try again.");
      elements.submitBtn.disabled = false;

      if (tempDocId) {
        cleanupTempDocument(tempDocId);
        tempDocId = null;
      }
    }
  });

  // Add enhanced CSS styles
  const style = document.createElement("style");
  style.textContent = `
    /* Error animations */
    .error-shake {
      animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    /* Input validation */
    .valid {
      border-color: #10b981 !important;
      box-shadow: 0 0 0 1px #10b981;
    }
    
    .processing {
      background-color: #f0f9ff !important;
      border-color: #3b82f6 !important;
      cursor: not-allowed;
      position: relative;
    }

    .processing::after {
      content: '';
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      border: 2px solid #3b82f6;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* Progress bar */
    #progressInner {
      transition: width 0.02s ease-out;
    }

    /* Enhanced loader */
    #loaderWrapper {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .enhanced-loader {
      text-align: center;
      color: white;
      max-width: 450px;
      padding: 40px;
    }

    .loader-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 30px;
    }

    .loader-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #3b82f6;
    }

    .loader-message {
      font-size: 18px;
      margin-bottom: 10px;
      font-weight: 500;
    }

    .loader-warning {
      font-size: 16px;
      color: #fbbf24;
      margin-bottom: 25px;
      font-weight: 500;
    }

    .loader-status {
      padding: 20px;
      background: rgba(59, 130, 246, 0.2);
      border-radius: 10px;
      border: 1px solid #3b82f6;
      margin-bottom: 20px;
    }

    .status-text {
      font-size: 18px;
      font-weight: 600;
      display: block;
      margin-bottom: 15px;
    }

    .status-text.success {
      color: #10b981;
    }

    .countdown-section {
      font-size: 16px;
    }

    .countdown-number {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
      margin: 0 5px;
    }

    .loader-progress {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      width: 0%;
      transition: width 1s ease, background 0.5s ease;
      border-radius: 4px;
    }

    /* Success animation */
    .success-animation {
      animation: successSlideIn 0.8s ease-out;
    }

    @keyframes successSlideIn {
      0% { 
        transform: scale(0.9) translateY(30px); 
        opacity: 0; 
      }
      50% { 
        transform: scale(1.05) translateY(-10px); 
        opacity: 1; 
      }
      100% { 
        transform: scale(1) translateY(0); 
        opacity: 1; 
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  console.log("✅ Registration system initialized successfully!");
});
