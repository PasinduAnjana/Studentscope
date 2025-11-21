// server.js
const http = require("http");
const url = require("url");
const apiRouter = require("./routes");
const serveStatic = require("./serveStatic");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith("/api")) {
    apiRouter(req, res);
    return;
  }

  // frontend
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
