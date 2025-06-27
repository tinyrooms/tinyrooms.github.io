// Optimized Dashboard - Single File - Faster Loading
// Performance-first approach with lazy loading and efficient rendering

// Critical path optimization - only essential variables at startup
const homestayId =
  localStorage.getItem("homestayId") || sessionStorage.getItem("homestayId");

// Redirect check first - fastest possible exit if not logged in
if (!homestayId) {
  alert("Not logged in. Redirecting...");
  window.location.href = "index.html";
}

// Performance monitoring
const perfStart = performance.now();
let initComplete = false;

// Optimized cache with memory management
class OptimizedCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.data = new Map();
    this.timestamps = new Map();
    this.accessCount = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    if (this.data.size >= this.maxSize) {
      this.cleanup();
    }
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
    this.accessCount.set(key, 0);
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.ttl) {
      this.delete(key);
      return null;
    }
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    return this.data.get(key);
  }

  delete(key) {
    this.data.delete(key);
    this.timestamps.delete(key);
    this.accessCount.delete(key);
  }

  cleanup() {
    const entries = Array.from(this.accessCount.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.floor(this.maxSize * 0.3));
    entries.forEach(([key]) => this.delete(key));
  }

  clear() {
    this.data.clear();
    this.timestamps.clear();
    this.accessCount.clear();
  }
}

const cache = new OptimizedCache();

// Minimal initial state
let isInitialized = false;
let useOptimizedQueries = false;
let allGuests = [];
let availableItems = [];
let currentGuestId = null;
let currentPeriod = "all";
window.allPreviousGuestsData = [];

// Critical DOM elements - cached references
const domCache = {};
function getDOMElement(id) {
  if (!domCache[id]) {
    domCache[id] = document.getElementById(id);
  }
  return domCache[id];
}

