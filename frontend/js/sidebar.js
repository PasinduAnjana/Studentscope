// sidebar.js
async function loadSidebar(role) {
  const sidebarFile = `data/sidebar-${role}.json`;
  const links = await fetch(sidebarFile).then((res) => res.json());

  const sidebarEl = document.getElementById("sidebar");
  let ul = document.createElement("ul");

  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = urlParams.get("page") || "dashboard";

  links.forEach((link) => {
    const li = document.createElement("li");

    // Add icon if available
    if (link.icon) {
      const icon = document.createElement("i");
      icon.className = link.icon;
      li.appendChild(icon);
    }

    // Add translated text
    const rawKey = link.label;
    const translatedLabel =
      getNestedValue(window.currentTranslations, rawKey) || rawKey;
    const text = document.createTextNode(translatedLabel);
    li.appendChild(text);

    // ✅ Highlight current page
    if (link.page === currentPage) {
      li.classList.add("active");
    }

    // Click handler
    li.addEventListener("click", () => {
      document
        .querySelectorAll("#sidebar li")
        .forEach((item) => item.classList.remove("active"));
      li.classList.add("active");

      // ✅ Update URL and load
      const url = new URL(window.location);
      url.searchParams.set("page", link.page);
      window.history.pushState({}, "", url);

      loadPage(role, link.page);
    });

    ul.appendChild(li);
  });

  sidebarEl.innerHTML = "";
  sidebarEl.appendChild(ul);
}
