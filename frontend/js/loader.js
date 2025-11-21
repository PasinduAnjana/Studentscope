const Loader = {
  /**
   * Shows a loader inside the specified element.
   * @param {HTMLElement|string} container - The DOM element or ID of the element to show the loader in.
   */
  show: function (container) {
    const element =
      typeof container === "string"
        ? document.getElementById(container)
        : container;

    if (!element) {
      console.error("Loader: Container element not found.");
      return;
    }

    // Check if loader already exists
    if (element.querySelector(".loader-container")) {
      return;
    }

    // Ensure the container has relative positioning so the absolute loader stays inside
    if (getComputedStyle(element).position === "static") {
      element.style.position = "relative";
    }

    const loaderHtml = `
      <div class="loader-container">
        <img src="/assets/loading.gif" alt="Loading..." />
      </div>
    `;

    element.insertAdjacentHTML("beforeend", loaderHtml);
  },

  /**
   * Hides the loader from the specified element.
   * @param {HTMLElement|string} container - The DOM element or ID of the element to hide the loader from.
   */
  hide: function (container) {
    const element =
      typeof container === "string"
        ? document.getElementById(container)
        : container;

    if (!element) {
      return;
    }

    const loader = element.querySelector(".loader-container");
    if (loader) {
      loader.remove();
    }
  },
};

/**
 * Global loader function.
 * Usage:
 * const hide = loader("#myElement");
 * // ... do work ...
 * hide();
 *
 * Or:
 * loader("#myElement");
 * loader.hide("#myElement");
 */
window.loader = function (container) {
  Loader.show(container);
  return function () {
    Loader.hide(container);
  };
};

window.loader.hide = Loader.hide;
