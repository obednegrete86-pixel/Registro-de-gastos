import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool } from "./pool.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "schema.sql");

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  console.log("Esquema aplicado correctamente.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
