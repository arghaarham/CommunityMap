const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const { env } = require("./config/env");
const { attachCurrentUser } = require("./middlewares/auth");
const { errorHandler, notFoundHandler } = require("./middlewares/error-handler");
const { isS3Enabled } = require("./lib/storage");
const { authRouter } = require("./modules/auth/auth.routes");
const { reportsRouter } = require("./modules/reports/reports.routes");
const { adminRouter } = require("./modules/admin/admin.routes");
const { uploadsRouter } = require("./modules/uploads/uploads.routes");
const { chatsRouter } = require("./modules/chats/chats.routes");
const { usersRouter } = require("./modules/users/users.routes");

const app = express();
const allowedOrigins = new Set(env.frontendOrigins);

app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      if (
        env.nodeEnv !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachCurrentUser);
if (!isS3Enabled()) {
  app.use("/uploads", express.static(env.uploadDir));
}

app.get("/api/health", (_req, res) => {
  res.json({
    data: {
      ok: true,
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/chats", chatsRouter);
app.use("/api/users", usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
