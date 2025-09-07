// dashboard.js - Updated with session validation
function getCookieValue(name) {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === name) return value;
  }
  return null;
}

async function checkSessionValidity() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) throw new Error("Session invalid");
    return await res.json();
  } catch (err) {
    console.error("Session check failed:", err);
    return null;
  }
}

function loadPage(role, page) {
  // Handle subfolders: if page is folder/subpage, load folder/subpage.html
  // if page is just a folder name, load folder/index.html
  // otherwise load the page directly with .html extension
  let path;
  if (page.includes("/")) {
    // For subfolder pages like marks/entry or attendance/mark
    path = `dashboard/${role}/${page}.html`;
  } else if (["attendance", "marks"].includes(page)) {
    // For folders that use index.html
    path = `dashboard/${role}/${page}/index.html`;
  } else {
    // For direct pages like dashboard.html
    path = `dashboard/${role}/${page}.html`;
  }
  fetch(path)
    .then((res) => res.text())
    .then(async (html) => {
      // Check session before rendering content
      const userData = await checkSessionValidity();
      if (!userData) {
        alert("Session expired. Please login again.");
        sessionStorage.clear();
        localStorage.removeItem("role");
        window.location.href = "/login.html";
        return;
      }

      const temp = document.createElement("div");
      temp.innerHTML = html;

      const scripts = temp.querySelectorAll("script");
      scripts.forEach((s) => s.remove());

      document.getElementById("content").innerHTML = temp.innerHTML;
      applyTranslations();

      setTimeout(() => {
        scripts.forEach((oldScript) => {
          if (oldScript.src) {
            if (![...document.scripts].some((s) => s.src === oldScript.src)) {
              const newScript = document.createElement("script");
              newScript.src = oldScript.src;
              document.body.appendChild(newScript);
            }
          } else {
            try {
              window.eval(oldScript.textContent);
            } catch (e) {
              console.error("Error executing inline script:", e);
            }
          }
        });
      }, 0);
    })
    .catch((err) => {
      console.error("Failed to load page:", err);
    });
}

function setupSessionWatcher() {
  // Check session every 30 seconds
  setInterval(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        // Session expired
        sessionStorage.clear();
        localStorage.removeItem("role");
        window.location.href = "/login.html";
      }
    } catch (err) {
      console.error("Session watch error:", err);
    }
  }, 30000); // 30 seconds
}

window.addEventListener("DOMContentLoaded", async () => {
  // First check if session is still valid
  const userData = await checkSessionValidity();

  // 🛑 Not logged in or session expired
  if (!userData) {
    alert("Session expired. Please login again.");
    sessionStorage.clear();
    localStorage.removeItem("role");
    window.location.href = "/login.html";
    return;
  }

  const userRole = userData.role;
  localStorage.setItem("role", userRole);

  // 🔐 Role from query
  const urlParams = new URLSearchParams(window.location.search);
  const requestedRole = urlParams.get("role");

  // ⚠️ Role in URL is missing or mismatched
  if (!requestedRole || requestedRole !== userRole) {
    window.location.href = `/layout.html?role=${userRole}`;
    return;
  }

  const page = urlParams.get("page") || "dashboard";

  const savedLang = localStorage.getItem("lang") || "en";
  await updateLanguage(savedLang);

  loadTopbar();
  loadSidebar(userRole);
  loadPage(userRole, page);

  // Start session watcher
  setupSessionWatcher();
});
