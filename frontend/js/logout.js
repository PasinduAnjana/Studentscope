// logout.js
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logout-btn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      sessionStorage.clear(); // 🔐 Clear any session info
      localStorage.removeItem("role");
      window.location.href = "/login.html"; // 🔁 Redirect
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Logout failed. Please try again.");
    }
  });
}
