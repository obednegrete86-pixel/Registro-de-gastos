import { pool } from "../db/pool.js";
import { getRangeBounds } from "./dateRange.js";

function buildWhereClause(start, end) {
  if (start && end) {
    return {
      sql: "WHERE spent_at >= $1 AND spent_at <= $2",
      params: [start, end],
    };
  }
  return { sql: "", params: [] };
}

export async function createExpense({ username, expenseType, description, amount }) {
  const res = await pool.query(
    `INSERT INTO expenses (username, expense_type, description, amount)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, expense_type, description, amount, spent_at`,
    [username, expenseType, description ?? "", amount]
  );
  return res.rows[0];
}

export async function listExpensesInRange(start, end) {
  const { sql, params } = buildWhereClause(start, end);
  const res = await pool.query(
    `SELECT id, username, expense_type, description, amount, spent_at
     FROM expenses ${sql}
     ORDER BY spent_at DESC, id DESC`,
    params
  );
  return res.rows;
}

/** Totales por tipo (pastel). */
export async function sumByType(start, end) {
  const { sql, params } = buildWhereClause(start, end);
  const res = await pool.query(
    `SELECT expense_type AS type, COALESCE(SUM(amount), 0)::bigint AS total
     FROM expenses ${sql}
     GROUP BY expense_type
     ORDER BY expense_type`,
    params
  );
  return res.rows.map((r) => ({
    type: r.type,
    total: Number(r.total),
  }));
}

/** Suma global en el rango (un número). */
export async function sumTotal(start, end) {
  const { sql, params } = buildWhereClause(start, end);
  const res = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::bigint AS total FROM expenses ${sql}`,
    params
  );
  return Number(res.rows[0].total);
}

/** Gasto por día (eje X día en México). */
export async function sumByDay(start, end) {
  const { sql, params } = buildWhereClause(start, end);
  const res = await pool.query(
    `SELECT
       (timezone('America/Mexico_City', spent_at))::date AS day,
       COALESCE(SUM(amount), 0)::bigint AS total
     FROM expenses ${sql}
     GROUP BY day
     ORDER BY day`,
    params
  );
  return res.rows.map((r) => ({
    day: r.day,
    total: Number(r.total),
  }));
}

/** Por día y tipo (barras apiladas). */
export async function sumByDayAndType(start, end) {
  const { sql, params } = buildWhereClause(start, end);
  const res = await pool.query(
    `SELECT
       (timezone('America/Mexico_City', spent_at))::date AS day,
       expense_type AS type,
       COALESCE(SUM(amount), 0)::bigint AS total
     FROM expenses ${sql}
     GROUP BY day, expense_type
     ORDER BY day, expense_type`,
    params
  );
  return res.rows.map((r) => ({
    day: r.day,
    type: r.type,
    total: Number(r.total),
  }));
}

export function resolveRange(range, refIso) {
  const r = range || "global";
  return getRangeBounds(r, refIso);
}