// Optimized debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Micro-task scheduler for better performance
class TaskScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  schedule(task, priority = 0) {
    this.tasks.push({ task, priority });
    this.tasks.sort((a, b) => b.priority - a.priority);
    if (!this.isRunning) {
      this.run();
    }
  }

  async run() {
    this.isRunning = true;
    while (this.tasks.length > 0) {
      const { task } = this.tasks.shift();
      try {
        await task();
      } catch (error) {
        console.error("Task failed:", error);
      }
      if (this.tasks.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    this.isRunning = false;
  }
}

const scheduler = new TaskScheduler();

// Inject critical CSS immediately
const criticalCSS = `
  .loading-state { 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    padding: 2rem; 
    color: #6b7280;
    flex-direction: column;
    gap: 1rem;
  }
  .spinner { 
    width: 32px; 
    height: 32px; 
    border: 3px solid #e5e7eb; 
    border-top: 3px solid #3b82f6; 
    border-radius: 50%; 
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .fade-in { 
    animation: fadeIn 0.3s ease-in; 
  }
  @keyframes fadeIn { 
    from { opacity: 0; transform: translateY(10px); } 
    to { opacity: 1; transform: translateY(0); } 
  }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = criticalCSS;
document.head.appendChild(styleSheet);

// Firebase readiness check - optimized
window.dbReady = new Promise((resolve, reject) => {
  if (window.firebase && window.db) {
    resolve();
    return;
  }

  const checkFirebase = () => {
    if (window.firebase && window.db) {
      resolve();
    } else {
      setTimeout(checkFirebase, 50);
    }
  };

  checkFirebase();
  setTimeout(() => reject(new Error("Firebase timeout")), 5000);
});

// Optimized index availability check
async function checkIndexAvailability() {
  const cacheKey = "index_availability";
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    useOptimizedQueries = cached;
    return cached;
  }

  try {
    await window.db
      .collection("guests")
      .where("homestayId", "==", homestayId)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    useOptimizedQueries = true;
    cache.set(cacheKey, true);
    console.log("✅ Using optimized queries");
    return true;
  } catch (error) {
    useOptimizedQueries = false;
    cache.set(cacheKey, false);
    console.log("⚠️ Using fallback queries");
    return false;
  }
}

// Show loading states
function showLoadingState(container, message = "Loading...") {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

function showSkeletonCards(container, count = 3) {
  if (!container) return;
  const skeletons = Array.from(
    { length: count },
    (_, i) => `
    <div class="skeleton-card" style="
      background: #f3f4f6;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      animation: pulse 2s infinite;
    ">
      <div style="height: 20px; background: #e5e7eb; border-radius: 4px; margin-bottom: 0.5rem;"></div>
      <div style="height: 16px; background: #e5e7eb; border-radius: 4px; margin-bottom: 0.5rem; width: 80%;"></div>
      <div style="height: 16px; background: #e5e7eb; border-radius: 4px; width: 60%;"></div>
    </div>
  `
  ).join("");

  container.innerHTML = skeletons;
}

// Optimized initialization with progressive loading
async function initializeApp() {
  if (isInitialized) return;

  console.log("🚀 Fast initialization starting...");

  try {
    // Phase 1: Critical path (blocking)
    showLoadingState(
      getDOMElement("guestsCardsContainer"),
      "Loading current guests..."
    );
    showSkeletonCards(getDOMElement("previousGuestsContainer"), 5);

    // Check Firebase and indexes in parallel
    await Promise.all([window.dbReady, checkIndexAvailability()]);

    // Phase 2: Essential data (parallel)
    const essentialTasks = [
      loadHomestayDataFast(),
      setupCriticalEventListeners(),
      checkBlockedStatusFast(),
    ];

    await Promise.all(essentialTasks);

    // Phase 3: Start real-time listeners (non-blocking)
    scheduler.schedule(() => listenToGuestsOptimized(), 10);
    scheduler.schedule(() => listenToPreviousGuestsOptimized(), 9);

    // Phase 4: Secondary features (lowest priority)
    scheduler.schedule(() => loadItemsFast(), 5);
    scheduler.schedule(() => setupSecondaryEventListeners(), 3);
    scheduler.schedule(() => startPeriodicTasks(), 1);

    isInitialized = true;
    initComplete = true;

    const initTime = performance.now() - perfStart;
    console.log(`✅ Fast init complete in ${initTime.toFixed(2)}ms`);
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    showErrorState();
  }
}

// Fast homestay data loading
async function loadHomestayDataFast() {
  const cacheKey = `homestay_${homestayId}`;
  const cached = cache.get(cacheKey);

  const homestayNameEl = getDOMElement("homestayName");
  if (!homestayNameEl) return;

  if (cached) {
    homestayNameEl.textContent = cached.name || "Homestay";
    return;
  }

  try {
    const doc = await window.db.collection("homestays").doc(homestayId).get();
    if (doc.exists) {
      const data = doc.data();
      cache.set(cacheKey, data);
      homestayNameEl.textContent = data?.name || "Homestay";
    }
  } catch (error) {
    console.error("Error loading homestay:", error);
    homestayNameEl.textContent = "Homestay";
  }
}

// Fast blocked status check
async function checkBlockedStatusFast() {
  const cacheKey = `blocked_${homestayId}`;
  const cached = cache.get(cacheKey);

  if (cached !== null) {
    if (cached.blocked) {
      logout();
    }
    return;
  }

  try {
    const doc = await window.db.collection("homestays").doc(homestayId).get();
    const data = doc.exists ? doc.data() : { blocked: true };
    cache.set(cacheKey, data);

    if (!doc.exists || data.blocked) {
      logout();
    }
  } catch (err) {
    console.error("Blocked status check failed:", err);
  }
}

// Fast items loading (lazy)
async function loadItemsFast() {
  const cacheKey = `items_${homestayId}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    availableItems = cached;
    return;
  }

  try {
    const snapshot = await window.db
      .collection("homestays")
      .doc(homestayId)
      .collection("items")
      .limit(50)
      .get();

    availableItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    cache.set(cacheKey, availableItems);
  } catch (err) {
    console.error("Items loading failed:", err);
    availableItems = [];
  }
}

// Critical event listeners only
function setupCriticalEventListeners() {
  const addGuestBtn = getDOMElement("addGuestBtn");
  const logoutBtn = getDOMElement("logoutBtn");

  if (addGuestBtn) {
    addGuestBtn.onclick = () => (window.location.href = "checkin.html");
  }

  if (logoutBtn) {
    logoutBtn.onclick = logout;
  }
}

