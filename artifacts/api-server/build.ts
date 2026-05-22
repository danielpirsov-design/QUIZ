import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile, cp, mkdir } from "fs/promises";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cookie-parser",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "resend",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

const ESBUILD_BANNER = {
  js: 'const __importMetaUrl=require("url").pathToFileURL(__filename).href;',
};
const ESBUILD_DEFINE = {
  "import.meta.url": "__importMetaUrl",
  "process.env.NODE_ENV": '"production"',
};

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  // Remove only the compiled server bundle, preserve dist/public (frontend assets)
  await rm(path.join(distDir, "index.cjs"), { force: true });
  await rm(path.join(distDir, "index.cjs.map"), { force: true });
  await rm(path.join(distDir, "handler.cjs"), { force: true });

  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  // Build main server bundle (for Replit / self-hosted)
  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.cjs"),
    banner: ESBUILD_BANNER,
    define: ESBUILD_DEFINE,
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Build Vercel handler bundle (app only — no listen())
  console.log("building vercel handler...");
  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/app.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "handler.cjs"),
    banner: ESBUILD_BANNER,
    define: ESBUILD_DEFINE,
    minify: false,
    external: externals,
    logLevel: "info",
  });
}

async function copyFrontend() {
  const frontendDist = path.resolve(__dirname, "..", "qwizds", "dist", "public");
  const destDir = path.resolve(__dirname, "dist", "public");
  if (existsSync(frontendDist)) {
    console.log("copying frontend build to dist/public...");
    await rm(destDir, { recursive: true, force: true });
    await cp(frontendDist, destDir, { recursive: true });
    console.log("frontend copied.");
  } else {
    console.warn("frontend dist not found at", frontendDist, "— skipping copy");
  }
}

async function copyVercelHandler() {
  const handlerSrc = path.resolve(__dirname, "dist", "handler.cjs");
  const apiDir = path.resolve(__dirname, "..", "..", "api");
  const handlerDest = path.join(apiDir, "handler-bundle.cjs");
  if (existsSync(handlerSrc)) {
    console.log("copying handler to api/handler-bundle.cjs...");
    await mkdir(apiDir, { recursive: true });
    await cp(handlerSrc, handlerDest);
    console.log("vercel handler ready.");
  }
}

buildAll()
  .then(copyFrontend)
  .then(copyVercelHandler)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
