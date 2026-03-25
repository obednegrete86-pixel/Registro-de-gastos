import { Router } from "express";
import { EXPENSE_TYPES, isValidExpenseType } from "../config/expenseTypes.js";
import {
  createExpense,
  listExpensesInRange,
  resolveRange,
  sumByDay,
  sumByDayAndType,
  sumByType,
  sumTotal,
} from "../services/expensesService.js";
import { buildExpensesWorkbook } from "../services/excelExport.js";

const router = Router();

router.get("/types", (_req, res) => {
  res.json({ types: EXPENSE_TYPES });
});

router.post("/", async (req, res) => {
  try {
    const { expenseType, description, amount } = req.body ?? {};
    if (!isValidExpenseType(expenseType)) {
      return res.status(400).json({ error: "Tipo de gasto no válido" });
    }
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 0) {
      return res.status(400).json({ error: "La cantidad debe ser un entero mayor o igual a 0" });
    }
    const row = await createExpense({
      username: req.session.username,
      expenseType,
      description: String(description ?? "").trim(),
      amount: n,
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el gasto" });
  }
});

function parseRangeQuery(req) {
  const range = String(req.query.range || "global");
  const ref = req.query.ref ? String(req.query.ref) : undefined;
  const allowed = ["global", "week", "quincena1", "quincena2", "month"];
  if (!allowed.includes(range)) {
    throw new Error("Rango inválido");
  }
  const { start, end } = resolveRange(range, ref);
  return { range, ref, start, end };
}

router.get("/summary", async (req, res) => {
  try {
    const { start, end } = parseRangeQuery(req);
    const [byType, total, byDay, byDayType] = await Promise.all([
      sumByType(start, end),
      sumTotal(start, end),
      sumByDay(start, end),
      sumByDayAndType(start, end),
    ]);
    res.json({ byType, total, byDay, byDayType });
  } catch (e) {
    res.status(400).json({ error: e.message || "Solicitud inválida" });
  }
});

router.get("/export.xlsx", async (req, res) => {
  try {
    const { start, end } = parseRangeQuery(req);
    const rows = await listExpensesInRange(start, end);
    const buffer = await buildExpensesWorkbook(rows);
    const filename = `gastos_${req.query.range || "global"}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    res.status(400).json({ error: e.message || "Solicitud inválida" });
  }
});

export default router;
