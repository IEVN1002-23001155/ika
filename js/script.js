
/* ==========================================
   IKA JAPANESE BISTRO
   MENÚ DIGITAL INTERACTIVO
   SCRIPT PRINCIPAL
========================================== */

"use strict";

/* ==========================================
   01. VARIABLES PRINCIPALES
========================================== */

let categories = [];
let dishes = [];

let activeCategory = "all";
let searchText = "";
let favoritesOnly = false;

let favorites = new Set();
let selection = {};

let toastTimer = null;
let previousFocus = null;

const FAV_KEY = "ika_favorites_v2";
const SELECTION_KEY = "ika_selection_v2";

/* ==========================================
   02. ELEMENTOS HTML
========================================== */

const $ = (id) => document.getElementById(id);

const elements = {
  filters: $("filters"),
  results: $("menuResults"),
  search: $("search"),
  empty: $("empty"),
  resultCount: $("resultCount"),
  stateLine: $("stateLine"),

  favoritesToggle: $("favoritesToggle"),
  savedTop: $("savedTop"),
  savedCount: $("savedCount"),

  selectedTop: $("selectedTop"),
  topCount: $("topCount"),
  floating: $("floating"),
  floatCount: $("floatCount"),
  floatText: $("floatText"),

  overlay: $("overlay"),
  drawerInner: $("drawerInner"),
  closeModal: $("closeModal"),

  toast: $("toast")
};

/* ==========================================
   03. FUNCIONES AUXILIARES
========================================== */

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character])
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getDish(id) {
  return dishes.find(
    (dish) => dish.id === id
  );
}

function getCategory(id) {
  return categories.find(
    (category) => category.id === id
  );
}

/* ==========================================
   04. TOTAL DE MI SELECCIÓN
========================================== */

function totalItems() {
  return Object.values(selection).reduce(
    (total, quantity) => total + quantity,
    0
  );
}

function totalPrice() {
  return Object.entries(selection).reduce(
    (total, [id, quantity]) => {
      const dish = getDish(id);

      if (!dish) return total;

      return (
        total +
        Number(dish.price) * quantity
      );
    },
    0
  );
}

/* ==========================================
   05. GUARDAR DATOS EN EL NAVEGADOR
========================================== */

function loadStorage() {
  try {
    const storedFavorites = JSON.parse(
      localStorage.getItem(FAV_KEY) || "[]"
    );

    const storedSelection = JSON.parse(
      localStorage.getItem(SELECTION_KEY) || "{}"
    );

    if (Array.isArray(storedFavorites)) {
      favorites = new Set(
        storedFavorites.filter(
          (id) => Boolean(getDish(id))
        )
      );
    }

    if (
      storedSelection &&
      typeof storedSelection === "object" &&
      !Array.isArray(storedSelection)
    ) {
      selection = {};

      for (
        const [id, quantity]
        of Object.entries(storedSelection)
      ) {
        if (
          getDish(id) &&
          Number.isInteger(quantity) &&
          quantity > 0
        ) {
          selection[id] = quantity;
        }
      }
    }

  } catch (error) {
    console.warn(
      "IKA: no se pudieron recuperar los datos.",
      error
    );
  }
}

function saveStorage() {
  try {
    localStorage.setItem(
      FAV_KEY,
      JSON.stringify([...favorites])
    );

    localStorage.setItem(
      SELECTION_KEY,
      JSON.stringify(selection)
    );

  } catch (error) {
    console.warn(
      "IKA: no fue posible guardar los datos.",
      error
    );
  }
}

/* ==========================================
   06. CARGAR MENU.JSON
========================================== */

async function loadMenu() {
  try {
    elements.results.innerHTML = `
      <p class="text-center py-5">
        Cargando el menú de IKA...
      </p>
    `;

    const response = await fetch("./menu.json");

    if (!response.ok) {
      throw new Error(
        `No se pudo cargar menu.json: ${response.status}`
      );
    }

    const data = await response.json();

    if (
      !Array.isArray(data.categories) ||
      !Array.isArray(data.dishes)
    ) {
      throw new Error(
        "La estructura de menu.json no es válida."
      );
    }

    categories = data.categories;
    dishes = data.dishes;

    loadStorage();

    renderFilters();
    renderMenu();
    updateCounters();

    console.log(
      `IKA: ${dishes.length} productos cargados correctamente.`
    );

  } catch (error) {
    console.error(error);

    elements.results.innerHTML = `
      <div class="noResults">
        <span class="largeJP">イカ</span>

        <p>
          No pudimos cargar el menú.
        </p>

        <span>
          Verifica menu.json y utiliza Live Server.
        </span>
      </div>
    `;

    elements.resultCount.textContent =
      "Sin datos";
  }
}

