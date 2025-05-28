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

// Statistics variables - Initialize properly
let currentPeriod = "all";
// Initialize as empty array to prevent undefined errors
window.allPreviousGuestsData = [];

// Redirect if not logged in
if (!homestayId) {
  alert("Not logged in. Redirecting...");
  window.location.href = "index.html";
}

const firebase = window.firebase; // Declare firebase variable

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
};
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
    age: Number.parseInt(editAge.value),
    room: editRoom.value.trim(),
    checkin: editCheckin.value,
    checkout: editCheckout.value,
    pricePerNight: Number.parseFloat(editPricePerNight.value),
    orders: Array.from(ordersContainer.children).map((row) => ({
      item: row.querySelector(".orderItem").value.trim(),
      qty: Number.parseInt(row.querySelector(".orderQty").value),
      price: Number.parseFloat(row.querySelector(".orderPrice").value),
    })),
  };
  await window.db.collection("guests").doc(currentGuestId).update(data);
  closeModal();
}

// Calculate bill + PDF - Enhanced with better validation
function calculateTotalBill() {
  const checkin = editCheckin.value;
  const checkout = editCheckout.value;
  const pricePerNight = editPricePerNight.value;

  if (!checkin || !checkout) {
    alert("Please enter both check-in and check-out dates.");
    return;
  }

  if (!pricePerNight || pricePerNight <= 0) {
    alert("Please enter a valid price per night.");
    return;
  }

  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);

  if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
    alert("Invalid date format.");
    return;
  }

  if (checkoutDate <= checkinDate) {
    alert("Check-out date must be after check-in date.");
    return;
  }

  const nights = Math.ceil(
    (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)
  );
  const price = Number.parseFloat(pricePerNight);

  const orders = Array.from(ordersContainer.children)
    .map((row) => ({
      item: row.querySelector(".orderItem").value.trim(),
      qty: Number.parseInt(row.querySelector(".orderQty").value) || 0,
      price: Number.parseFloat(row.querySelector(".orderPrice").value) || 0,
    }))
    .filter((order) => order.item && order.qty > 0);

  const stayCost = nights * price;
  const ordersTotal = orders.reduce((sum, o) => sum + o.qty * o.price, 0);
  const total = stayCost + ordersTotal;

  // Update the display with breakdown
  totalBillEl.innerHTML = `
    <strong>Bill Breakdown:</strong><br>
    Nights: ${nights}<br>
    Room Cost: ₹${stayCost.toFixed(2)}<br>
    Orders Cost: ₹${ordersTotal.toFixed(2)}<br>
    <strong>Total Bill: ₹${total.toFixed(2)}</strong>
  `;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Guest Bill", 90, 10);
  doc.setFontSize(12);
  doc.text(`Name: ${editName.value}`, 10, 20);
  doc.text(`Phone: ${editPhone.value}`, 10, 30);
  doc.text(`Room: ${editRoom.value}`, 10, 40);
  doc.text(`Check-in: ${checkin}`, 10, 50);
  doc.text(`Check-out: ${checkout}`, 10, 60);
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

