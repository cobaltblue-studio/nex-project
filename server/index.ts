import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { apiMsg } from "./api-i18n";
import { canonicalHostRedirect } from "./canonicalHost";
import { registerNexFaviconRoutes } from "./favicon";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const isProductionBoot = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: false, // SPA + third-party players; tighten later
    crossOriginEmbedderPolicy: false,
    // Helmet default is no-referrer; YouTube embeds then fail with error 150/153
    // ("video player configuration error"). Send origin on cross-origin loads.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProductionBoot ? { maxAge: 15552000, includeSubDomains: true } : false,
  }),
);

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Please try again later." },
});
const resolveLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many resolve requests. Please try again later." },
});
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many writes. Please try again later." },
});
app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/login", authLimiter);
app.use("/api/suno/resolve", resolveLimiter);
app.use("/api/soundcloud/resolve", resolveLimiter);
app.use("/api/analytics/event", writeLimiter);
app.use("/api/boost/increment-impression", writeLimiter);
app.use((req, res, next) => {
  if (req.method === "POST" && /\/api\/tracks\/[^/]+\/claim-instant\/?$/.test(req.path)) {
    return writeLimiter(req, res, next);
  }
  next();
});

/** Must run before static — blocks legacy Replit /favicon.ico in dist. */
registerNexFaviconRoutes(app);

/** Railway default host → nexmusic.ai (see server/canonicalHost.ts). */
app.use(canonicalHostRedirect);

/** Split-dev safe defaults (5001/5002/5173) + optional CORS_ORIGINS override entries. */
const defaultCorsOrigins = [
  "http://localhost:5001",
  "http://localhost:5002",
  "http://localhost:5173",
  "http://127.0.0.1:5001",
  "http://127.0.0.1:5002",
  "http://127.0.0.1:5173",
  "https://nexmusic.ai",
  "https://www.nexmusic.ai",
];
const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowList = new Set([...defaultCorsOrigins, ...configuredOrigins]);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowList.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const isProduction = process.env.NODE_ENV === "production";

/** Set true after DB + routes + static are ready (see boot sequence below). */
let appReady = false;

/** Railway/Neon: respond 200 while DB wakes so the container is not killed mid-connect. */
app.get("/api/health", (_req, res) => {
  const emailEnabled = Boolean(process.env.RESEND_API_KEY?.trim());
  res.status(200).json({
    ok: true,
    ready: appReady,
    build: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || process.env.BUILD_ID || "local",
    email: { enabled: emailEnabled },
  });
});

app.use((req, res, next) => {
  if (!appReady && req.path.startsWith("/api") && req.path !== "/api/health") {
    res.status(503).json({
      message: "Server is starting. Please retry in a few seconds.",
      ready: false,
    });
    return;
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown = undefined;

  const originalJson = res.json.bind(res);
  res.json = function (bodyJson: unknown, ...args: unknown[]) {
    capturedJsonResponse = bodyJson;
    return originalJson(bodyJson as Parameters<typeof res.json>[0], ...(args as []));
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (!isProduction && capturedJsonResponse !== undefined) {
        try {
          const s = JSON.stringify(capturedJsonResponse);
          logLine += ` :: ${s.length > 800 ? `${s.slice(0, 800)}…` : s}`;
        } catch {
          logLine += " :: [unserializable body]";
        }
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const port = parseInt(process.env.PORT || "5001", 10);

  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`listening on port ${port} (warming up…)`);
    },
  );

  const { ensureDbConnected } = await import("./db");
  const { storage } = await import("./storage");
  console.log("[boot] connecting to database…");
  await ensureDbConnected();
  console.log("[boot] database OK");
  const { isEmailEnabled } = await import("./email");
  console.log(`[boot] transactional email: ${isEmailEnabled() ? "enabled (Resend)" : "off (set RESEND_API_KEY)"}`);
  await registerRoutes(httpServer, app);

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const e = err as { status?: number; statusCode?: number; message?: string };
    const status = e.status || e.statusCode || 500;
    const rawMessage = typeof e.message === "string" ? e.message : "Internal Server Error";

    if (isProduction) {
      console.error("[server error]", status, rawMessage);
    } else {
      console.error("Internal Server Error:", err);
    }

    if (res.headersSent) {
      return next(err);
    }

    const leakPattern =
      /relation |sql|postgres|drizzle|violates|syntax error|ECONNREFUSED|TypeError|ReferenceError/i;
    let clientMessage = rawMessage;
    if (isProduction) {
      if (status >= 500) {
        clientMessage = apiMsg(
          "문제가 발생했습니다. 잠시 후 다시 시도해 주세요",
          "Something went wrong. Please try again later.",
        );
      } else if (leakPattern.test(rawMessage)) {
        clientMessage = apiMsg("요청을 완료할 수 없습니다", "Request could not be completed.");
      }
    }

    return res.status(status).json({ message: clientMessage });
  });

  // API routes must be registered before the SPA catch-all (serveStatic / Vite).
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  appReady = true;
  log(`ready on port ${port}`);

  // Do not block accepting traffic: full-table recalc can take a long time.
  void storage
    .reconcileChartPromotions()
    .then((n) => console.log(`[boot] chart promotions reconciled (${n} promoted)`))
    .catch((err) => console.error("[boot] reconcileChartPromotions failed:", err));
  void storage
    .recalculateAllRankingScores()
    .then(() => console.log("[boot] ranking scores recalculated"))
    .catch((err) => console.error("[boot] recalculateAllRankingScores failed:", err));

  const { startDailySnapshotScheduler } = await import("./dailySnapshot");
  startDailySnapshotScheduler(storage);
  if (isEmailEnabled()) {
    const { startAnnouncementCampaignWorker } = await import("./announcementCampaigns");
    startAnnouncementCampaignWorker();
    const { startPublicTrackPlaybackAudit } = await import("./playbackAudit");
    startPublicTrackPlaybackAudit(storage);
  }
})().catch((err) => {
  console.error("[boot] fatal:", err);
  process.exit(1);
});
