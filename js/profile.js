const homestayId =
  localStorage.getItem("homestayId") || sessionStorage.getItem("homestayId");
if (!homestayId) {
  alert("Not logged in. Redirecting...");
  window.location.href = "index.html";
}

const itemNameInput = document.getElementById("itemName");
const itemPriceInput = document.getElementById("itemPrice");
const itemList = document.getElementById("itemList");
const searchInput = document.getElementById("searchInput");
const addBtn = document.getElementById("addItemBtn");

const editModal = document.getElementById("editModal");
const editItemNameInput = document.getElementById("editItemName");
const editItemPriceInput = document.getElementById("editItemPrice");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let allItems = [];
let currentEditId = null;

window.dbReady
  .then(() => {
    const db = window.db;

    function addItem() {
      const name = itemNameInput.value.trim();
      const price = parseFloat(itemPriceInput.value);

      if (!name || isNaN(price) || price < 0) {
        alert("Enter valid item name and price.");
        return;
      }

      showLoader();

      db.collection("homestays")
        .doc(homestayId)
        .collection("items")
        .add({
          name,
          price,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
          itemNameInput.value = "";
          itemPriceInput.value = "";
          loadItems();
        })
        .catch((err) => {
          console.error("Error adding item:", err);
          alert("Failed to add item.");
        })
        .finally(() => {
          hideLoader();
        });
    }

    function loadItems() {
      showLoader();
      db.collection("homestays")
        .doc(homestayId)
        .collection("items")
        .orderBy("timestamp", "desc")
        .get()
        .then((snapshot) => {
          allItems = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          renderItems(allItems);
        })
        .finally(() => {
          hideLoader();
        });
    }

    function renderItems(items) {
      itemList.innerHTML = "";
      if (items.length === 0) {
        itemList.innerHTML = "<p>No items found.</p>";
        return;
      }
      items.forEach((item) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "item";
        itemDiv.innerHTML = `
        <span><strong>${item.name}</strong> — ₹${item.price}</span>
        <div class="item-actions">
          <button class="edit-btn" onclick="openEditModal('${
            item.id
          }', '${item.name.replace(/'/g, "\\'")}', ${item.price})">Edit</button>
          <button class="delete-btn" onclick="deleteItem('${
            item.id
          }')">Delete</button>
        </div>
      `;
        itemList.appendChild(itemDiv);
      });
    }

    function deleteItem(id) {
      if (!confirm("Delete this item?")) return;
      showLoader();
      db.collection("homestays")
        .doc(homestayId)
        .collection("items")
        .doc(id)
        .delete()
        .then(loadItems)
        .finally(hideLoader);
    }

    function openEditModal(id, name, price) {
      currentEditId = id;
      editItemNameInput.value = name;
      editItemPriceInput.value = price;
      editModal.style.display = "flex";
    }

    function saveEdit() {
      const updatedName = editItemNameInput.value.trim();
      const updatedPrice = parseFloat(editItemPriceInput.value);
      if (!updatedName || isNaN(updatedPrice) || updatedPrice < 0) {
        alert("Enter valid values.");
        return;
      }

      showLoader();
      db.collection("homestays")
        .doc(homestayId)
        .collection("items")
        .doc(currentEditId)
        .update({
          name: updatedName,
          price: updatedPrice,
        })
        .then(() => {
          closeModal();
          loadItems();
        })
        .finally(hideLoader);
    }

    function closeModal() {
      editModal.style.display = "none";
      currentEditId = null;
    }

    window.openEditModal = openEditModal;
    window.deleteItem = deleteItem;

    saveEditBtn.onclick = saveEdit;
    cancelEditBtn.onclick = closeModal;

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const filtered = allItems.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
      renderItems(filtered);
    });

    addBtn.onclick = addItem;
    loadItems();
  })
  .catch((err) => {
    console.error("Failed to initialize Firebase: ", err);
    alert("Could not connect to Firebase.");
  });