// Check out guest - Enhanced with better validation and calculation
async function checkOutGuest() {
  if (!currentGuestId) {
    alert("No guest selected.");
    return;
  }

  const name = editName.value.trim();
  const phone = editPhone.value.trim();
  const checkout = editCheckout.value;
  const checkin = editCheckin.value;
  const pricePerNight = editPricePerNight.value;

  // Validate required fields
  if (!name || !phone || !checkout) {
    alert("Name, phone, and checkout date are required.");
    return;
  }

  if (!checkin) {
    alert("Check-in date is required.");
    return;
  }

  if (!pricePerNight || pricePerNight <= 0) {
    alert("Price per night must be greater than 0.");
    return;
  }

  console.log("=== CHECKOUT CALCULATION ===");
  console.log("Guest Name:", name);
  console.log("Check-in:", checkin);
  console.log("Check-out:", checkout);
  console.log("Price per night:", pricePerNight);

  // Calculate total bill for statistics
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);

  // Validate dates
  if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
    alert("Invalid check-in or check-out date.");
    return;
  }

  if (checkoutDate <= checkinDate) {
    alert("Check-out date must be after check-in date.");
    return;
  }

  // Calculate nights stayed
  const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
  const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  console.log("Nights stayed:", nights);

  // Parse price per night
  const price = Number.parseFloat(pricePerNight) || 0;
  console.log("Parsed price per night:", price);

  // Calculate room cost
  const stayCost = nights * price;
  console.log("Stay cost:", stayCost);

  // Get orders from the form
  const orderRows = Array.from(ordersContainer.children);
  const orders = orderRows
    .map((row) => {
      const item = row.querySelector(".orderItem").value.trim();
      const qty = Number.parseInt(row.querySelector(".orderQty").value) || 0;
      const orderPrice =
        Number.parseFloat(row.querySelector(".orderPrice").value) || 0;

      console.log(`Order: ${item} x${qty} @ ₹${orderPrice}`);

      return {
        item,
        qty,
        price: orderPrice,
      };
    })
    .filter((order) => order.item && order.qty > 0 && order.price >= 0); // Filter out invalid orders

  console.log("Valid orders:", orders);

  // Calculate orders total
  const ordersTotal = orders.reduce((sum, order) => {
    const orderTotal = order.qty * order.price;
    console.log(`Order total for ${order.item}: ₹${orderTotal}`);
    return sum + orderTotal;
  }, 0);

  console.log("Orders total:", ordersTotal);

  // Calculate final total bill
  const totalBill = stayCost + ordersTotal;
  console.log("TOTAL BILL:", totalBill);

  // Confirm with user
  const confirmMessage = `
Checkout Summary:
Guest: ${name}
Nights: ${nights}
Room Cost: ₹${stayCost.toFixed(2)}
Orders Cost: ₹${ordersTotal.toFixed(2)}
Total Bill: ₹${totalBill.toFixed(2)}

Proceed with checkout?`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    // Save to previousCustomers collection
    const previousCustomerData = {
      name,
      phone,
      checkin,
      checkout,
      pricePerNight: price,
      nights,
      stayCost,
      orders,
      ordersTotal,
      totalBill,
      homestayId,
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
    };

    console.log("Saving previous customer data:", previousCustomerData);

    await window.db.collection("previousCustomers").add(previousCustomerData);

    console.log("Successfully saved to previousCustomers");

    // Delete from current guests
    await window.db.collection("guests").doc(currentGuestId).delete();

    console.log("Successfully deleted from current guests");

    alert(
      `Guest ${name} checked out successfully!\nTotal Bill: ₹${totalBill.toFixed(
        2
      )}`
    );

    closeModal();
  } catch (error) {
    console.error("Error during checkout:", error);
    alert("Error during checkout. Please try again.");
  }
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
  await window.db.collection("guests").doc(id).delete();
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

// Render previous customers - Enhanced to show detailed breakdown
function renderPreviousGuests(previousGuests) {
  previousGuestsContainer.innerHTML = "";
  if (previousGuests.length === 0) {
    previousGuestsContainer.textContent = "No previous guests found.";
    return;
  }

  console.log("Rendering previous guests:", previousGuests);

  previousGuests.forEach((guest) => {
    let checkoutDate = "N/A";
    if (guest.checkout instanceof Object && guest.checkout.seconds) {
      checkoutDate = new Date(
        guest.checkout.seconds * 1000
      ).toLocaleDateString();
    } else if (typeof guest.checkout === "string") {
      checkoutDate = new Date(guest.checkout).toLocaleDateString();
    }

    // Display total bill with fallback calculation
    let displayBill = "N/A";
    if (guest.totalBill && typeof guest.totalBill === "number") {
      displayBill = `₹${guest.totalBill.toFixed(2)}`;
    } else if (guest.stayCost && guest.ordersTotal) {
      displayBill = `₹${(guest.stayCost + guest.ordersTotal).toFixed(2)}`;
    } else {
      // Fallback calculation
      const revenue = calculateGuestRevenue(guest);
      if (revenue.total > 0) {
        displayBill = `₹${revenue.total.toFixed(2)}`;
      }
    }

    const card = document.createElement("div");
    card.className = "guest-card previous-guest-card";
    card.innerHTML = `
      <h3>${guest.name || "Unnamed"}</h3>
      <p>Phone: ${guest.phone || "N/A"}</p>
      <p>Checkout: ${checkoutDate}</p>
      <p>Nights: ${guest.nights || "N/A"}</p>
      <p>Room Cost: ₹${guest.stayCost ? guest.stayCost.toFixed(2) : "N/A"}</p>
      <p>Orders Cost: ₹${
        guest.ordersTotal ? guest.ordersTotal.toFixed(2) : "N/A"
      }</p>
      <p><strong>Total Bill: ${displayBill}</strong></p>
    `;
    previousGuestsContainer.appendChild(card);
  });
}

