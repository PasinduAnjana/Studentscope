class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
  }

  connectedCallback() {
    if (this.hasAttribute('rendered')) return;

    // Save original children (the form content)
    const children = Array.from(this.childNodes);

    // Basic styles for the container itself (the modal overlay)
    this.style.display = "none";
    this.style.position = "fixed";
    this.style.zIndex = "1000";
    this.style.left = "0";
    this.style.top = "0";
    this.style.width = "100%";
    this.style.height = "100%";
    this.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.style.alignItems = "center";
    this.style.justifyContent = "center";
    this.classList.add("modal"); 

    const title = this.getAttribute("title") || "";

    // Create the modal card wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "modal-content";
    wrapper.style.cssText = "background-color: var(--color-card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; padding: 0;";

    // Header
    const header = document.createElement("div");
    header.style.cssText = "padding: 24px 24px 0 24px;";
    header.innerHTML = `
        <div class="flex-between" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="modal-title-text" style="font-size: 22px; font-weight: 700; color: var(--color-text); margin: 0;">${title}</h3>
            <div id="modal-subtitle-slot"></div>
          </div>
          <button class="modal-close-btn" style="font-size: 24px; color: var(--color-subtext); background: none; border: none; cursor: pointer;">&times;</button>
        </div>
    `;

    // Body
    const body = document.createElement("div");
    body.className = "modal-body-content";
    body.style.cssText = "padding: 24px;";

    // Move original children into body
    children.forEach(child => body.appendChild(child));

    // Assemble
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    
    // Clear current content and append wrapper
    this.innerHTML = ''; 
    this.appendChild(wrapper);

    // References
    this.titleElement = header.querySelector(".modal-title-text");
    this.subtitleContainer = header.querySelector("#modal-subtitle-slot");

    this.setupEventListeners();
    this.setAttribute('rendered', 'true');
  }

  static get observedAttributes() {
    return ["title"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "title" && this.titleElement) {
      this.titleElement.textContent = newValue;
    }
  }

  setupEventListeners() {
    this.addEventListener("click", this.handleOutsideClick);
    const closeBtn = this.querySelector(".modal-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", this.handleCloseClick);
    }
  }

  // Not strictly necessary to remove if elements are destroyed, 
  // but good practice if the component is moved/detached.
  disconnectedCallback() {
      this.removeEventListener("click", this.handleOutsideClick);
      const closeBtn = this.querySelector(".modal-close-btn");
      if (closeBtn) {
          closeBtn.removeEventListener("click", this.handleCloseClick);
      }
  }

  handleOutsideClick(e) {
    if (e.target === this) {
      this.close();
    }
  }

  handleCloseClick(e) {
    e.stopPropagation();
    this.close();
  }

  open() {
    this.style.display = "flex";
    this.dispatchEvent(new Event("modal-open"));
  }

  close() {
    this.style.display = "none";
    this.dispatchEvent(new Event("modal-close"));
  }

  setTitle(title) {
    this.setAttribute("title", title);
    // Attribute changed callback handles the text update
  }
}

customElements.define("modal-dialog", ModalDialog);
