/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Build a reusable description popup once */
const descriptionModal = document.createElement("div");
descriptionModal.className = "description-modal";
descriptionModal.innerHTML = `
  <div class="description-modal-content">
    <button class="close-modal-btn" type="button">Close</button>
    <h3 id="descriptionModalTitle"></h3>
    <p id="descriptionModalText"></p>
  </div>
`;
document.body.appendChild(descriptionModal);

const descriptionModalTitle = document.getElementById("descriptionModalTitle");
const descriptionModalText = document.getElementById("descriptionModalText");

/* Save selected category + products in localStorage */
const PREFERENCES_KEY = "routineBuilderPreferences";

/* Keep product data and selected products in memory while app is open */
let allProducts = [];
let selectedProductIds = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

selectedProductsList.innerHTML = `
  <div class="placeholder-message">No products selected yet</div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Read saved preferences if they exist */
function getSavedPreferences() {
  const saved = localStorage.getItem(PREFERENCES_KEY);

  if (!saved) {
    return {
      selectedCategory: "",
      selectedProductIds: [],
    };
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      selectedCategory: parsed.selectedCategory || "",
      selectedProductIds: Array.isArray(parsed.selectedProductIds)
        ? parsed.selectedProductIds
        : [],
    };
  } catch (error) {
    return {
      selectedCategory: "",
      selectedProductIds: [],
    };
  }
}

/* Save current choices so they persist after refresh/revisit */
function savePreferences() {
  const preferences = {
    selectedCategory: categoryFilter.value || "",
    selectedProductIds,
  };

  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

/* Escape text before inserting into HTML attributes like title */
function escapeAttributeText(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">No products found in this category</div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${
      selectedProductIds.includes(product.id) ? "selected-card" : ""
    }" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="description-btn" type="button">Description</button>
      </div>
    </div>
  `,
    )
    .join("");
}

/* Show selected products as removable tags */
function renderSelectedProducts() {
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <div class="placeholder-message">No products selected yet</div>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-tag">${product.name}</div>
    `,
    )
    .join("");
}

/* Filter products based on selected category */
function renderFilteredProducts() {
  const selectedCategory = categoryFilter.value;

  if (!selectedCategory) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
    return;
  }

  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
}

/* Load products and restore saved category + selected products */
async function initializeApp() {
  allProducts = await loadProducts();

  const savedPreferences = getSavedPreferences();

  categoryFilter.value = savedPreferences.selectedCategory;

  selectedProductIds = savedPreferences.selectedProductIds.filter((savedId) =>
    allProducts.some((product) => product.id === savedId),
  );

  renderFilteredProducts();
  renderSelectedProducts();
  savePreferences();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", () => {
  renderFilteredProducts();
  savePreferences();
});

/* Add/remove products when the user clicks a product card */
productsContainer.addEventListener("click", (e) => {
  const clickedCard = e.target.closest(".product-card");

  if (!clickedCard) {
    return;
  }

  const descriptionButton = e.target.closest(".description-btn");

  if (descriptionButton) {
    const productId = Number(clickedCard.dataset.id);
    const clickedProduct = allProducts.find(
      (product) => product.id === productId,
    );

    if (!clickedProduct) {
      return;
    }

    descriptionModalTitle.textContent = `${clickedProduct.brand} - ${clickedProduct.name}`;
    descriptionModalText.textContent = clickedProduct.description;
    descriptionModal.classList.add("show-modal");
    return;
  }

  const productId = Number(clickedCard.dataset.id);

  if (!productId) {
    return;
  }

  if (selectedProductIds.includes(productId)) {
    selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  } else {
    selectedProductIds.push(productId);
  }

  renderFilteredProducts();
  renderSelectedProducts();
  savePreferences();
});

/* Close description popup */
descriptionModal.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("description-modal") ||
    e.target.classList.contains("close-modal-btn")
  ) {
    descriptionModal.classList.remove("show-modal");
  }
});

/* Show a simple routine in the chat area when user clicks Generate Routine */
generateRoutineButton.addEventListener("click", () => {
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );

  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "Select at least one product first, then click Generate Routine.";
    return;
  }

  const routineSteps = selectedProducts
    .map(
      (product, index) =>
        `<li><strong>Step ${index + 1}:</strong> ${product.brand} - ${product.name}</li>`,
    )
    .join("");

  chatWindow.innerHTML = `
    <p><strong>Your Routine:</strong></p>
    <ol>${routineSteps}</ol>
    <p>Tip: Use products in the order shown, from lightest to richest texture.</p>
  `;
});

initializeApp();

/* Ask OpenAI for a routine or product advice */
async function getOpenAIResponse(userMessage) {
  const selectedProducts = allProducts
    .filter((product) => selectedProductIds.includes(product.id))
    .map((product) => `${product.brand} - ${product.name}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a beginner-friendly beauty routine assistant. Keep answers short, practical, and clear.",
        },
        {
          role: "user",
          content: `User message: ${userMessage}\n\nSelected products:\n${selectedProducts || "None selected yet."}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  const data = await response.json();

  return data.choices[0].message.content;
}

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  if (typeof OPENAI_API_KEY === "undefined" || !OPENAI_API_KEY) {
    chatWindow.innerHTML = "Add your OpenAI key in secrets.js first.";
    return;
  }

  chatWindow.innerHTML = "Thinking...";

  try {
    const aiReply = await getOpenAIResponse(message);
    chatWindow.innerHTML = aiReply;
  } catch (error) {
    chatWindow.innerHTML = "Something went wrong while calling OpenAI.";
  }

  userInput.value = "";
});
