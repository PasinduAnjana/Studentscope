// server.js
const http = require("http");
const url = require("url");
const apiRouter = require("./routes");
const serveStatic = require("./serveStatic");
const { PORT } = require("./config");

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
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
