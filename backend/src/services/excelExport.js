import ExcelJS from "exceljs";
import { DateTime } from "luxon";

const TZ = "America/Mexico_City";

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatDayLabelFromIso(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return String(isoDate);
  return `${String(d).padStart(2, "0")}-${MONTHS[m - 1]}`;
}

function mexicoDayKey(spentAt) {
  const dt = DateTime.fromJSDate(
    spentAt instanceof Date ? spentAt : new Date(spentAt),
    { zone: "utc" }
  ).setZone(TZ);
  return dt.toISODate();
}

/**
 * @param {Array<{ id, username, expense_type, description, amount, spent_at }>} rows
 */
export async function buildExpensesWorkbook(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Gastos");

  sheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Usuario", key: "username", width: 12 },
    { header: "Tipo", key: "expense_type", width: 18 },
    { header: "Qué se compró", key: "description", width: 40 },
    { header: "Monto", key: "amount", width: 12 },
    { header: "Fecha (UTC)", key: "spent_at", width: 22 },
  ];

  for (const row of rows) {
    sheet.addRow({
      id: row.id,
      username: row.username,
      expense_type: row.expense_type,
      description: row.description,
      amount: row.amount,
      spent_at: row.spent_at instanceof Date ? row.spent_at.toISOString() : row.spent_at,
    });
  }

  const summary = workbook.addWorksheet("Resumen por tipo");
  summary.columns = [
    { header: "Tipo", key: "type", width: 20 },
    { header: "Total", key: "total", width: 14 },
  ];

  const byType = new Map();
  for (const row of rows) {
    const t = row.expense_type;
    byType.set(t, (byType.get(t) || 0) + Number(row.amount));
  }
  for (const [type, total] of [...byType.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    summary.addRow({ type, total });
  }

  const daily = workbook.addWorksheet("Por día");
  daily.columns = [
    { header: "Día", key: "dayLabel", width: 12 },
    { header: "Total", key: "total", width: 14 },
  ];

  const byDay = new Map();
  for (const row of rows) {
    const key = mexicoDayKey(row.spent_at);
    if (!key) continue;
    byDay.set(key, (byDay.get(key) || 0) + Number(row.amount));
  }
  const sortedDays = [...byDay.keys()].sort();
  for (const key of sortedDays) {
    daily.addRow({
      dayLabel: formatDayLabelFromIso(key),
      total: byDay.get(key),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