// Secondary event listeners (lazy loaded)
function setupSecondaryEventListeners() {
  const profileBtn = getDOMElement("profileBtn");
  const searchInput = getDOMElement("searchInput");
  const editModal = getDOMElement("editModal");
  const addOrderBtn = getDOMElement("addOrderBtn");
  const calculateBillBtn = getDOMElement("calculateBillBtn");
  const saveGuestBtn = getDOMElement("saveGuestBtn");
  const checkoutBtn = getDOMElement("checkoutBtn");

  if (profileBtn) {
    profileBtn.onclick = () => (window.location.href = "profile.html");
  }

  if (searchInput) {
    const debouncedSearch = debounce((term) => {
      const filtered = allGuests.filter(
        (g) =>
          (g.name && g.name.toLowerCase().includes(term)) ||
          (g.phone && g.phone.toLowerCase().includes(term)) ||
          (g.room && g.room.toLowerCase().includes(term))
      );
      renderGuestsOptimized(filtered);
    }, 200);

    searchInput.addEventListener("input", (e) => {
      debouncedSearch(e.target.value.toLowerCase());
    });
  }

  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeModal();
    });
  }

  if (addOrderBtn) addOrderBtn.onclick = () => addOrderRow();
  if (calculateBillBtn) calculateBillBtn.onclick = calculateTotalBill;
  if (saveGuestBtn) saveGuestBtn.onclick = saveGuestData;
  if (checkoutBtn) checkoutBtn.onclick = checkOutGuest;

  // Period selector functionality
  const periodButtons = document.querySelectorAll(".period-btn");
  if (periodButtons.length > 0) {
    periodButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        periodButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentPeriod = btn.dataset.period;
        debouncedCalculateStatistics();
      });
    });
  }

  const tabStatistics = getDOMElement("tabStatistics");
  if (tabStatistics) {
    tabStatistics.addEventListener("click", () => {
      setTimeout(() => debouncedCalculateStatistics(), 100);
    });
  }
}

// Optimized query creation
function createOptimizedGuestsQuery() {
  const baseQuery = window.db
    .collection("guests")
    .where("homestayId", "==", homestayId)
    .limit(30);

  return useOptimizedQueries
    ? baseQuery.orderBy("timestamp", "desc")
    : baseQuery;
}

function createOptimizedPreviousGuestsQuery() {
  const baseQuery = window.db
    .collection("previousCustomers")
    .where("homestayId", "==", homestayId)
    .limit(50);

  return useOptimizedQueries
    ? baseQuery.orderBy("timestamp", "desc")
    : baseQuery;
}

// Fast real-time listeners with error recovery
function listenToGuestsOptimized() {
  if (!window.db) return;

  const query = createOptimizedGuestsQuery();

  const unsubscribe = query.onSnapshot(
    (snapshot) => {
      const guestData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (!useOptimizedQueries) {
        guestData.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });
      }

      allGuests = guestData;

      const occupancyEl = getDOMElement("occupancy");
      if (occupancyEl) {
        occupancyEl.textContent = `Currently ${allGuests.length} guest(s) staying`;
      }

      scheduler.schedule(() => renderGuestsOptimized(allGuests), 8);
    },
    (error) => {
      console.error("Guests listener error:", error);
      setTimeout(() => listenToGuestsOptimized(), 3000);
    }
  );

  window.guestsUnsubscribe = unsubscribe;
}

function listenToPreviousGuestsOptimized() {
  if (!window.db) return;

  const query = createOptimizedPreviousGuestsQuery();

  const unsubscribe = query.onSnapshot(
    (snapshot) => {
      const previousGuests = snapshot.docs.map((doc) => doc.data());

      if (!useOptimizedQueries) {
        previousGuests.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });
      }

      window.allPreviousGuestsData = previousGuests;
      scheduler.schedule(
        () => renderPreviousGuestsOptimized(previousGuests),
        7
      );
      scheduler.schedule(() => debouncedCalculateStatistics(), 5);
    },
    (error) => {
      console.error("Previous guests listener error:", error);
      setTimeout(() => listenToPreviousGuestsOptimized(), 3000);
    }
  );

  window.previousGuestsUnsubscribe = unsubscribe;
}