/* ==========================================
   07. IMÁGENES DE LOS PLATILLOS
========================================== */

function placeholderHTML() {
  return `
    <div style="
      width:100%;
      height:100%;
      min-height:150px;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      gap:12px;
      background:#eeebe5;
      text-align:center;
    ">

      <span style="
        font-family:Georgia,serif;
        font-size:44px;
        color:#ba402d;
      ">
        イカ
      </span>

      <span style="
        font-size:9px;
        letter-spacing:2px;
        color:#827b72;
      ">
        IKA JAPANESE BISTRO
      </span>

    </div>
  `;
}

function dishImage(dish) {
  if (!dish.image) {
    return placeholderHTML();
  }

  return `
    <img
      src="${escapeHTML(dish.image)}"
      alt="${escapeHTML(dish.name)}"
      loading="lazy">
  `;
}

/* ==========================================
   08. FILTROS DEL MENÚ
========================================== */

function renderFilters() {
  const allCategories = [
    {
      id: "all",
      name: "Todos"
    },
    ...categories
  ];

  elements.filters.innerHTML =
    allCategories.map((category) => `

      <button
        type="button"
        class="filterBtn ${
          activeCategory === category.id
            ? "active"
            : ""
        }"
        data-category="${escapeHTML(category.id)}"
        aria-pressed="${
          activeCategory === category.id
        }">

        ${escapeHTML(category.name)}

      </button>

    `).join("");
}

