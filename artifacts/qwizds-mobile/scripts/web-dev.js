/**
 * Web dev server for Expo mobile app.
 * Serves the static Expo web export on PORT for the Replit preview pane.
 * Rebuilds in the background using a fully detached child process.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.PORT || "22648", 10);
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
const DIST_DIR = path.resolve(__dirname, "..", "dist");
const PROJECT_ROOT = path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

function serveFile(res, filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    res.writeHead(200, {
      "Content-Type": getMime(filePath),
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  let urlPath = req.url.split("?")[0];

  if (urlPath === "/status" || urlPath === `${BASE_PATH}/status`) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (BASE_PATH && urlPath.startsWith(BASE_PATH + "/")) {
    urlPath = urlPath.slice(BASE_PATH.length);
  } else if (BASE_PATH && urlPath === BASE_PATH) {
    urlPath = "/";
  }

  let filePath = path.join(DIST_DIR, urlPath);
  if (serveFile(res, filePath)) return;
  if (serveFile(res, filePath + ".html")) return;
  if (serveFile(res, path.join(filePath, "index.html"))) return;
  if (serveFile(res, path.join(DIST_DIR, "index.html"))) return;

  res.writeHead(404);
  res.end("Not found");
});

function patchIndexHtml() {
  const indexPath = path.join(DIST_DIR, "index.html");
  if (!BASE_PATH || !fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, "utf-8");
  if (!html.includes(`${BASE_PATH}/_expo`)) {
    html = html.replace(/(href|src)="\//g, `$1="${BASE_PATH}/`);
    fs.writeFileSync(indexPath, html);
    console.log("[web-dev] Patched index.html with base path", BASE_PATH);
  }
}

let buildRunning = false;
function runBuild() {
  if (buildRunning) return;
  buildRunning = true;
  console.log("[web-dev] Building Expo web bundle...");
  const logPath = path.join(PROJECT_ROOT, "build.log");
  const logFd = fs.openSync(logPath, "a");
  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: process.env.EXPO_PUBLIC_DOMAIN || "localhost",
    FORCE_COLOR: "0",
  };
  const child = spawn(
    "pnpm", ["exec", "expo", "export", "--platform", "web", "--output-dir", "dist"],
    {
      cwd: PROJECT_ROOT,
      env,
      stdio: ["ignore", logFd, logFd],
      detached: false,
    }
  );
  child.on("exit", (code) => {
    buildRunning = false;
    fs.closeSync(logFd);
    if (code === 0) {
      patchIndexHtml();
      console.log("[web-dev] Build complete. Serving updated files.");
    } else {
      console.error("[web-dev] Build failed with code", code);
    }
  });
  child.on("error", (err) => {
    buildRunning = false;
    try { fs.closeSync(logFd); } catch {}
    console.error("[web-dev] Build error:", err.message);
  });
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`[web-dev] Port ${PORT} already in use — another server is running. Exiting cleanly.`);
    process.exit(0);
  }
  console.error("[web-dev] Server error:", err.message);
});

process.on("SIGTERM", () => {
  console.log("[web-dev] Received SIGTERM, shutting down...");
  server.close(() => process.exit(0));
});

process.on("uncaughtException", (err) => {
  console.error("[web-dev] Uncaught exception:", err.message);
});

// Wait 4 seconds before attempting to bind. The "QUIZDES Mobile Preview"
// standalone workflow starts simultaneously and should claim port 22648 first.
// After the delay, server.listen() gets EADDRINUSE → exits cleanly → "finished".
// If this process happens to be the standalone (no competing workflow), it binds normally.
setTimeout(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[web-dev] Serving Expo web on http://localhost:${PORT}`);
    const hasDist = fs.existsSync(path.join(DIST_DIR, "index.html"));
    if (hasDist) {
      patchIndexHtml();
      console.log("[web-dev] Serving pre-built dist/. Rebuilding in background...");
    } else {
      console.log("[web-dev] No dist found — building now...");
    }
    setTimeout(runBuild, 1000);
    // Keep the process alive with a periodic heartbeat log
    setInterval(() => {
      process.stdout.write(`[web-dev] alive on :${PORT}\n`);
    }, 30000);
  });
}, process.env.BIND_DELAY_MS ? parseInt(process.env.BIND_DELAY_MS) : 0);