// Ultra-fast rendering with minimal DOM operations
function renderGuestsOptimized(guests) {
  const container = getDOMElement("guestsCardsContainer");
  if (!container) return;

  if (guests.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #6b7280;">
        <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p>No guests found.</p>
      </div>
    `;
    return;
  }

  const html = guests
    .map((guest) => {
      const checkinDate = guest.checkin
        ? new Date(guest.checkin).toLocaleString()
        : "N/A";

      return `
      <div class="guest-card fade-in">
        <h3>${guest.name || "Unnamed"}</h3>
        <p><i class="fas fa-phone"></i> ${guest.phone || "N/A"}</p>
        <p><i class="fas fa-door-open"></i> ${guest.room || "N/A"}</p>
        <p><i class="fas fa-user"></i> Age: ${guest.age || "N/A"}</p>
        <p><i class="fas fa-calendar-check"></i> ${checkinDate}</p>
        <p><i class="fas fa-shopping-cart"></i> Orders: ${
          guest.orders ? guest.orders.length : 0
        }</p>
        <div class="actions">
          <button type="button" onclick="openEditModal('${guest.id}')">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button type="button" onclick="deleteGuest('${
            guest.id
          }')" class="delete">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;
}

function renderPreviousGuestsOptimized(previousGuests) {
  const container = getDOMElement("previousGuestsContainer");
  if (!container) return;

  if (previousGuests.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #6b7280;">
        <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p>No previous guests found.</p>
      </div>
    `;
    return;
  }

  const visibleGuests = previousGuests.slice(0, 20);

  const html = visibleGuests
    .map((guest) => {
      let checkoutDate = "N/A";
      if (guest.checkout instanceof Object && guest.checkout.seconds) {
        checkoutDate = new Date(
          guest.checkout.seconds * 1000
        ).toLocaleDateString();
      } else if (typeof guest.checkout === "string") {
        checkoutDate = new Date(guest.checkout).toLocaleDateString();
      }

      let displayBill = "N/A";
      if (guest.totalBill && typeof guest.totalBill === "number") {
        displayBill = `₹${guest.totalBill.toFixed(2)}`;
      } else if (
        guest.stayCost !== undefined &&
        guest.ordersTotal !== undefined
      ) {
        displayBill = `₹${(guest.stayCost + guest.ordersTotal).toFixed(2)}`;
      } else {
        const revenue = calculateGuestRevenue(guest);
        if (revenue.total > 0) {
          displayBill = `₹${revenue.total.toFixed(2)}`;
        }
      }

      return `
      <div class="guest-card previous-guest-card fade-in">
        <h3>${guest.name || "Unnamed"}</h3>
        <p><i class="fas fa-phone"></i> ${guest.phone || "N/A"}</p>
        <p><i class="fas fa-calendar-times"></i> ${checkoutDate}</p>
        <p><i class="fas fa-moon"></i> Nights: ${guest.nights || "N/A"}</p>
        <p><i class="fas fa-bed"></i> Room Cost: ₹${
          guest.stayCost ? guest.stayCost.toFixed(2) : "N/A"
        }</p>
        <p><i class="fas fa-shopping-cart"></i> Orders Cost: ₹${
          guest.ordersTotal ? guest.ordersTotal.toFixed(2) : "N/A"
        }</p>
        <p style="font-weight: bold; color: #059669;"><i class="fas fa-money-bill-wave"></i> Total Bill: ${displayBill}</p>
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;

  if (previousGuests.length > 20) {
    scheduler.schedule(() => {
      const remaining = previousGuests.slice(20);
      const remainingHtml = remaining
        .map((guest) => {
          let checkoutDate = "N/A";
          if (guest.checkout instanceof Object && guest.checkout.seconds) {
            checkoutDate = new Date(
              guest.checkout.seconds * 1000
            ).toLocaleDateString();
          }

          let displayBill = "N/A";
          if (guest.totalBill && typeof guest.totalBill === "number") {
            displayBill = `₹${guest.totalBill.toFixed(2)}`;
          } else if (
            guest.stayCost !== undefined &&
            guest.ordersTotal !== undefined
          ) {
            displayBill = `₹${(guest.stayCost + guest.ordersTotal).toFixed(2)}`;
          }

          return `
          <div class="guest-card previous-guest-card fade-in">
            <h3>${guest.name || "Unnamed"}</h3>
            <p><i class="fas fa-phone"></i> ${guest.phone || "N/A"}</p>
            <p><i class="fas fa-calendar-times"></i> ${checkoutDate}</p>
            <p style="font-weight: bold; color: #059669;"><i class="fas fa-money-bill-wave"></i> Total Bill: ${displayBill}</p>
          </div>
        `;
        })
        .join("");

      container.innerHTML += remainingHtml;
    }, 2);
  }
}

// Modal functions
function openEditModal(guestId) {
  const guest = allGuests.find((g) => g.id === guestId);
  if (!guest) return;

  const editModal = getDOMElement("editModal");
  if (!editModal) return;

  currentGuestId = guest.id;

  const fields = {
    editName: guest.name || "",
    editPhone: guest.phone || "",
    editAge: guest.age || "",
    editRoom: guest.room || "",
    editCheckin: guest.checkin || "",
    editCheckout: guest.checkout || "",
    editPricePerNight: guest.pricePerNight || 0,
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = getDOMElement(id);
    if (element) element.value = value;
  });

  const ordersContainer = getDOMElement("ordersContainer");
  if (ordersContainer) {
    ordersContainer.innerHTML = "";
    (guest.orders || []).forEach((order) => addOrderRow(order));
  }

  const totalBillEl = getDOMElement("totalBill");
  if (totalBillEl) totalBillEl.textContent = "";

  editModal.style.display = "flex";
}