// Statistics Functions
function isInPeriod(date, period) {
  const now = new Date();
  const checkDate = new Date(date);

  switch (period) {
    case "today":
      return checkDate.toDateString() === now.toDateString();
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return checkDate >= weekAgo;
    case "month":
      return (
        checkDate.getMonth() === now.getMonth() &&
        checkDate.getFullYear() === now.getFullYear()
      );
    case "all":
    default:
      return true;
  }
}

function calculateGuestRevenue(guest) {
  let roomRevenue = 0;
  let ordersRevenue = 0;

  if (guest.checkin && guest.checkout && guest.pricePerNight) {
    const checkin = new Date(guest.checkin);
    const checkout = new Date(guest.checkout);
    const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
    roomRevenue = nights * guest.pricePerNight;
  }

  if (guest.orders) {
    ordersRevenue = guest.orders.reduce((sum, order) => {
      return sum + order.qty * order.price;
    }, 0);
  }

  return { roomRevenue, ordersRevenue, total: roomRevenue + ordersRevenue };
}

function calculateStatistics() {
  // Check if statistics elements exist and data is available
  if (
    !document.getElementById("totalRevenue") ||
    !window.allPreviousGuestsData
  ) {
    return;
  }

  // Ensure allPreviousGuestsData is an array
  if (!Array.isArray(window.allPreviousGuestsData)) {
    window.allPreviousGuestsData = [];
  }

  // Filter data based on current period
  const filteredPreviousGuests = window.allPreviousGuestsData.filter(
    (guest) => {
      let checkoutDate;
      if (guest.checkout instanceof Object && guest.checkout.seconds) {
        checkoutDate = new Date(guest.checkout.seconds * 1000);
      } else if (typeof guest.checkout === "string") {
        checkoutDate = new Date(guest.checkout);
      } else {
        return false;
      }
      return isInPeriod(checkoutDate, currentPeriod);
    }
  );

  const filteredCurrentGuests =
    currentPeriod === "all"
      ? allGuests
      : allGuests.filter((guest) => {
          if (!guest.checkin) return false;
          return isInPeriod(guest.checkin, currentPeriod);
        });

  // Calculate totals
  let totalRevenue = 0;
  let totalRoomRevenue = 0;
  let totalOrdersRevenue = 0;
  const totalGuests = filteredPreviousGuests.length;
  let totalNights = 0;

  // Calculate from previous guests (completed stays)
  window.allPreviousGuestsData.forEach((guest) => {
    if (guest.totalBill) {
      totalRevenue += guest.totalBill;
    } else {
      const revenue = calculateGuestRevenue(guest);
      totalRevenue += revenue.total;
      totalRoomRevenue += revenue.roomRevenue;
      totalOrdersRevenue += revenue.ordersRevenue;
    }

    if (guest.checkin && guest.checkout) {
      let checkin, checkout;
      if (typeof guest.checkin === "string") checkin = new Date(guest.checkin);
      if (guest.checkout instanceof Object && guest.checkout.seconds) {
        checkout = new Date(guest.checkout.seconds * 1000);
      } else if (typeof guest.checkout === "string") {
        checkout = new Date(guest.checkout);
      }

      if (checkin && checkout) {
        const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
        totalNights += nights;
      }
    }
  });

  // For current period 'all', include current guests in some calculations
  if (currentPeriod === "all") {
    filteredCurrentGuests.forEach((guest) => {
      const revenue = calculateGuestRevenue(guest);
      totalRoomRevenue += revenue.roomRevenue;
      totalOrdersRevenue += revenue.ordersRevenue;
    });
  }

  // Calculate averages
  const averageStay =
    totalGuests > 0 ? (totalNights / totalGuests).toFixed(1) : 0;
  const avgRevenuePerGuest =
    totalGuests > 0 ? (totalRevenue / totalGuests).toFixed(2) : 0;

  // Calculate occupancy rate (current guests / total rooms)
  const totalRooms = 10; // Adjust this based on your actual room count
  const currentOccupancy = allGuests.length;
  const occupancyRate = ((currentOccupancy / totalRooms) * 100).toFixed(1);

  // Update UI
  const totalRevenueEl = document.getElementById("totalRevenue");
  const totalGuestsEl = document.getElementById("totalGuests");
  const averageStayEl = document.getElementById("averageStay");
  const occupancyRateEl = document.getElementById("occupancyRate");
  const roomRevenueEl = document.getElementById("roomRevenue");
  const ordersRevenueEl = document.getElementById("ordersRevenue");
  const avgRevenuePerGuestEl = document.getElementById("avgRevenuePerGuest");
  const totalRevenueBreakdownEl = document.getElementById(
    "totalRevenueBreakdown"
  );

  if (totalRevenueEl)
    totalRevenueEl.textContent = `₹${totalRevenue.toFixed(2)}`;
  if (totalGuestsEl) totalGuestsEl.textContent = totalGuests;
  if (averageStayEl) averageStayEl.textContent = averageStay;
  if (occupancyRateEl) occupancyRateEl.textContent = `${occupancyRate}%`;
  if (roomRevenueEl)
    roomRevenueEl.textContent = `₹${totalRoomRevenue.toFixed(2)}`;
  if (ordersRevenueEl)
    ordersRevenueEl.textContent = `₹${totalOrdersRevenue.toFixed(2)}`;
  if (avgRevenuePerGuestEl)
    avgRevenuePerGuestEl.textContent = `₹${avgRevenuePerGuest}`;
  if (totalRevenueBreakdownEl)
    totalRevenueBreakdownEl.textContent = `₹${totalRevenue.toFixed(2)}`;

  // Calculate period-specific revenues
  calculatePeriodRevenues();
}

