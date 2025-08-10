const authService = require("../services/authService");

exports.login = async (req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    const { username, password } = JSON.parse(body);

    const user = await authService.authenticate(username, password);

    if (user) {
      // Set both role and userId cookies (HttpOnly, secure if HTTPS)
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": [
          `role=${user.role}; HttpOnly; Max-Age=86400; Path=/`,
          `userId=${user.id}; HttpOnly; Max-Age=86400; Path=/`,
        ],
      });
      res.end(JSON.stringify({ message: "Login successful", role: user.role }));
    } else {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid credentials" }));
    }
  });
};

exports.logout = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Set-Cookie": "role=; HttpOnly; Max-Age=0; Path=/",
  });
  res.end(JSON.stringify({ message: "Logout successful" }));
};

exports.getCurrentUser = async (req, res) => {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/userId=(\d+)/);
  const userId = match ? parseInt(match[1], 10) : null;

  if (!userId) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const username = await authService.getUsernameById(userId);

  if (!username) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "User not found" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ username }));
};
