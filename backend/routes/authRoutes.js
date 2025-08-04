const url = require("url");
const authController = require("../controllers/authController");

module.exports = (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === "/api/login" && req.method === "POST") {
    return authController.login(req, res);
  }

  if (parsedUrl.pathname === "/api/logout" && req.method === "POST") {
    return authController.logout(req, res);
  }

  // Fallback
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Auth route not found" }));
};
