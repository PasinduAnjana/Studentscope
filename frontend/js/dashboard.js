function getCookieValue(name) {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === name) return value;
  }
  return null;
}

function loadPage(role, page) {
  const path = `dashboard/${role}/${page}.html`;
  fetch(path)
    .then((res) => res.text())
    .then((html) => {
      const temp = document.createElement("div");
      temp.innerHTML = html;

      const scripts = temp.querySelectorAll("script");
      scripts.forEach((s) => s.remove());

      document.getElementById("content").innerHTML = temp.innerHTML;
      applyTranslations();

      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
      });
    });
}

window.addEventListener("DOMContentLoaded", async () => {
  // const userRole = sessionStorage.getItem("role");
  // const userRole = getCookieValue("role");
  const userRole = localStorage.getItem("role");

  // 🛑 Not logged in
  if (!userRole) {
    alert("Access denied. Please login first.");
    window.location.href = "/login.html";
    return;
  }

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
});
