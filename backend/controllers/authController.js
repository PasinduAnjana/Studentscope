const authService = require("../services/authService");

exports.login = async (req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { username, password } = JSON.parse(body);

      const user = await authService.authenticate(username, password);

      if (user) {
        const sessionToken = await authService.createSession(user);

        if (!sessionToken) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to create session" }));
          return;
        }

        // Determine if HTTPS is being used
        const isHttps =
          req.headers["x-forwarded-proto"] === "https" ||
          req.connection.encrypted;

        const cookieOptions = [
          `sessionToken=${sessionToken}`,
          "HttpOnly",
          "Max-Age=86400",
          "Path=/",
          "SameSite=Strict",
        ];

        if (isHttps) {
          cookieOptions.push("Secure");
        }

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": cookieOptions.join("; "),
        });
        res.end(
          JSON.stringify({
            message: "Login successful",
            role: user.role,
            username: user.username,
          })
        );
      } else {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid credentials" }));
      }
    } catch (err) {
      console.error("Login error:", err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
};

exports.logout = async (req, res) => {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sessionToken=([^;]+)/);
  const sessionToken = match ? match[1] : null;

  if (sessionToken) {
    await authService.destroySession(sessionToken);
  }

  // Determine if HTTPS is being used
  const isHttps =
    req.headers["x-forwarded-proto"] === "https" || req.connection.encrypted;

  const cookieOptions = [
    "sessionToken=",
    "HttpOnly",
    "Max-Age=0",
    "Path=/",
    "SameSite=Strict",
  ];

  if (isHttps) {
    cookieOptions.push("Secure");
  }

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Set-Cookie": cookieOptions.join("; "),
  });
  res.end(JSON.stringify({ message: "Logout successful" }));
};

exports.getCurrentUser = async (req, res) => {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sessionToken=([^;]+)/);
  const sessionToken = match ? match[1] : null;

  if (!sessionToken) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "No session token" }));
    return;
  }

  const session = await authService.getSession(sessionToken);

  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid or expired session" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      username: session.username,
      role: session.role,
      userId: session.userId,
    })
  );
};
