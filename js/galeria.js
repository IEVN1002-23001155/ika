
/* ==========================================
   IKA JAPANESE BISTRO
   GALERÍA INTERACTIVA EXPANDIBLE
========================================== */

(() => {
  "use strict";

  /* ========================================
     1. CONFIGURACIÓN
  ======================================== */

  const results = document.getElementById("menuResults");

  if (!results) return;

  const state = {
    activeId: null,
    slideIndex: 0,
    images: [],
    timer: null,
    panel: null
  };

  const products = new Map();

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ========================================
     2. FUNCIONES AUXILIARES
  ======================================== */

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

  function formatPrice(value) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0
    }).format(value);
  }

  function getProduct(id) {
    return products.get(id);
  }

  function getCard(id) {
    return [...results.querySelectorAll(".productCard")]
      .find((card) => {
        const button = card.querySelector(
          '[data-action="detail"]'
        );

        return button?.dataset.id === id;
      });
  }

  /* ========================================
     3. OBTENER FOTOGRAFÍAS
  ======================================== */

  function getImages(product) {
    const images = [];

    if (product.image) {
      images.push(product.image);
    }

    if (Array.isArray(product.gallery)) {
      images.push(...product.gallery);
    }

    return [...new Set(
      images.filter(
        (image) =>
          typeof image === "string" &&
          image.trim() !== ""
      )
    )];
  }

  /* ========================================
     4. DETENER ANIMACIÓN AUTOMÁTICA
  ======================================== */

  function stopAutoplay() {
    if (state.timer !== null) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  /* ========================================
     5. CAMBIAR FOTOGRAFÍA
  ======================================== */

  function changeSlide(index) {
    if (!state.panel || state.images.length < 2) {
      return;
    }

    const slides = [
      ...state.panel.querySelectorAll(".ikaSlide")
    ];

    const dots = [
      ...state.panel.querySelectorAll(".ikaDot")
    ];

    state.slideIndex =
      (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      const active = i === state.slideIndex;

      slide.classList.toggle(
        "is-active",
        active
      );

      slide.setAttribute(
        "aria-hidden",
        String(!active)
      );
    });

    dots.forEach((dot, i) => {
      const active = i === state.slideIndex;

      dot.classList.toggle(
        "is-active",
        active
      );

      dot.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    const counter = state.panel.querySelector(
      ".ikaPhotoCounter"
    );

    if (counter) {
      counter.textContent =
        `${state.slideIndex + 1} / ${slides.length}`;
    }
  }

  /* ========================================
     6. INICIAR CAMBIO AUTOMÁTICO
  ======================================== */

  function startAutoplay() {
    stopAutoplay();

    if (
      reducedMotion ||
      document.hidden ||
      state.images.length < 2
    ) {
      return;
    }

    state.timer = setInterval(() => {
      changeSlide(state.slideIndex + 1);
    }, 5500);
  }

  /* ========================================
     7. CONSTRUIR GALERÍA HTML
  ======================================== */

  function createGalleryHTML(product) {
    state.images = getImages(product);
    state.slideIndex = 0;

    const hasMultiple = state.images.length > 1;

    const slides = state.images.map(
      (image, index) => `
        <img
          class="ikaSlide ${
            index === 0 ? "is-active" : ""
          }"
          src="${escapeHTML(image)}"
          alt="Fotografía ${index + 1} de ${escapeHTML(product.name)}"
          loading="${index === 0 ? "eager" : "lazy"}"
          aria-hidden="${index !== 0}">
      `
    ).join("");

    const dots = state.images.map(
      (_, index) => `
        <button
          type="button"
          class="ikaDot ${
            index === 0 ? "is-active" : ""
          }"
          data-gallery-action="dot"
          data-index="${index}"
          aria-label="Ver fotografía ${index + 1}"
          aria-pressed="${index === 0}">
        </button>
      `
    ).join("");

    const description =
      product.description?.trim() ||
      "Consulta con nuestro equipo los ingredientes y detalles de preparación de este platillo.";

    const additionalInfo = product.extra
      ? `
        <p class="ikaExpExtra">
          ${escapeHTML(product.extra)}
        </p>
      `
      : "";

    return `
      <section
        class="dishExpansion"
        aria-label="Detalles de ${escapeHTML(product.name)}">

        <div class="ikaExpansionCanvas">

          <!-- FONDO PROVISIONAL -->

          <div
            class="ikaGalleryBackdrop"
            aria-hidden="true">
            イカ
          </div>

          <!-- FOTOGRAFÍAS -->

          <div class="ikaSlides">
            ${slides}
          </div>

          <!-- DEGRADADO OSCURO -->

          <div
            class="ikaPhotoShade"
            aria-hidden="true">
          </div>

          <!-- CERRAR -->

          <button
            type="button"
            class="ikaExpClose"
            data-gallery-action="close"
            aria-label="Cerrar galería">
            ×
          </button>

          <!-- FLECHAS -->

          ${hasMultiple ? `
            <button
              type="button"
              class="ikaGalleryArrow prev"
              data-gallery-action="previous"
              aria-label="Fotografía anterior">
              ‹
            </button>

            <button
              type="button"
              class="ikaGalleryArrow next"
              data-gallery-action="next"
              aria-label="Siguiente fotografía">
              ›
            </button>

            <div class="ikaGalleryProgress">

              <div class="ikaDots">
                ${dots}
              </div>

              <span class="ikaPhotoCounter">
                1 / ${state.images.length}
              </span>

            </div>
          ` : ""}

          <!-- INFORMACIÓN SOBRE LA IMAGEN -->

          <div class="ikaExpContent">

            <p class="ikaExpEyebrow">
              IKA JAPANESE BISTRO
              <span>·</span>
              ${escapeHTML(product.cat)}
            </p>

            <h3 class="ikaExpTitle">
              ${escapeHTML(product.name)}
            </h3>

            <p class="ikaExpDescription">
              ${escapeHTML(description)}
            </p>

            ${additionalInfo}

            <div class="ikaExpBottom">

              <strong class="ikaExpPrice">
                ${formatPrice(product.price)}
              </strong>

              <div class="ikaExpActions">

                <button
                  type="button"
                  class="ikaExpFavorite"
                  data-gallery-action="favorite"
                  data-id="${escapeHTML(product.id)}">
                  ♡ Guardar
                </button>

                <button
                  type="button"
                  class="ikaExpAdd"
                  data-gallery-action="add"
                  data-id="${escapeHTML(product.id)}">
                  + Mi selección
                </button>

              </div>

            </div>

          </div>

        </div>

      </section>
    `;
  }

  /* ========================================
     8. BUSCAR FINAL DE FILA
  ======================================== */

  function findLastCardInRow(card) {
    const grid = card.closest(".productGrid");

    if (!grid) return null;

    const cards = [
      ...grid.querySelectorAll(":scope > .productCard")
    ];

    const clickedTop =
      card.getBoundingClientRect().top;

    const sameRow = cards.filter((item) => {
      const top = item.getBoundingClientRect().top;

      return Math.abs(top - clickedTop) < 3;
    });

    return sameRow.at(-1) || card;
  }

  /* ========================================
     9. COLOCAR GALERÍA EN EL MENÚ
  ======================================== */

  function insertGallery(animate = true) {
    if (!state.activeId) return;

    const product = getProduct(state.activeId);
    const card = getCard(state.activeId);

    if (!product || !card) {
      state.activeId = null;
      state.panel = null;
      stopAutoplay();
      return;
    }

    stopAutoplay();

    results.querySelectorAll(".dishExpansion")
      .forEach((panel) => panel.remove());

    const lastCard = findLastCardInRow(card);

    if (!lastCard) return;

    lastCard.insertAdjacentHTML(
      "afterend",
      createGalleryHTML(product)
    );

    state.panel = lastCard.nextElementSibling;

    /* MARCAR PRODUCTO ABIERTO */

    results.querySelectorAll(
      '[data-action="detail"]'
    ).forEach((button) => {
      button.setAttribute(
        "aria-expanded",
        String(
          button.dataset.id === state.activeId
        )
      );
    });

    /* CONTROLAR IMÁGENES FALTANTES */

    state.panel.querySelectorAll(".ikaSlide")
      .forEach((image) => {
        function handleError() {
          image.style.display = "none";
        }

        image.addEventListener(
          "error",
          handleError,
          { once: true }
        );

        if (
          image.complete &&
          image.naturalWidth === 0
        ) {
          handleError();
        }
      });

    /* ANIMAR EXPANSIÓN */

    if (animate && !reducedMotion) {
      const panel = state.panel;

      panel.style.height = "0px";
      panel.style.opacity = "0";

      void panel.offsetHeight;

      requestAnimationFrame(() => {
        panel.style.height =
          `${panel.scrollHeight}px`;

        panel.style.opacity = "1";
      });

      const finish = (event) => {
        if (event.propertyName !== "height") {
          return;
        }

        panel.style.height = "auto";
        panel.removeEventListener(
          "transitionend",
          finish
        );
      };

      panel.addEventListener(
        "transitionend",
        finish
      );
    }

    /* PAUSAR AL PASAR EL MOUSE */

    state.panel.addEventListener(
      "mouseenter",
      stopAutoplay
    );

    state.panel.addEventListener(
      "mouseleave",
      startAutoplay
    );

    /* DESLIZAR CON EL DEDO */

    let startX = null;

    state.panel.addEventListener(
      "touchstart",
      (event) => {
        if (event.target.closest("button")) {
          return;
        }

        startX =
          event.changedTouches[0]?.screenX ?? null;
      },
      { passive: true }
    );

    state.panel.addEventListener(
      "touchend",
      (event) => {
        if (
          startX === null ||
          state.images.length < 2
        ) {
          return;
        }

        const endX =
          event.changedTouches[0]?.screenX ??
          startX;

        const difference = endX - startX;

        if (Math.abs(difference) > 45) {
          changeSlide(
            state.slideIndex +
            (difference < 0 ? 1 : -1)
          );

          startAutoplay();
        }

        startX = null;
      },
      { passive: true }
    );

    startAutoplay();
  }

  /* ========================================
     10. ABRIR PLATILLO
  ======================================== */

  function openProduct(id) {
    if (!getProduct(id)) return;

    if (state.activeId === id) {
      closeGallery();
      return;
    }

    state.activeId = id;

    insertGallery(true);

    const panel = state.panel;

    if (panel) {
      setTimeout(() => {
        if (
          state.panel === panel &&
          panel.isConnected
        ) {
          panel.scrollIntoView({
            behavior: reducedMotion
              ? "auto"
              : "smooth",
            block: "center"
          });
        }
      }, 270);
    }
  }

  /* ========================================
     11. CERRAR GALERÍA
  ======================================== */

  function closeGallery() {
    const panel = state.panel;

    state.activeId = null;
    state.panel = null;
    state.images = [];

    stopAutoplay();

    results.querySelectorAll(
      '[data-action="detail"]'
    ).forEach((button) => {
      button.setAttribute(
        "aria-expanded",
        "false"
      );
    });

    if (!panel) return;

    if (reducedMotion) {
      panel.remove();
      return;
    }

    panel.style.height =
      `${panel.scrollHeight}px`;

    panel.style.opacity = "1";

    void panel.offsetHeight;

    requestAnimationFrame(() => {
      panel.style.height = "0px";
      panel.style.opacity = "0";
    });

    setTimeout(() => {
      panel.remove();
    }, 480);
  }

  /* ========================================
     12. EVENTOS DE BOTONES
  ======================================== */

  function handleGalleryButtons(event) {
    const button = event.target.closest(
      "[data-gallery-action]"
    );

    if (!button) return;

    const action = button.dataset.galleryAction;

    switch (action) {
      case "close":
        closeGallery();
        break;

      case "next":
        changeSlide(state.slideIndex + 1);
        startAutoplay();
        break;

      case "previous":
        changeSlide(state.slideIndex - 1);
        startAutoplay();
        break;

      case "dot":
        changeSlide(
          Number(button.dataset.index)
        );
        startAutoplay();
        break;

      case "add":
        if (typeof addToSelection === "function") {
          addToSelection(button.dataset.id);
        }
        break;

      case "favorite":
        if (typeof toggleFavorite === "function") {
          toggleFavorite(button.dataset.id);
        }
        break;
    }
  }

  /* ========================================
     13. INTERCEPTAR CLIC DEL PRODUCTO
  ======================================== */

  function interceptProductClick(event) {
    const detailButton = event.target.closest(
      '[data-action="detail"]'
    );

    const card = event.target.closest(
      ".productCard"
    );

    if (!detailButton && !card) return;

    /* NO INTERFERIR CON BOTONES EXISTENTES */

    if (
      !detailButton &&
      event.target.closest(
        ".productActions, button, a"
      )
    ) {
      return;
    }

    const button =
      detailButton ||
      card?.querySelector(
        '[data-action="detail"]'
      );

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openProduct(button.dataset.id);
  }

  /* ========================================
     14. ADAPTAR A DISTINTAS PANTALLAS
  ======================================== */

  let resizeTimer = null;

  function repositionGallery() {
    if (!state.activeId || !state.panel) {
      return;
    }

    const card = getCard(state.activeId);

    if (!card) {
      closeGallery();
      return;
    }

    const lastCard = findLastCardInRow(card);

    if (
      lastCard &&
      lastCard.nextElementSibling !== state.panel
    ) {
      lastCard.after(state.panel);
    }
  }

  /* ========================================
     15. CARGAR DATOS DE PLATILLOS
  ======================================== */

  async function loadGalleryData() {
    try {
      const response = await fetch("./menu.json");

      if (!response.ok) {
        throw new Error(
          `Error HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.dishes)) {
        throw new Error(
          "No existe la lista de platillos."
        );
      }

      data.dishes.forEach((product) => {
        products.set(product.id, product);
      });

      console.log(
        `IKA: galerías preparadas para ${products.size} productos.`
      );

    } catch (error) {
      console.error(
        "IKA: no se pudieron cargar las galerías.",
        error
      );
    }
  }

  /* ========================================
     16. INICIAR EVENTOS
  ======================================== */

  function initializeGallery() {
    /* Captura del clic antes del modal antiguo */

    results.addEventListener(
      "click",
      interceptProductClick,
      true
    );

    /* Controles de galería */

    results.addEventListener(
      "click",
      handleGalleryButtons
    );

    /* Detectar cambios del menú */

    const observer = new MutationObserver(() => {
      if (!state.activeId) return;

      if (
        !results.querySelector(".dishExpansion")
      ) {
        insertGallery(false);
      }
    });

    observer.observe(results, {
      childList: true,
      subtree: true
    });

    /* Pantallas responsivas */

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(
        repositionGallery,
        160
      );
    });

    /* Pausar al cambiar de pestaña */

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          stopAutoplay();
        } else if (state.activeId) {
          startAutoplay();
        }
      }
    );

    /* Teclado */

    document.addEventListener(
      "keydown",
      (event) => {
        if (!state.activeId) return;

        const overlay =
          document.getElementById("overlay");

        if (
          overlay &&
          !overlay.classList.contains("hidden")
        ) {
          return;
        }

        if (event.key === "Escape") {
          closeGallery();
        }

        /* Flechas cuando el foco está
           dentro de la galería */

        if (
          state.panel?.contains(document.activeElement)
        ) {
          if (event.key === "ArrowRight") {
            changeSlide(state.slideIndex + 1);
          }

          if (event.key === "ArrowLeft") {
            changeSlide(state.slideIndex - 1);
          }
        }
      }
    );
  }

  /* ========================================
     17. INICIAR APLICACIÓN
  ======================================== */

  async function init() {
    await loadGalleryData();
    initializeGallery();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