function setCategory(categoryId) {
  if (
    categoryId !== "all" &&
    !getCategory(categoryId)
  ) {
    return;
  }

  activeCategory = categoryId;
  favoritesOnly = false;

  searchText = "";
  elements.search.value = "";

  renderFilters();
  renderMenu();

  $("carta").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* ==========================================
   09. BUSCAR PRODUCTOS
========================================== */

function filteredDishes() {
  return dishes.filter((dish) => {

    const matchesCategory =
      activeCategory === "all" ||
      dish.cat === activeCategory;

    const category = getCategory(dish.cat);

    const text = normalizeText([
      dish.name,
      dish.extra || "",
      dish.sub || "",
      category?.name || ""
    ].join(" "));

    const matchesSearch = text.includes(
      normalizeText(searchText)
    );

    const matchesFavorites =
      !favoritesOnly ||
      favorites.has(dish.id);

    return (
      matchesCategory &&
      matchesSearch &&
      matchesFavorites
    );
  });
}

/* ==========================================
   10. CREAR TARJETAS DE PLATILLOS
========================================== */

function renderDishCard(dish) {
  const isFavorite = favorites.has(dish.id);
  const category = getCategory(dish.cat);

  const details = [
    dish.extra,
    dish.sub
  ].filter(Boolean).join(" · ");

  return `

    <article class="productCard">

      <!-- FOTOGRAFÍA -->

      <button
        type="button"
        class="productThumb"
        style="
          padding:0;
          border:0;
          cursor:pointer;
        "
        data-action="detail"
        data-id="${escapeHTML(dish.id)}"
        aria-label="Ver detalles de ${escapeHTML(dish.name)}"
        aria-expanded="false">

        ${dishImage(dish)}

      </button>

      <!-- INFORMACIÓN -->

      <div class="productBody">

        <span class="sup" style="
          font-size:9px;
          letter-spacing:1.5px;
          margin-bottom:10px;
        ">

          ${escapeHTML(category?.name || "IKA")}

        </span>

        <button
          type="button"
          class="productName"
          style="
            display:block;
            width:100%;
            padding:0;
            border:0;
            background:transparent;
            color:inherit;
            text-align:left;
            cursor:pointer;
          "
          data-action="detail"
          data-id="${escapeHTML(dish.id)}"
          aria-expanded="false">

          ${escapeHTML(dish.name)}

        </button>

        <div class="productPrice">
          ${formatMoney(dish.price)}
        </div>

        ${details ? `
          <p class="productMeta">
            ${escapeHTML(details)}
          </p>
        ` : ""}

        <!-- ACCIONES -->

        <div class="productActions">

          <button
            type="button"
            class="circleBtn ${
              isFavorite ? "active" : ""
            }"
            data-action="favorite"
            data-id="${escapeHTML(dish.id)}"
            aria-pressed="${isFavorite}"
            aria-label="${
              isFavorite
                ? "Quitar de favoritos"
                : "Guardar en favoritos"
            }">

            ${isFavorite ? "♥" : "♡"}

          </button>

          <button
            type="button"
            class="selectionBtn"
            data-action="add"
            data-id="${escapeHTML(dish.id)}">

            + Mi selección

          </button>

        </div>

      </div>

    </article>
  `;
}

/* ==========================================
   11. MOSTRAR PRODUCTOS
========================================== */

function renderMenu() {
  const visibleDishes = filteredDishes();

  const selectedCategory =
    getCategory(activeCategory);

  elements.stateLine.textContent =
    favoritesOnly
      ? "Mis platillos favoritos"
      : selectedCategory?.name ||
        "Todas las especialidades";

  elements.resultCount.textContent =
    `${visibleDishes.length} opciones`;

  elements.favoritesToggle.classList.toggle(
    "active",
    favoritesOnly
  );

  elements.favoritesToggle.textContent =
    favoritesOnly
      ? "♥ Ver todos"
      : "♡ Favoritos";

  if (visibleDishes.length === 0) {
    elements.results.innerHTML = "";
    elements.empty.classList.remove("hidden");
    return;
  }

  elements.empty.classList.add("hidden");

  elements.results.innerHTML =
    categories.map((category) => {

      const products = visibleDishes.filter(
        (dish) => dish.cat === category.id
      );

      if (products.length === 0) {
        return "";
      }

      return `

        <section class="menuCategory">

          <div class="menuCategoryHead">

            <h2>
              ${escapeHTML(category.name)}
            </h2>

            <small>
              ${escapeHTML(category.japanese)}
            </small>

          </div>

          <div class="productGrid">

            ${products.map(
              renderDishCard
            ).join("")}

          </div>

        </section>
      `;

    }).join("");
}

/* ==========================================
   12. FAVORITOS
========================================== */

function toggleFavorite(id) {
  const dish = getDish(id);

  if (!dish) return;

  if (favorites.has(id)) {
    favorites.delete(id);

    showToast(
      `${dish.name} eliminado de favoritos`
    );

  } else {
    favorites.add(id);

    showToast(
      `${dish.name} guardado en favoritos`
    );
  }

  saveStorage();
  updateCounters();
  renderMenu();
}

function showFavorites() {
  activeCategory = "all";
  favoritesOnly = true;

  searchText = "";
  elements.search.value = "";

  renderFilters();
  renderMenu();

  $("carta").scrollIntoView({
    behavior: "smooth"
  });
}

/* ==========================================
   13. AGREGAR A MI SELECCIÓN
========================================== */

function addToSelection(id) {
  const dish = getDish(id);

  if (!dish) return;

  selection[id] = (
    selection[id] || 0
  ) + 1;

  saveStorage();
  updateCounters();

  showToast(
    `${dish.name} agregado a tu selección`
  );
}

/* ==========================================
   14. MODIFICAR CANTIDADES
========================================== */

function changeQuantity(id, change) {
  const dish = getDish(id);

  if (!dish) return;

  const current = selection[id] || 0;
  const newQuantity = current + change;

  if (newQuantity <= 0) {
    delete selection[id];

  } else {
    selection[id] = newQuantity;
  }

  saveStorage();
  updateCounters();
  renderSelection();
}

/* ==========================================
   15. CONTADORES SUPERIORES
========================================== */

function updateCounters() {
  elements.savedCount.textContent =
    favorites.size;

  const count = totalItems();

  elements.topCount.textContent = count;
  elements.floatCount.textContent = count;

  elements.floatText.textContent =
    `Total estimado: ${formatMoney(totalPrice())}`;

  elements.floating.classList.toggle(
    "hidden",
    count === 0
  );
}

/* ==========================================
   16. ABRIR MI SELECCIÓN
========================================== */

function openSelection() {
  previousFocus = document.activeElement;

  renderSelection();

  elements.overlay.classList.remove("hidden");
  document.body.classList.add("modalOpen");

  elements.closeModal.focus();
}

function closeSelection() {
  elements.overlay.classList.add("hidden");
  document.body.classList.remove("modalOpen");

  if (
    previousFocus &&
    previousFocus.isConnected
  ) {
    previousFocus.focus();
  }

  previousFocus = null;
}

/* ==========================================
   17. MOSTRAR MI SELECCIÓN
========================================== */

function renderSelection() {
  const selectedDishes = Object.entries(
    selection
  ).map(([id, quantity]) => ({
    dish: getDish(id),
    quantity
  })).filter((item) => item.dish);

  /* SELECCIÓN VACÍA */

  if (selectedDishes.length === 0) {
    elements.drawerInner.innerHTML = `

      <span class="modalEyebrow">
        IKA · MI SELECCIÓN
      </span>

      <h2 id="modalTitle">
        Tu selección.
      </h2>

      <div class="emptySelection">

        <p>
          Aún no has elegido ningún platillo.
        </p>

        <p>
          Explora el menú y guarda
          lo que te gustaría probar.
        </p>

      </div>

      <button
        type="button"
        class="primaryBtn"
        data-selection-action="close">

        Seguir explorando

      </button>
    `;

    return;
  }

  /* PRODUCTOS SELECCIONADOS */

  const itemsHTML = selectedDishes.map(
    ({ dish, quantity }) => `

      <div class="lineItem">

        <div class="lineItemInfo">

          <strong>
            ${escapeHTML(dish.name)}
          </strong>

          <small>
            ${formatMoney(dish.price)} c/u
          </small>

        </div>

        <!-- CANTIDAD -->

        <div class="qtyControls">

          <button
            type="button"
            data-selection-action="decrease"
            data-id="${escapeHTML(dish.id)}"
            aria-label="Disminuir cantidad">
            −
          </button>

          <span>${quantity}</span>

          <button
            type="button"
            data-selection-action="increase"
            data-id="${escapeHTML(dish.id)}"
            aria-label="Aumentar cantidad">
            +
          </button>

        </div>

        <!-- SUBTOTAL -->

        <strong style="
          font-size:13px;
          white-space:nowrap;
        ">
          ${formatMoney(dish.price * quantity)}
        </strong>

      </div>
    `
  ).join("");

  elements.drawerInner.innerHTML = `

    <span class="modalEyebrow">
      IKA · MI SELECCIÓN
    </span>

    <h2 id="modalTitle">
      Tu selección.
    </h2>

    <p style="
      color:#77736d;
      font-size:13px;
      line-height:1.8;
    ">

      Estos son los platillos que elegiste.

      Puedes ajustar las cantidades
      antes de mostrarlos al mesero.

    </p>

    <!-- PRODUCTOS -->

    <div>
      ${itemsHTML}
    </div>

    <!-- TOTAL -->

    <div class="totalRow">

      <span>
        Total estimado
      </span>

      <strong>
        ${formatMoney(totalPrice())}
      </strong>

    </div>

    <!-- ACCIONES -->

    <div style="
      display:flex;
      flex-direction:column;
      gap:10px;
    ">

      <button
        type="button"
        class="primaryBtn"
        data-selection-action="copy">

        Copiar mi selección

      </button>

      <button
        type="button"
        class="secondaryBtn"
        data-selection-action="clear">

        Vaciar selección

      </button>

    </div>

    <p style="
      color:#77736d;
      font-size:11px;
      line-height:1.8;
      margin-top:25px;
    ">

      Esta herramienta no realiza pedidos
      ni procesa pagos.

      Los precios están expresados
      en pesos mexicanos.

    </p>
  `;
}

/* ==========================================
   18. COPIAR SELECCIÓN
========================================== */

async function copySelection() {
  if (totalItems() === 0) {
    showToast("Tu selección está vacía");
    return;
  }

  const lines = [
    "IKA JAPANESE BISTRO",
    "Mi selección",
    ""
  ];

  for (
    const [id, quantity]
    of Object.entries(selection)
  ) {
    const dish = getDish(id);

    if (!dish) continue;

    lines.push(
      `${quantity} x ${dish.name} — ${
        formatMoney(dish.price * quantity)
      }`
    );
  }

  lines.push("");
  lines.push(
    `Total estimado: ${formatMoney(totalPrice())}`
  );

  lines.push(
    "Selección informativa, no es un pedido."
  );

  const text = lines.join("\n");

  try {
    await navigator.clipboard.writeText(text);

    showToast(
      "Selección copiada correctamente"
    );

  } catch (error) {
    console.warn(error);

    showToast(
      "No se pudo copiar automáticamente"
    );
  }
}

/* ==========================================
   19. NOTIFICACIONES
========================================== */

function showToast(message) {
  elements.toast.textContent = message;

  elements.toast.classList.remove(
    "hidden"
  );

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    elements.toast.classList.add(
      "hidden"
    );
  }, 2500);
}

