/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

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
const CHAT_HISTORY_KEY = "routineBuilderChatHistory";

/* Keep chat history so the assistant can refer to past messages */
const SYSTEM_PROMPT =
  "You are a beginner-friendly beauty routine assistant. Keep answers short, practical, and clear.";
const DEFAULT_ASSISTANT_GREETING =
  "Hi! Ask me about your products or routine.";
const chatHistory = getSavedChatHistory();

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

/* Read chat history from localStorage */
function getSavedChatHistory() {
  const defaultHistory = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "assistant",
      content: DEFAULT_ASSISTANT_GREETING,
    },
  ];

  const saved = localStorage.getItem(CHAT_HISTORY_KEY);

  if (!saved) {
    return defaultHistory;
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return defaultHistory;
    }

    const validMessages = parsed.filter(
      (message) =>
        message &&
        typeof message.role === "string" &&
        typeof message.content === "string" &&
        ["system", "user", "assistant"].includes(message.role),
    );

    const hasSystemPromptAtTop =
      validMessages[0] && validMessages[0].role === "system";

    const historyWithSystem = hasSystemPromptAtTop
      ? validMessages
      : [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...validMessages,
        ];

    if (historyWithSystem.length === 1) {
      historyWithSystem.push({
        role: "assistant",
        content: DEFAULT_ASSISTANT_GREETING,
      });
    }

    return historyWithSystem;
  } catch (error) {
    return defaultHistory;
  }
}

/* Save chat history so it can be restored after refresh */
function saveChatHistory() {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
}

/* Escape text before inserting into HTML attributes like title */
function escapeAttributeText(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* Escape text before rendering inside chat */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* Append one message to the chat window */
function appendChatLine(role, message) {
  const className = role === "user" ? "user-line" : "assistant-line";
  const messageHtml = `
    <div class="chat-line ${className}">${escapeHtml(message).replaceAll(
      "\n",
      "<br>",
    )}</div>
  `;

  chatWindow.innerHTML += messageHtml;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Rebuild visible chat from saved history */
function renderChatFromHistory() {
  const visibleMessages = chatHistory.filter((message) => message.role !== "system");

  chatWindow.innerHTML = visibleMessages
    .map((message) => {
      const className = message.role === "user" ? "user-line" : "assistant-line";
      return `<div class="chat-line ${className}">${escapeHtml(message.content).replaceAll("\n", "<br>")}</div>`;
    })
    .join("");

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Keep history small and focused */
function trimChatHistory() {
  const nonSystemMessages = chatHistory.slice(1);

  if (nonSystemMessages.length > 12) {
    chatHistory.splice(1, nonSystemMessages.length - 12);
  }
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
    chatHistory.push({
      role: "assistant",
      content: "Select at least one product first, then click Generate Routine.",
    });
    trimChatHistory();
    saveChatHistory();
    appendChatLine(
      "assistant",
      "Select at least one product first, then click Generate Routine.",
    );
    return;
  }

  const routineSteps = selectedProducts
    .map(
      (product, index) =>
        `<li><strong>Step ${index + 1}:</strong> ${product.brand} - ${product.name}</li>`,
    )
    .join("");

  const routineMessage = `Your Routine:\n${selectedProducts
    .map(
      (product, index) =>
        `Step ${index + 1}: ${product.brand} - ${product.name}`,
    )
    .join(
      "\n",
    )}\n\nTip: Use products in the order shown, from lightest to richest texture.`;

  appendChatLine("assistant", routineMessage);
  chatHistory.push({ role: "assistant", content: routineMessage });
  trimChatHistory();
  saveChatHistory();
});

initializeApp();
renderChatFromHistory();

/* Ask OpenAI for a routine or product advice */
async function getOpenAIResponse(userMessage) {
  const selectedProductsContext = allProducts
    .filter((product) => selectedProductIds.includes(product.id))
    .map((product) => `${product.brand} - ${product.name}`)
    .join("\n");

  const contextualUserMessage = `${userMessage}\n\nSelected products:\n${selectedProductsContext || "None selected yet."}`;

  const messagesForApi = [
    ...chatHistory,
    {
      role: "user",
      content: contextualUserMessage,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: messagesForApi,
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
  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  chatHistory.push({ role: "user", content: message });
  trimChatHistory();
  saveChatHistory();

  if (typeof OPENAI_API_KEY === "undefined" || !OPENAI_API_KEY) {
    chatHistory.push({
      role: "assistant",
      content: "Add your OpenAI key in secrets.js first.",
    });
    trimChatHistory();
    saveChatHistory();
    appendChatLine("assistant", "Add your OpenAI key in secrets.js first.");
    return;
  }

  appendChatLine("user", message);
  userInput.value = "";

  try {
    const aiReply = await getOpenAIResponse(message);
    appendChatLine("assistant", aiReply);

    chatHistory.push({ role: "assistant", content: aiReply });
    trimChatHistory();
    saveChatHistory();
  } catch (error) {
    chatHistory.push({
      role: "assistant",
      content: "Something went wrong while calling OpenAI.",
    });
    trimChatHistory();
    saveChatHistory();
    appendChatLine("assistant", "Something went wrong while calling OpenAI.");
  }
});
