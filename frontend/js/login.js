document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("loginError");

  api.auth.login({ username, password })
    .then((res) => res.json())
    .then((data) => {
      if (data.role) {
        sessionStorage.setItem("role", data.role);
        localStorage.setItem("role", data.role);

        // ✅ Redirect to dashboard with role in URL
        window.location.href = `/layout.html`;
      } else {
        errorEl.textContent = data.error || "Invalid credentials.";
      }
    })
    .catch((err) => {
      errorEl.textContent = "Something went wrong.";
    });
});
