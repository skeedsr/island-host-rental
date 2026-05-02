import path from "path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

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

app.use(cors({ origin: true, credentials: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

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
