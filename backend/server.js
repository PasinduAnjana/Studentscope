const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");

const { PORT } = require("./config");

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith("/api/login") || pathname.startsWith("/api/logout")) {
    return authRoutes(req, res);
  }

  if (pathname.startsWith("/api/students")) {
    return studentRoutes(req, res);
  }

  const filePath = path.join(
    __dirname,
    "../frontend",
    pathname === "/" ? "index.html" : pathname
  );
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