function calculatePeriodRevenues() {
  const periods = ["month", "week", "today"];
  const revenues = {};

  // Ensure allPreviousGuestsData exists and is an array
  if (
    !window.allPreviousGuestsData ||
    !Array.isArray(window.allPreviousGuestsData)
  ) {
    window.allPreviousGuestsData = [];
  }

  periods.forEach((period) => {
    const filteredGuests = window.allPreviousGuestsData.filter((guest) => {
      let checkoutDate;
      if (guest.checkout instanceof Object && guest.checkout.seconds) {
        checkoutDate = new Date(guest.checkout.seconds * 1000);
      } else if (typeof guest.checkout === "string") {
        checkoutDate = new Date(guest.checkout);
      } else {
        return false;
      }
      return isInPeriod(checkoutDate, period);
    });

    revenues[period] = filteredGuests.reduce((sum, guest) => {
      if (guest.totalBill) {
        return sum + guest.totalBill;
      } else {
        const revenue = calculateGuestRevenue(guest);
        return sum + revenue.total;
      }
    }, 0);
  });

  const monthlyRevenueEl = document.getElementById("monthlyRevenue");
  const weeklyRevenueEl = document.getElementById("weeklyRevenue");
  const dailyRevenueEl = document.getElementById("dailyRevenue");

  if (monthlyRevenueEl)
    monthlyRevenueEl.textContent = `₹${revenues.month.toFixed(2)}`;
  if (weeklyRevenueEl)
    weeklyRevenueEl.textContent = `₹${revenues.week.toFixed(2)}`;
  if (dailyRevenueEl)
    dailyRevenueEl.textContent = `₹${revenues.today.toFixed(2)}`;

  // Calculate peak month
  calculatePeakMonth();
}

