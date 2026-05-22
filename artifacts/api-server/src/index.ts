process.on("warning", (w) => {
  if (w.message?.includes("SSL") || w.message?.includes("sslmode") || w.message?.includes("libpq")) return;
  console.warn(w);
});

import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