/* ==========================================
   20. EVENTOS PRINCIPALES
========================================== */

function initializeEvents() {

  /* BUSCADOR */

  elements.search.addEventListener(
    "input",
    (event) => {
      searchText = event.target.value;
      renderMenu();
    }
  );

  /* FILTROS */

  elements.filters.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "[data-category]"
      );

      if (!button) return;

      setCategory(
        button.dataset.category
      );
    }
  );

  /* CATEGORÍAS CON FOTOGRAFÍAS */

  document.querySelectorAll(
    ".tile"
  ).forEach((tile) => {

    tile.addEventListener(
      "click",
      () => {
        setCategory(
          tile.dataset.category
        );
      }
    );

  });

  /* EXPLORAR MENÚ */

  $("exploreTop").addEventListener(
    "click",
    () => {
      $("carta").scrollIntoView({
        behavior: "smooth"
      });
    }
  );

  /* FAVORITOS */

  elements.favoritesToggle.addEventListener(
    "click",
    () => {
      favoritesOnly = !favoritesOnly;
      renderMenu();
    }
  );

  elements.savedTop.addEventListener(
    "click",
    showFavorites
  );

  /* MI SELECCIÓN */

  elements.selectedTop.addEventListener(
    "click",
    openSelection
  );

  elements.floating.addEventListener(
    "click",
    openSelection
  );

  /* =====================================
     ACCIONES DE TARJETAS
  ===================================== */

  elements.results.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "[data-action]"
      );

      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      switch (action) {

        case "favorite":
          toggleFavorite(id);
          break;

        case "add":
          addToSelection(id);
          break;

        case "detail":

          /*
            IMPORTANTE:

            No abrimos ningún modal aquí.

            galeria.js se encarga
            de expandir el platillo
            dentro de la página.
          */

          break;
      }
    }
  );

  /* =====================================
     ACCIONES DE MI SELECCIÓN
  ===================================== */

  elements.drawerInner.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "[data-selection-action]"
      );

      if (!button) return;

      const action =
        button.dataset.selectionAction;

      const id = button.dataset.id;

      switch (action) {

        case "increase":
          changeQuantity(id, 1);
          break;

        case "decrease":
          changeQuantity(id, -1);
          break;

        case "copy":
          copySelection();
          break;

        case "clear":

          selection = {};

          saveStorage();
          updateCounters();
          renderSelection();

          showToast(
            "Selección vaciada"
          );

          break;

        case "close":
          closeSelection();
          break;
      }
    }
  );

  /* CERRAR SELECCIÓN */

  elements.closeModal.addEventListener(
    "click",
    closeSelection
  );

  elements.overlay.addEventListener(
    "click",
    (event) => {
      if (
        event.target === elements.overlay
      ) {
        closeSelection();
      }
    }
  );

  /* CERRAR CON ESCAPE */

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !elements.overlay.classList.contains(
          "hidden"
        )
      ) {
        closeSelection();
      }
    }
  );

  /* =====================================
     FOTOGRAFÍAS FALTANTES
  ===================================== */

  elements.results.addEventListener(
    "error",
    (event) => {
      const image = event.target;

      if (
        !(image instanceof HTMLImageElement) ||
        !image.matches(".productThumb img")
      ) {
        return;
      }

      const wrapper =
        document.createElement("div");

      wrapper.innerHTML =
        placeholderHTML();

      image.replaceWith(
        wrapper.firstElementChild
      );
    },
    true
  );
}

/* ==========================================
   21. INICIAR APLICACIÓN
========================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeEvents();

    loadMenu();

  }
);
