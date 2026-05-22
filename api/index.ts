import type { IncomingMessage, ServerResponse } from "http";

// Import the pre-bundled Express app (built by `pnpm --filter @workspace/api-server run build`)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bundle = require("./handler-bundle.cjs");
const app: (req: IncomingMessage, res: ServerResponse) => void =
  typeof bundle.default === "function" ? bundle.default : bundle;

export default app;
