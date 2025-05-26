// Firebase setup assumed
const homestayId =
  localStorage.getItem("homestayId") || sessionStorage.getItem("homestayId");

const homestayNameEl = document.getElementById("homestayName");
const occupancyEl = document.getElementById("occupancy");
const guestsCardsContainer = document.getElementById("guestsCardsContainer");
const previousGuestsContainer = document.getElementById(
  "previousGuestsContainer"
);
const searchInput = document.getElementById("searchInput");
const editModal = document.getElementById("editModal");
const editName = document.getElementById("editName");
const editPhone = document.getElementById("editPhone");
const editAge = document.getElementById("editAge");
const editRoom = document.getElementById("editRoom");
const editCheckin = document.getElementById("editCheckin");
const editCheckout = document.getElementById("editCheckout");
const editPricePerNight = document.getElementById("editPricePerNight");
const ordersContainer = document.getElementById("ordersContainer");
const totalBillEl = document.getElementById("totalBill");
const checkoutBtn = document.getElementById("checkoutBtn");

let currentGuestId = null;
let allGuests = [];

// Redirect if not logged in
if (!homestayId) {
  alert("Not logged in. Redirecting...");
  window.location.href = "index.html";
}

document.addEventListener("firebaseReady", () => {
  // Now db is ready, you can safely use it

  async function checkBlockedStatus() {
    try {
      const doc = await window.db.collection("homestays").doc(homestayId).get();
      if (!doc.exists || doc.data().blocked) {
        alert("You are blocked. Logging out...");
        localStorage.removeItem("homestayId");
        localStorage.removeItem("homestayName");
        sessionStorage.removeItem("homestayId");
        sessionStorage.removeItem("homestayName");
        window.location.href = "index.html";
      }
    } catch (err) {
      console.error("Error checking blocked status:", err);
    }
  }

  checkBlockedStatus();
  setInterval(checkBlockedStatus, 10000);
});

// Button events
function logout() {
  localStorage.removeItem("homestayId");
  localStorage.removeItem("homestayName");
  sessionStorage.removeItem("homestayId");
  sessionStorage.removeItem("homestayName");
  window.location.href = "/index.html"; // or wherever your login page is
}
document.getElementById("logoutBtn").onclick = () => {
  logout();
}
document.getElementById("addGuestBtn").onclick = () => {
  window.location.href = "checkin.html";
};
document.getElementById("addOrderBtn").onclick = () => addOrderRow();
document.getElementById("calculateBillBtn").onclick = calculateTotalBill;
document.getElementById("saveGuestBtn").onclick = saveGuestData;
checkoutBtn.onclick = checkOutGuest;

// Add order row
function addOrderRow(order = { item: "", qty: 1, price: 0 }) {
  const row = document.createElement("div");
  row.className = "order-row";
  row.innerHTML = `
    <input type="text" class="orderItem" placeholder="Item" value="${order.item}">
    <input type="number" class="orderQty" placeholder="Qty" min="1" value="${order.qty}">
    <input type="number" class="orderPrice" placeholder="Price" min="0" step="0.01" value="${order.price}">
    <button type="button">X</button>
  `;
  row.querySelector("button").onclick = () => row.remove();
  ordersContainer.appendChild(row);
}

// Save guest edits
async function saveGuestData() {
  if (!currentGuestId) return;
  const data = {
    name: editName.value.trim(),
    phone: editPhone.value.trim(),
    age: parseInt(editAge.value),
    room: editRoom.value.trim(),
    checkin: editCheckin.value,
    checkout: editCheckout.value,
    pricePerNight: parseFloat(editPricePerNight.value),
    orders: Array.from(ordersContainer.children).map((row) => ({
      item: row.querySelector(".orderItem").value.trim(),
      qty: parseInt(row.querySelector(".orderQty").value),
      price: parseFloat(row.querySelector(".orderPrice").value),
    })),
  };
  await db.collection("guests").doc(currentGuestId).update(data);
  closeModal();
}

// Calculate bill + PDF
function calculateTotalBill() {
  const checkin = new Date(editCheckin.value);
  const checkout = new Date(editCheckout.value);
  const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
  const price = parseFloat(editPricePerNight.value);
  const orders = Array.from(ordersContainer.children).map((row) => ({
    item: row.querySelector(".orderItem").value.trim(),
    qty: parseInt(row.querySelector(".orderQty").value),
    price: parseFloat(row.querySelector(".orderPrice").value),
  }));
  const stayCost = nights * price;
  const ordersTotal = orders.reduce((sum, o) => sum + o.qty * o.price, 0);
  const total = stayCost + ordersTotal;

  totalBillEl.textContent = `Total Bill: ₹${total.toFixed(2)}`;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Guest Bill", 90, 10);
  doc.setFontSize(12);
  doc.text(`Name: ${editName.value}`, 10, 20);
  doc.text(`Phone: ${editPhone.value}`, 10, 30);
  doc.text(`Room: ${editRoom.value}`, 10, 40);
  doc.text(`Check-in: ${editCheckin.value}`, 10, 50);
  doc.text(`Check-out: ${editCheckout.value}`, 10, 60);
  doc.text(`Nights: ${nights}`, 10, 70);
  doc.text(`Price/Night: ₹${price}`, 10, 80);
  doc.text(`Stay Total: ₹${stayCost.toFixed(2)}`, 10, 90);
  doc.text("Orders:", 10, 100);

  let y = 110;
  orders.forEach((o) => {
    doc.text(
      `• ${o.item} x${o.qty} @ ₹${o.price} = ₹${(o.qty * o.price).toFixed(2)}`,
      15,
      y
    );
    y += 10;
  });
  doc.text(`Orders Total: ₹${ordersTotal.toFixed(2)}`, 10, y + 10);
  doc.text(`Total Bill: ₹${total.toFixed(2)}`, 10, y + 20);
  doc.save(`${editName.value}_Bill.pdf`);
}

