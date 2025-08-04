const authService = require("../services/authService");

exports.login = async (req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    const { username, password } = JSON.parse(body);

    const user = await authService.authenticate(username, password);

    if (user) {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `role=${user.role}; HttpOnly; Max-Age=86400; Path=/`,
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
