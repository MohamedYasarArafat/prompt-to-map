import express from "express";
import cors from "cors";
import router from "./router.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json({ limit: "12mb" }));

app.use("/api", router);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "WAYFINDER / AI backend is running",
  });
});

export default app;