// Check out guest
async function checkOutGuest() {
  if (!currentGuestId) return;
  const name = editName.value.trim();
  const phone = editPhone.value.trim();
  const checkout = editCheckout.value;
  if (!name || !phone || !checkout) {
    alert("Name, phone, and checkout date required.");
    return;
  }
  await db.collection("previousCustomers").add({
    name,
    phone,
    checkout,
    homestayId,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection("guests").doc(currentGuestId).delete();
  closeModal();
}

// Modal handling
function openEditModal(guest) {
  currentGuestId = guest.id;
  editName.value = guest.name || "";
  editPhone.value = guest.phone || "";
  editAge.value = guest.age || "";
  editRoom.value = guest.room || "";
  editCheckin.value = guest.checkin || "";
  editCheckout.value = guest.checkout || "";
  editPricePerNight.value = guest.pricePerNight || 0;
  ordersContainer.innerHTML = "";
  (guest.orders || []).forEach(addOrderRow);
  totalBillEl.textContent = "";
  editModal.style.display = "flex";
}
function closeModal() {
  editModal.style.display = "none";
  currentGuestId = null;
}

// Guest deletion
async function deleteGuest(id) {
  if (!confirm("Delete this guest?")) return;
  await db.collection("guests").doc(id).delete();
}

// Render guest cards
function renderGuests(guests) {
  guestsCardsContainer.innerHTML = "";
  if (guests.length === 0) {
    guestsCardsContainer.textContent = "No guests found.";
    return;
  }
  guests.forEach((guest) => {
    const checkinDate = guest.checkin
      ? new Date(guest.checkin).toLocaleString()
      : "N/A";
    const card = document.createElement("div");
    card.className = "guest-card";
    card.innerHTML = `
      <h3>${guest.name || "Unnamed"}</h3>
      <p>Phone: ${guest.phone || "N/A"}</p>
      <p>Room: ${guest.room || "N/A"}</p>
      <p>Age: ${guest.age || "N/A"}</p>
      <p>Check-in: ${checkinDate}</p>
      <p>Orders: ${guest.orders ? guest.orders.length : 0}</p>
      <div class="actions">
        <button type="button" class="editBtn">Edit</button>
        <button type="button" class="delete deleteBtn">Delete</button>
      </div>
    `;
    card.querySelector(".editBtn").onclick = () => openEditModal(guest);
    card.querySelector(".deleteBtn").onclick = () => deleteGuest(guest.id);
    guestsCardsContainer.appendChild(card);
  });
}

// Render previous customers
function renderPreviousGuests(previousGuests) {
  previousGuestsContainer.innerHTML = "";
  if (previousGuests.length === 0) {
    previousGuestsContainer.textContent = "No previous guests found.";
    return;
  }
  previousGuests.forEach((guest) => {
    let checkoutDate = "N/A";
    if (guest.checkout instanceof Object && guest.checkout.seconds) {
      checkoutDate = new Date(
        guest.checkout.seconds * 1000
      ).toLocaleDateString();
    } else if (typeof guest.checkout === "string") {
      checkoutDate = new Date(guest.checkout).toLocaleDateString();
    }
    const card = document.createElement("div");
    card.className = "guest-card previous-guest-card";
    card.innerHTML = `
      <h3>${guest.name || "Unnamed"}</h3>
      <p>Phone: ${guest.phone || "N/A"}</p>
      <p>Checkout: ${checkoutDate}</p>
    `;
    previousGuestsContainer.appendChild(card);
  });
}

// Real-time listener for previous guests (no index required)
window.dbReady.then(() => {
  function listenToPreviousGuests() {
    db.collection("previousCustomers")
      .where("homestayId", "==", homestayId)
      .onSnapshot(
        (snapshot) => {
          const previousGuests = snapshot.docs
            .map((doc) => doc.data())
            .sort((a, b) => {
              const timeA = a.timestamp?.seconds || 0;
              const timeB = b.timestamp?.seconds || 0;
              return timeB - timeA;
            });
          renderPreviousGuests(previousGuests);
        },
        (err) => {
          console.error("Failed to load previous guests", err);
          previousGuestsContainer.textContent =
            "Failed to load previous guests.";
        }
      );
  };


// Filter by search
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  const filtered = allGuests.filter(
    (g) =>
      (g.name && g.name.toLowerCase().includes(term)) ||
      (g.phone && g.phone.toLowerCase().includes(term)) ||
      (g.room && g.room.toLowerCase().includes(term))
  );
  renderGuests(filtered);
});

// Close modal on outside click
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeModal();
});

// Load homestay name
window.dbReady.then(() => {
  db.collection("homestays")
    .doc(homestayId)
    .get()
    .then((doc) => {
      homestayNameEl.textContent = doc.data()?.name || "Homestay";
    })
    .catch(console.error);

  db.collection("guests")
    .where("homestayId", "==", homestayId)
    .onSnapshot((snapshot) => {
      allGuests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      occupancyEl.textContent = `Currently ${allGuests.length} guest(s) staying`;
      renderGuests(allGuests);
    });
});


// Start previous guests listener
listenToPreviousGuests();
});
