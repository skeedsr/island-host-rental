import path from "path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());

// Health check must be registered before Clerk middleware so it always
// returns 200 regardless of whether Clerk keys are configured.
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Only attach Clerk middleware when keys are present (safe for deployments
// that haven't configured Clerk yet).
if (process.env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendDir = path.join(
    process.cwd(),
    "artifacts/canary-rentals/dist/public",
  );
  app.use(express.static(frontendDir));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });
} else {
  const mockupPort = process.env.MOCKUP_PORT ?? "8081";
  const vitePort = process.env.VITE_PORT ?? "22860";

  app.use(
    "/__mockup",
    createProxyMiddleware({
      target: `http://localhost:${mockupPort}`,
      changeOrigin: true,
      ws: true,
    }),
  );

  app.use(
    "/",
    createProxyMiddleware({
      target: `http://localhost:${vitePort}`,
      changeOrigin: true,
      ws: true,
    }),
  );
}

export default app;
