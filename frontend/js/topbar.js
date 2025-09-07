// topbar.js

function loadTopbar() {
  fetch("components/topbar.html")
    .then((res) => res.text())
    .then((html) => {
      document.getElementById("topbar").innerHTML = html;
      setupProfileDropdown();
      setupLanguageDropdown();
      setupSidebarToggle();
      setupLogoutButton();
      applyTranslations();
      fetchUsername();
      setupDarkModeToggle();
    });
}

function setupProfileDropdown() {
  const profileBtn = document.getElementById("profile-btn");
  const dropdown = document.getElementById("profile-dropdown");

  if (profileBtn && dropdown) {
    profileBtn.addEventListener("click", () => {
      dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }
}

function setupLanguageDropdown() {
  const languageBtn = document.getElementById("language-btn");
  const dropdown = document.getElementById("language-dropdown");
  const languageItems = document.querySelectorAll(".dropdown-item");

  const savedLang = localStorage.getItem("lang") || "en";

  // ✅ Set the dropdown label to the saved language name
  const selectedItem = [...languageItems].find(
    (item) => item.getAttribute("data-lang") === savedLang
  );
  if (selectedItem) {
    languageBtn.querySelector("span").textContent = selectedItem.textContent;
  }

  if (languageBtn && dropdown) {
    languageBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
    });

    languageItems.forEach((item) => {
      item.addEventListener("click", () => {
        const lang = item.getAttribute("data-lang");
        languageBtn.querySelector("span").textContent = item.textContent;
        dropdown.style.display = "none";
        localStorage.setItem("lang", lang);
        updateLanguage(lang);
      });
    });

    document.addEventListener("click", (e) => {
      if (!languageBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }
}

function setupSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    });
  }
}

// topbar.js (updated)
async function fetchUsername() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });

    if (!res.ok) {
      if (res.status === 401) {
        // Session expired
        sessionStorage.clear();
        localStorage.removeItem("role");
        window.location.href = "/login.html";
        return;
      }
      throw new Error("Failed to fetch user");
    }

    const user = await res.json();
    document.getElementById("profile-name").textContent = user.username;
  } catch (err) {
    console.error("❌ Error loading profile name:", err);

    // If it's an authentication error, redirect to login
    if (err.message.includes("401") || err.message.includes("session")) {
      sessionStorage.clear();
      localStorage.removeItem("role");
      window.location.href = "/login.html";
      return;
    }

    document.getElementById("profile-name").textContent = "Guest";
  }
}

function setupDarkModeToggle() {
  const toggle = document.getElementById("darkmode-toggle");
  const savedMode = localStorage.getItem("darkmode") === "true";

  toggle.checked = savedMode;
  document.documentElement.classList.toggle("dark-mode", savedMode);

  toggle.addEventListener("change", () => {
    document.documentElement.classList.toggle("dark-mode", toggle.checked);
    localStorage.setItem("darkmode", toggle.checked);
  });
}