function closeModal() {
  const editModal = getDOMElement("editModal");
  if (editModal) {
    editModal.style.display = "none";
  }
  currentGuestId = null;
}

function addOrderRow(order = { item: "", qty: 1, price: 0 }) {
  const ordersContainer = getDOMElement("ordersContainer");
  if (!ordersContainer) return;

  const row = document.createElement("div");
  row.className = "order-row";

  const itemSelect = document.createElement("select");
  itemSelect.className = "orderItem";
  itemSelect.innerHTML = `<option value="">Select Item</option>`;

  availableItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = `${item.name} (₹${item.price})`;
    if (order.item === item.name) option.selected = true;
    itemSelect.appendChild(option);
  });

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.className = "orderQty";
  qtyInput.value = order.qty || 1;
  qtyInput.min = "1";
  qtyInput.placeholder = "Qty";

  const priceInput = document.createElement("input");
  priceInput.type = "number";
  priceInput.className = "orderPrice";
  priceInput.value = order.price || 0;
  priceInput.min = "0";
  priceInput.step = "0.01";
  priceInput.placeholder = "Price";
  priceInput.readOnly = true;
  priceInput.style.backgroundColor = "#f5f5f5";
  priceInput.style.cursor = "not-allowed";

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "X";
  removeBtn.type = "button";
  removeBtn.onclick = () => row.remove();

  itemSelect.addEventListener("change", () => {
    const selectedItem = availableItems.find(
      (i) => i.name === itemSelect.value
    );
    if (selectedItem) priceInput.value = selectedItem.price;
  });

  row.appendChild(itemSelect);
  row.appendChild(qtyInput);
  row.appendChild(priceInput);
  row.appendChild(removeBtn);

  ordersContainer.appendChild(row);
}

async function saveGuestData() {
  if (!currentGuestId || !window.db) return;

  try {
    const data = {
      name: getDOMElement("editName")?.value?.trim() || "",
      phone: getDOMElement("editPhone")?.value?.trim() || "",
      age: Number.parseInt(getDOMElement("editAge")?.value) || 0,
      room: getDOMElement("editRoom")?.value?.trim() || "",
      checkin: getDOMElement("editCheckin")?.value || "",
      checkout: getDOMElement("editCheckout")?.value || "",
      pricePerNight:
        Number.parseFloat(getDOMElement("editPricePerNight")?.value) || 0,
      orders: getDOMElement("ordersContainer")
        ? Array.from(getDOMElement("ordersContainer").children).map((row) => ({
            item: row.querySelector(".orderItem")?.value?.trim() || "",
            qty: Number.parseInt(row.querySelector(".orderQty")?.value) || 0,
            price:
              Number.parseFloat(row.querySelector(".orderPrice")?.value) || 0,
          }))
        : [],
    };

    await window.db.collection("guests").doc(currentGuestId).update(data);
    closeModal();
  } catch (error) {
    console.error("Error saving guest data:", error);
    alert("Error saving guest data. Please try again.");
  }
}

