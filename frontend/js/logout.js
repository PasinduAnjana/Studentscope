// logout.js
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logout-btn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await api.auth.logout();

      sessionStorage.clear(); // 🔐 Clear any session info
      localStorage.removeItem("role");
      window.location.href = "/login.html"; // 🔁 Redirect
    } catch (err) {
      console.error("Logout failed:", err);
      toast(
        "Logout failed. Please try again.",
        "fa-solid fa-circle-exclamation"
      );
    }
  });
}