function calculatePeakMonth() {
  // Ensure allPreviousGuestsData exists and is an array
  if (
    !window.allPreviousGuestsData ||
    !Array.isArray(window.allPreviousGuestsData)
  ) {
    window.allPreviousGuestsData = [];
  }

  const monthlyData = {};

  window.allPreviousGuestsData.forEach((guest) => {
    let checkoutDate;
    if (guest.checkout instanceof Object && guest.checkout.seconds) {
      checkoutDate = new Date(guest.checkout.seconds * 1000);
    } else if (typeof guest.checkout === "string") {
      checkoutDate = new Date(guest.checkout);
    } else {
      return;
    }

    const monthKey = `${checkoutDate.getFullYear()}-${checkoutDate.getMonth()}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        revenue: 0,
        month: checkoutDate.getMonth(),
        year: checkoutDate.getFullYear(),
      };
    }

    if (guest.totalBill) {
      monthlyData[monthKey].revenue += guest.totalBill;
    } else {
      const revenue = calculateGuestRevenue(guest);
      monthlyData[monthKey].revenue += revenue.total;
    }
  });

  let peakMonth = null;
  let peakRevenue = 0;

  Object.values(monthlyData).forEach((data) => {
    if (data.revenue > peakRevenue) {
      peakRevenue = data.revenue;
      peakMonth = data;
    }
  });

  const peakMonthRevenueEl = document.getElementById("peakMonthRevenue");
  const peakMonthNameEl = document.getElementById("peakMonthName");

  if (peakMonth) {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    if (peakMonthRevenueEl)
      peakMonthRevenueEl.textContent = `₹${peakRevenue.toFixed(2)}`;
    if (peakMonthNameEl)
      peakMonthNameEl.textContent = `${monthNames[peakMonth.month]} ${
        peakMonth.year
      }`;
  } else {
    if (peakMonthRevenueEl) peakMonthRevenueEl.textContent = "₹0";
    if (peakMonthNameEl) peakMonthNameEl.textContent = "No data available";
  }
}

// Initialize statistics when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Period selector functionality
  const periodButtons = document.querySelectorAll(".period-btn");
  if (periodButtons.length > 0) {
    periodButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        periodButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentPeriod = btn.dataset.period;
        calculateStatistics();
      });
    });
  }

  // Tab functionality for statistics
  const tabStatistics = document.getElementById("tabStatistics");
  if (tabStatistics) {
    tabStatistics.addEventListener("click", () => {
      setTimeout(() => calculateStatistics(), 100); // Small delay to ensure DOM is updated
    });
  }
});

// Real-time listener for previous guests (no index required)
window.dbReady.then(() => {
  function listenToPreviousGuests() {
    window.db
      .collection("previousCustomers")
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

          // Update statistics data
          window.allPreviousGuestsData = previousGuests;
          calculateStatistics(); // Recalculate statistics when data changes
        },
        (err) => {
          console.error("Failed to load previous guests", err);
          previousGuestsContainer.textContent =
            "Failed to load previous guests.";
        }
      );
  }

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
  window.db
    .collection("homestays")
    .doc(homestayId)
    .get()
    .then((doc) => {
      homestayNameEl.textContent = doc.data()?.name || "Homestay";
    })
    .catch(console.error);

  window.db
    .collection("guests")
    .where("homestayId", "==", homestayId)
    .onSnapshot((snapshot) => {
      allGuests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      occupancyEl.textContent = `Currently ${allGuests.length} guest(s) staying`;
      renderGuests(allGuests);

      // Update statistics when current guests change
      calculateStatistics();
    });

  // Start previous guests listener
  listenToPreviousGuests();
});
