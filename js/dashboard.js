// Make sure firebase and firestore are already loaded on the page
const homestayId = localStorage.getItem("homestayId");
const homestayNameEl = document.getElementById("homestayName");
const occupancyEl = document.getElementById("occupancy");
const guestsCardsContainer = document.getElementById("guestsCardsContainer");
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

let currentGuestId = null;
let allGuests = [];

// Redirect if not logged in
if (!homestayId) {
  alert("Not logged in. Redirecting to login page...");
  window.location.href = "index.html";
}

// Check if homestay is blocked every 10 seconds
async function checkBlockedStatus() {
  if (!homestayId) return;
  try {
    const doc = await db.collection("homestays").doc(homestayId).get();
    if (!doc.exists) {
      alert("Homestay not found. Logging out...");
      localStorage.clear();
      window.location.href = "index.html";
      return;
    }
    const data = doc.data();
    if (data.blocked) {
      alert("Your account has been blocked by admin. You will be logged out.");
      localStorage.clear();
      window.location.href = "index.html";
    }
  } catch (err) {
    console.error("Error checking block status:", err);
  }
}
// Initial check + periodic re-check
checkBlockedStatus();
setInterval(checkBlockedStatus, 10000);

// Logout button
document.getElementById("logoutBtn").onclick = () => {
  localStorage.clear();
  window.location.href = "index.html";
};

// Add guest button redirects to checkin.html
document.getElementById("addGuestBtn").onclick = () => {
  window.location.href = "checkin.html";
};

// Add order button in modal
document.getElementById("addOrderBtn").onclick = () => addOrderRow();

// Calculate bill button in modal
document.getElementById("calculateBillBtn").onclick = calculateTotalBill;

// Save guest button in modal
document.getElementById("saveGuestBtn").onclick = async () => {
  if (!currentGuestId) return;

  try {
    const updatedData = {
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
    await db.collection("guests").doc(currentGuestId).update(updatedData);
    closeModal();
  } catch (err) {
    alert("Error saving guest: " + err.message);
  }
};

// Add order row to modal orders container
function addOrderRow(order = { item: "", qty: 1, price: 0 }) {
  const row = document.createElement("div");
  row.className = "order-row";
  row.innerHTML = `
    <input type="text" class="orderItem" placeholder="Item" value="${order.item}">
    <input type="number" class="orderQty" placeholder="Qty" min="1" value="${order.qty}">
    <input type="number" class="orderPrice" placeholder="Price" min="0" step="0.01" value="${order.price}">
    <button type="button" aria-label="Remove order row">X</button>
  `;
  row.querySelector("button").onclick = () => row.remove();
  ordersContainer.appendChild(row);
}

// Calculate total bill and display
function calculateTotalBill() {
  const checkin = new Date(editCheckin.value);
  const checkout = new Date(editCheckout.value);
  if (isNaN(checkin) || isNaN(checkout) || checkout <= checkin) {
    totalBillEl.textContent = "Invalid check-in/check-out dates";
    return;
  }
  const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
  const price = parseFloat(editPricePerNight.value);
  if (isNaN(price) || price < 0) {
    totalBillEl.textContent = "Invalid price per night";
    return;
  }
  const stayCost = nights * price;

  const ordersTotal = Array.from(ordersContainer.children).reduce(
    (sum, row) => {
      const qty = parseInt(row.querySelector(".orderQty").value);
      const price = parseFloat(row.querySelector(".orderPrice").value);
      if (isNaN(qty) || isNaN(price)) return sum;
      return sum + qty * price;
    },
    0
  );

  totalBillEl.textContent = `Total Bill: ₹${(stayCost + ordersTotal).toFixed(
    2
  )}`;
}

// Open edit modal with guest data
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

// Close the edit modal
function closeModal() {
  editModal.style.display = "none";
  currentGuestId = null;
}

// Delete guest confirmation and deletion
async function deleteGuest(id) {
  if (!confirm("Delete this guest?")) return;
  try {
    await db.collection("guests").doc(id).delete();
  } catch (err) {
    alert("Error deleting guest: " + err.message);
  }
}

// Render guest cards on dashboard
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
    const guestJson = JSON.stringify(guest).replace(/"/g, "&quot;"); // For safe inline JSON
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

// Filter guests on search input
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

// Close modal if clicking outside modal content
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeModal();
});

// Load homestay name
db.collection("homestays")
  .doc(homestayId)
  .get()
  .then((doc) => {
    homestayNameEl.textContent = doc.data()?.name || "Homestay";
  })
  .catch((err) => {
    console.error("Error loading homestay name:", err);
  });

// Real-time guest list updates for this homestay
db.collection("guests")
  .where("homestayId", "==", homestayId)
  .onSnapshot((snapshot) => {
    allGuests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    occupancyEl.textContent = `Currently ${allGuests.length} guest(s) staying`;
    renderGuests(allGuests);
  });