function calculateTotalBill() {
  const editCheckin = getDOMElement("editCheckin");
  const editCheckout = getDOMElement("editCheckout");
  const editPricePerNight = getDOMElement("editPricePerNight");
  const totalBillEl = getDOMElement("totalBill");
  const ordersContainer = getDOMElement("ordersContainer");

  if (!editCheckin || !editCheckout || !editPricePerNight || !totalBillEl)
    return;

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

  const orders = ordersContainer
    ? Array.from(ordersContainer.children)
        .map((row) => ({
          item: row.querySelector(".orderItem")?.value?.trim() || "",
          qty: Number.parseInt(row.querySelector(".orderQty")?.value) || 0,
          price:
            Number.parseFloat(row.querySelector(".orderPrice")?.value) || 0,
        }))
        .filter((order) => order.item && order.qty > 0)
    : [];

  const stayCost = nights * price;
  const ordersTotal = orders.reduce((sum, o) => sum + o.qty * o.price, 0);
  const total = stayCost + ordersTotal;

  totalBillEl.innerHTML = `
    <strong>Bill Breakdown:</strong><br>
    Nights: ${nights}<br>
    Room Cost: ₹${stayCost.toFixed(2)}<br>
    Orders Cost: ₹${ordersTotal.toFixed(2)}<br>
    <strong>Total Bill: ₹${total.toFixed(2)}</strong>
  `;

  // PDF generation if jsPDF is available
  if (window.jspdf) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Guest Bill", 90, 10);
    doc.setFontSize(12);
    doc.text(`Name: ${getDOMElement("editName")?.value || ""}`, 10, 20);
    doc.text(`Phone: ${getDOMElement("editPhone")?.value || ""}`, 10, 30);
    doc.text(`Room: ${getDOMElement("editRoom")?.value || ""}`, 10, 40);
    doc.text(`Check-in: ${checkin}`, 10, 50);
    doc.text(`Check-out: ${checkout}`, 10, 60);
    doc.text(`Nights: ${nights}`, 10, 70);
    doc.text(`Price/Night: ₹${price}`, 10, 80);
    doc.text(`Stay Total: ₹${stayCost.toFixed(2)}`, 10, 90);
    doc.text("Orders:", 10, 100);
    let y = 110;
    orders.forEach((o) => {
      doc.text(
        `• ${o.item} x${o.qty} @ ₹${o.price} = ₹${(o.qty * o.price).toFixed(
          2
        )}`,
        15,
        y
      );
      y += 10;
    });
    doc.text(`Orders Total: ₹${ordersTotal.toFixed(2)}`, 10, y + 10);
    doc.text(`Total Bill: ₹${total.toFixed(2)}`, 10, y + 20);
    doc.save(`${getDOMElement("editName")?.value || "Guest"}_Bill.pdf`);
  }
}

async function checkOutGuest() {
  if (!currentGuestId || !window.db) {
    alert("No guest selected.");
    return;
  }

  const name = getDOMElement("editName")?.value?.trim() || "";
  const phone = getDOMElement("editPhone")?.value?.trim() || "";
  const checkout = getDOMElement("editCheckout")?.value || "";
  const checkin = getDOMElement("editCheckin")?.value || "";
  const pricePerNight = getDOMElement("editPricePerNight")?.value || "";

  if (
    !name ||
    !phone ||
    !checkout ||
    !checkin ||
    !pricePerNight ||
    pricePerNight <= 0
  ) {
    alert("All fields are required and price must be greater than 0.");
    return;
  }

  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);

  if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
    alert("Invalid check-in or check-out date.");
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
  const stayCost = nights * price;

  const orderRows = getDOMElement("ordersContainer")
    ? Array.from(getDOMElement("ordersContainer").children)
    : [];
  const orders = orderRows
    .map((row) => ({
      item: row.querySelector(".orderItem")?.value?.trim() || "",
      qty: Number.parseInt(row.querySelector(".orderQty")?.value) || 0,
      price: Number.parseFloat(row.querySelector(".orderPrice")?.value) || 0,
    }))
    .filter((order) => order.item && order.qty > 0 && order.price >= 0);

  const ordersTotal = orders.reduce(
    (sum, order) => sum + order.qty * order.price,
    0
  );
  const totalBill = stayCost + ordersTotal;

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

    await window.db.collection("previousCustomers").add(previousCustomerData);
    await window.db.collection("guests").doc(currentGuestId).delete();

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

