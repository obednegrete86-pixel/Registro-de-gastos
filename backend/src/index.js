import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import { pool } from "./db/pool.js";
import authRoutes from "./routes/auth.js";
import expensesRoutes from "./routes/expenses.js";
import { requireAuth } from "./middleware/requireAuth.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;
/** En Render, RENDER_EXTERNAL_URL es la URL pública del servicio (HTTPS). */
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "http://localhost:5173";

/** Orígenes permitidos (dev: localhost y 127.0.0.1; prod: URL pública). */
const allowedOrigins = [
  FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    name: "rg.sid",
    secret: process.env.SESSION_SECRET || "dev-secret-cambiar",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/expenses", requireAuth, expensesRoutes);

const frontendDist = path.join(__dirname, "../../frontend/dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

async function ensureSchema() {
  const schemaPath = path.join(__dirname, "db/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}

async function start() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`API en http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("No se pudo iniciar:", e);
    process.exit(1);
  }
}

start();
