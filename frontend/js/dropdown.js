// Enhanced dropdown.js with overflow fix
function makeSearchableDropdown(selectId, onSelect) {
  const select = document.getElementById(selectId);
  select.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.classList.add("searchable-select");

  // Display
  const display = document.createElement("div");
  display.classList.add("dropdown-display");

  const selectedText = document.createElement("span");
  // Use currently selected option if available; otherwise fall back to first non-empty or the first option
  const initialSelectedOption =
    select.options[select.selectedIndex] ||
    Array.from(select.options).find((o) => o.value) ||
    select.options[0];
  selectedText.textContent = initialSelectedOption
    ? initialSelectedOption.text
    : "";

  const arrow = document.createElement("i");
  arrow.classList.add("fas", "fa-chevron-down", "dropdown-arrow");

  display.appendChild(selectedText);
  display.appendChild(arrow);

  // Create dropdown list as a portal (appended to body)
  const list = document.createElement("div");
  list.classList.add("dropdown-list", "dropdown-portal");
  list.style.position = "fixed"; // Use fixed positioning
  list.style.display = "none";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.classList.add("dropdown-search");
  searchInput.placeholder = "Search...";

  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("dropdown-options");

  list.appendChild(searchInput);
  list.appendChild(optionsContainer);

  // Append dropdown to body to escape overflow constraints
  document.body.appendChild(list);

  // Position the dropdown relative to the display element
  function positionDropdown() {
    const displayRect = display.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 200; // Approximate height

    // Check if there's space below
    const spaceBelow = viewportHeight - displayRect.bottom;
    const spaceAbove = displayRect.top;

    list.style.left = displayRect.left + "px";
    list.style.width = displayRect.width + "px";

    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      // Position below
      list.style.top = displayRect.bottom + 6 + "px";
      list.classList.remove("dropdown-above");
    } else {
      // Position above
      list.style.top = displayRect.top - dropdownHeight - 6 + "px";
      list.classList.add("dropdown-above");
    }
  }

  // Render options
  function renderOptions(filter = "") {
    optionsContainer.innerHTML = "";
    const filtered = Array.from(select.options).filter((opt) =>
      opt.text.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.classList.add("dropdown-item", "empty");
      empty.textContent = "No results found";
      optionsContainer.appendChild(empty);
      return;
    }

    filtered.forEach((opt) => {
      if (!opt.value) return;
      const item = document.createElement("div");
      item.classList.add("dropdown-item");
      item.textContent = opt.text;
      item.onclick = () => {
        selectedText.textContent = opt.text;
        select.value = opt.value;
        onSelect && onSelect(opt.value, opt.text);
        closeDropdown();
      };
      optionsContainer.appendChild(item);
    });
  }

  function openDropdown() {
    positionDropdown();
    list.style.display = "block";
    arrow.classList.add("open");
    searchInput.value = "";
    renderOptions();
    searchInput.focus();
  }

  function closeDropdown() {
    list.style.display = "none";
    arrow.classList.remove("open");
  }

  display.addEventListener("click", () => {
    const isOpen = list.style.display === "block";
    isOpen ? closeDropdown() : openDropdown();
  });

  searchInput.addEventListener("input", (e) => {
    renderOptions(e.target.value);
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target) && !list.contains(e.target)) {
      closeDropdown();
    }
  });

  // Reposition on scroll/resize
  window.addEventListener("scroll", () => {
    if (list.style.display === "block") {
      positionDropdown();
    }
  });

  window.addEventListener("resize", () => {
    if (list.style.display === "block") {
      positionDropdown();
    }
  });

  // Cleanup function
  function destroy() {
    if (list.parentNode) {
      list.parentNode.removeChild(list);
    }
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    select.style.display = "";
  }

  // Init
  wrapper.appendChild(display);
  select.parentNode.insertBefore(wrapper, select);

  // Return object with destroy method for cleanup
  return { destroy };
}
