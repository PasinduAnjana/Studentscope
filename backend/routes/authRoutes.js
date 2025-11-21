const url = require("url");
const authController = require("../controllers/authController");

module.exports = (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (parsedUrl.pathname === "/api/auth/login" && req.method === "POST") {
    return authController.login(req, res);
  }

  if (parsedUrl.pathname === "/api/auth/logout" && req.method === "POST") {
    return authController.logout(req, res);
  }

  if (parsedUrl.pathname === "/api/auth/me" && req.method === "GET") {
    return authController.getCurrentUser(req, res);
  }

  if (parsedUrl.pathname === "/api/auth/verify-user" && req.method === "POST") {
    return authController.verifyUser(req, res);
  }

  if (
    parsedUrl.pathname === "/api/auth/request-password-reset" &&
    req.method === "POST"
  ) {
    return authController.requestPasswordReset(req, res);
  }

  // Fallback
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Auth route not found" }));
};