async function deleteGuest(id) {
  if (!confirm("Delete this guest?")) return;

  try {
    await window.db.collection("guests").doc(id).delete();
  } catch (error) {
    console.error("Error deleting guest:", error);
    alert("Error deleting guest. Please try again.");
  }
}

// Statistics Functions (optimized)
function isInPeriod(date, period) {
  const now = new Date();
  const checkDate = new Date(date);

  if (isNaN(checkDate.getTime())) {
    return false;
  }

  switch (period) {
    case "today":
      return checkDate.toDateString() === now.toDateString();
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return checkDate >= weekAgo && checkDate <= now;
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

  if (guest.stayCost !== undefined) {
    roomRevenue = guest.stayCost;
  } else if (guest.checkin && guest.checkout && guest.pricePerNight) {
    const checkin = new Date(guest.checkin);
    const checkout = new Date(guest.checkout);
    if (!isNaN(checkin.getTime()) && !isNaN(checkout.getTime())) {
      const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
      roomRevenue = nights * guest.pricePerNight;
    }
  }

  if (guest.ordersTotal !== undefined) {
    ordersRevenue = guest.ordersTotal;
  } else if (guest.orders && Array.isArray(guest.orders)) {
    ordersRevenue = guest.orders.reduce((sum, order) => {
      return sum + (order.qty || 0) * (order.price || 0);
    }, 0);
  }

  return {
    roomRevenue: roomRevenue || 0,
    ordersRevenue: ordersRevenue || 0,
    total: (roomRevenue || 0) + (ordersRevenue || 0),
  };
}

function getFilteredGuestsByPeriod(guests, period) {
  return guests.filter((guest) => {
    let checkoutDate;
    if (guest.checkout instanceof Object && guest.checkout.seconds) {
      checkoutDate = new Date(guest.checkout.seconds * 1000);
    } else if (typeof guest.checkout === "string") {
      checkoutDate = new Date(guest.checkout);
    } else if (guest.timestamp instanceof Object && guest.timestamp.seconds) {
      checkoutDate = new Date(guest.timestamp.seconds * 1000);
    } else {
      return false;
    }

    return isInPeriod(checkoutDate, period);
  });
}

function calculateStatistics() {
  if (!getDOMElement("totalRevenue") || !window.allPreviousGuestsData) {
    return;
  }

  if (!Array.isArray(window.allPreviousGuestsData)) {
    window.allPreviousGuestsData = [];
  }

  const filteredPreviousGuests = getFilteredGuestsByPeriod(
    window.allPreviousGuestsData,
    currentPeriod
  );

  let totalRevenue = 0;
  let totalRoomRevenue = 0;
  let totalOrdersRevenue = 0;
  let totalNights = 0;

  filteredPreviousGuests.forEach((guest) => {
    const revenue = calculateGuestRevenue(guest);
    totalRevenue += revenue.total;
    totalRoomRevenue += revenue.roomRevenue;
    totalOrdersRevenue += revenue.ordersRevenue;

    if (guest.nights) {
      totalNights += guest.nights;
    } else if (guest.checkin && guest.checkout) {
      let checkin, checkout;
      if (typeof guest.checkin === "string") checkin = new Date(guest.checkin);
      if (guest.checkout instanceof Object && guest.checkout.seconds) {
        checkout = new Date(guest.checkout.seconds * 1000);
      } else if (typeof guest.checkout === "string") {
        checkout = new Date(guest.checkout);
      }

      if (
        checkin &&
        checkout &&
        !isNaN(checkin.getTime()) &&
        !isNaN(checkout.getTime())
      ) {
        const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
        totalNights += nights;
      }
    }
  });

  const totalGuests = filteredPreviousGuests.length;
  const averageStay =
    totalGuests > 0 ? (totalNights / totalGuests).toFixed(1) : 0;
  const avgRevenuePerGuest =
    totalGuests > 0 ? (totalRevenue / totalGuests).toFixed(2) : 0;

  const totalRooms = 10;
  const currentOccupancy = allGuests.length;
  const occupancyRate = ((currentOccupancy / totalRooms) * 100).toFixed(1);

  const updates = [
    { id: "totalRevenue", value: `₹${totalRevenue.toFixed(2)}` },
    { id: "totalGuests", value: totalGuests },
    { id: "averageStay", value: averageStay },
    { id: "occupancyRate", value: `${occupancyRate}%` },
    { id: "roomRevenue", value: `₹${totalRoomRevenue.toFixed(2)}` },
    { id: "ordersRevenue", value: `₹${totalOrdersRevenue.toFixed(2)}` },
    { id: "avgRevenuePerGuest", value: `₹${avgRevenuePerGuest}` },
    { id: "totalRevenueBreakdown", value: `₹${totalRevenue.toFixed(2)}` },
  ];

  updates.forEach((update) => {
    const element = getDOMElement(update.id);
    if (element) element.textContent = update.value;
  });

  calculatePeriodRevenues();
}

function calculatePeriodRevenues() {
  const periods = ["month", "week", "today"];
  const revenues = {};

  if (
    !window.allPreviousGuestsData ||
    !Array.isArray(window.allPreviousGuestsData)
  ) {
    window.allPreviousGuestsData = [];
  }

  periods.forEach((period) => {
    const filteredGuests = getFilteredGuestsByPeriod(
      window.allPreviousGuestsData,
      period
    );
    revenues[period] = filteredGuests.reduce((sum, guest) => {
      const revenue = calculateGuestRevenue(guest);
      return sum + revenue.total;
    }, 0);
  });

  const updates = [
    { id: "monthlyRevenue", value: `₹${revenues.month.toFixed(2)}` },
    { id: "weeklyRevenue", value: `₹${revenues.week.toFixed(2)}` },
    { id: "dailyRevenue", value: `₹${revenues.today.toFixed(2)}` },
  ];

  updates.forEach((update) => {
    const element = getDOMElement(update.id);
    if (element) element.textContent = update.value;
  });

  calculatePeakMonth();
}

function calculatePeakMonth() {
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

    if (isNaN(checkoutDate.getTime())) {
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

    const revenue = calculateGuestRevenue(guest);
    monthlyData[monthKey].revenue += revenue.total;
  });

  let peakMonth = null;
  let peakRevenue = 0;

  Object.values(monthlyData).forEach((data) => {
    if (data.revenue > peakRevenue) {
      peakRevenue = data.revenue;
      peakMonth = data;
    }
  });

  const peakMonthRevenueEl = getDOMElement("peakMonthRevenue");
  const peakMonthNameEl = getDOMElement("peakMonthName");

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

const debouncedCalculateStatistics = debounce(calculateStatistics, 500);

// Periodic tasks (low priority)
function startPeriodicTasks() {
  setInterval(() => {
    cache.cleanup();
    scheduler.schedule(() => checkBlockedStatusFast(), 1);
  }, 60000);
}

// Error state
function showErrorState() {
  const containers = ["guestsCardsContainer", "previousGuestsContainer"];
  containers.forEach((id) => {
    const container = getDOMElement(id);
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>Failed to load data. Please refresh the page.</p>
          <button onclick="location.reload()" style="
            margin-top: 1rem; 
            padding: 0.5rem 1rem; 
            background: #3b82f6; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
          ">Refresh</button>
        </div>
      `;
    }
  });
}

// Optimized logout
function logout() {
  cache.clear();
  localStorage.removeItem("homestayId");
  localStorage.removeItem("homestayName");
  sessionStorage.removeItem("homestayId");
  sessionStorage.removeItem("homestayName");
  window.location.href = "index.html";
}

// Make functions globally available
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.deleteGuest = deleteGuest;

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (window.guestsUnsubscribe) window.guestsUnsubscribe();
  if (window.previousGuestsUnsubscribe) window.previousGuestsUnsubscribe();
  cache.clear();
});

// Initialize immediately when Firebase is ready
window.dbReady.then(initializeApp).catch((error) => {
  console.error("Firebase failed:", error);
  showErrorState();
});

// Performance monitoring
window.addEventListener("load", () => {
  const loadTime = performance.now() - perfStart;
  console.log(`📊 Total load time: ${loadTime.toFixed(2)}ms`);

  if (initComplete) {
    console.log("🚀 Dashboard ready for interaction");
  }
});

// Initialize when DOM is loaded (fallback)
document.addEventListener("DOMContentLoaded", () => {
  if (window.firebase && window.db) {
    initializeApp();
  }
});
