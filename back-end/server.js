import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./router.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim()),
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

app.listen(PORT, () => {
  console.log(`WAYFINDER / AI backend running at http://localhost:${PORT}`);
});
