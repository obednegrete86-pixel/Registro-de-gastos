import dotenv from "dotenv";
import { pool } from "../src/db/pool.js";

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en backend/.env");
    process.exit(1);
  }
  try {
    const r = await pool.query("SELECT 1 AS ok");
    console.log("Base de datos: OK", r.rows[0]);
  } catch (e) {
    console.error("No se pudo conectar a PostgreSQL.");
    console.error(e?.message || e);
    console.error(
      "\n¿Tienes la base en marcha? Ejemplo: abre Docker Desktop y en la raíz del proyecto ejecuta: docker compose up -d"
    );
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
