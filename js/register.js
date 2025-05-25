document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const submitBtn = document.getElementById("submitBtn");
  const progressSection = document.getElementById("progressSection");
  const progressInner = document.getElementById("progressInner");
  const txnInput = document.getElementById("txnInput");
  const txnError = document.getElementById("txnError");
  const thankYouCard = document.getElementById("thankYouCard");
  const upiLink = document.getElementById("upiLink");
  const messageDiv = document.getElementById("messageDiv");
  const qrContainer = document.getElementById("qrCodeContainer");
  const qrCodeDiv = document.getElementById("qrCode");
  const loaderWrapper = document.getElementById("loaderWrapper");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    loaderWrapper.style.display = "flex";

    setTimeout(async () => {
      loaderWrapper.style.display = "none";

      const name = form.name.value.trim();
      const username = form.username.value.trim();
      const password = form.password.value.trim();
      const totalRooms = Number(form.totalRooms.value);
      const phone = "+91" + form.phone.value.trim();
      const [amount, months] = form.plan.value.split("|").map(Number);
      const createdAt = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + months);

      try {
        const snapshot = await db
          .collection("homestays")
          .where("username", "==", username)
          .get();

        if (!snapshot.empty) {
          messageDiv.textContent = "Username already exists. Choose another.";
          messageDiv.style.display = "block";
          submitBtn.disabled = false;
          return;
        }

        messageDiv.style.display = "none";

        const upiURL = `upi://pay?pa=9449991672@ibl&pn=Tiny Rooms&am=${amount}&cu=INR&tn=Subscription%20Payment%20for%20${months}%20Month(s)`;
        upiLink.href = upiURL;

        qrCodeDiv.innerHTML = "";
        new QRCode(qrCodeDiv, {
          text: upiURL,
          width: 200,
          height: 200,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });

        qrContainer.style.display = "block";
        form.style.display = "none";
        progressSection.style.display = "block";

        for (let i = 0; i <= 100; i++) {
          await new Promise((r) => setTimeout(r, 300));
          progressInner.style.width = i + "%";
        }

        const waitForTxn = () =>
          new Promise((resolve) => {
            const checkTxn = () => {
              const txnId = txnInput.value.trim();
              if (txnId.length >= 10) {
                txnError.style.display = "none";
                resolve(txnId);
              } else {
                txnError.style.display = "block";
                setTimeout(checkTxn, 1000);
              }
            };
            checkTxn();
          });

        const txnId = await waitForTxn();

        loaderWrapper.style.display = "flex";
        setTimeout(async () => {
          loaderWrapper.style.display = "none";
          progressSection.style.display = "none";
          thankYouCard.style.display = "block";

          await db.collection("homestays").add({
            name,
            username,
            password,
            phone,
            totalRooms,
            transactionId: txnId,
            planAmount: amount,
            planDurationMonths: months,
            accountCreated: createdAt.toLocaleString("en-IN"),
            planExpires: expiryDate.toLocaleString("en-IN"),
            blocked: true,
          });
        }, 2000);
      } catch (err) {
        console.error(err);
        messageDiv.textContent = "Something went wrong. Try again.";
        messageDiv.style.display = "block";
        submitBtn.disabled = false;
      }
    }, 3000);
  });
});
