function makeSearchableDropdown(selectId, onSelect) {
  const select = document.getElementById(selectId);
  select.style.display = "none"; // hide original

  const wrapper = document.createElement("div");
  wrapper.classList.add("searchable-select");

  // Display
  const display = document.createElement("div");
  display.classList.add("dropdown-display");

  // Selected text
  const selectedText = document.createElement("span");
  selectedText.textContent = select.options[0].text;

  // Arrow icon (FontAwesome)
  const arrow = document.createElement("i");
  arrow.classList.add("fas", "fa-chevron-down", "dropdown-arrow");

  display.appendChild(selectedText);
  display.appendChild(arrow);

  // Dropdown list
  const list = document.createElement("div");
  list.classList.add("dropdown-list");

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.classList.add("dropdown-search");
  searchInput.placeholder = "Search...";

  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("dropdown-options");

  list.appendChild(searchInput);
  list.appendChild(optionsContainer);

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

  // Open/close
  function openDropdown() {
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
    if (!wrapper.contains(e.target)) closeDropdown();
  });

  // Init
  wrapper.appendChild(display);
  wrapper.appendChild(list);
  select.parentNode.insertBefore(wrapper, select);
}
