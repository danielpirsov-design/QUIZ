import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const SESSION_SECRET = process.env.SESSION_SECRET || "qwizds-dev-secret-2024";

app.use((req: any, _res, next) => {
  try {
    const cookie = req.cookies?.["qwizds_session"];
    if (cookie) {
      req.session = JSON.parse(Buffer.from(cookie, "base64").toString("utf-8"));
    } else {
      req.session = {};
    }
  } catch {
    req.session = {};
  }
  next();
});

function applySession(req: any, res: any) {
  const sessionData = (req as any).session;
  const isSecure = req.headers["x-forwarded-proto"] === "https" || req.secure;
  if (sessionData && Object.keys(sessionData).length > 0) {
    res.cookie("qwizds_session", Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
      httpOnly: true,
      sameSite: isSecure ? "none" : "lax",
      secure: isSecure,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  } else if (req.cookies?.["qwizds_session"] && (sessionData === null || Object.keys(sessionData ?? {}).length === 0)) {
    res.clearCookie("qwizds_session", { path: "/" });
  }
}

app.use((req: any, res: any, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data: any) => {
    applySession(req, res);
    return originalJson(data);
  };
  const originalRedirect = res.redirect.bind(res);
  res.redirect = (url: any, ...args: any[]) => {
    applySession(req, res);
    return originalRedirect(url, ...args);
  };
  next();
});

app.use("/api", router);

// Serve frontend static files in production
if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(__dirname, "public");
  app.use(express.static(publicDir));
  app.get("/{*path}", (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// Global error handler — returns JSON instead of Express's default HTML error page
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";
  console.error(`[ERROR] ${status}: ${message}`, err.stack ?? "");
  res.status(status).json({ error: message });
});

export default app;
