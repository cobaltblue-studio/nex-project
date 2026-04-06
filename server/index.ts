import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { apiMsg } from "./api-i18n";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();

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
  const { ensureDbConnected } = await import("./db");
  const { storage } = await import("./storage");
  console.log("[boot] connecting to database…");
  await ensureDbConnected();
  console.log("[boot] database OK");
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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Serve both API and client on one app port in development.
  const port = parseInt(process.env.PORT || "5001", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      // Do not block accepting traffic: full-table recalc can take a long time.
      void storage
        .recalculateAllRankingScores()
        .then(() => console.log("[boot] ranking scores recalculated"))
        .catch((err) => console.error("[boot] recalculateAllRankingScores failed:", err));
    },
  );
})();
