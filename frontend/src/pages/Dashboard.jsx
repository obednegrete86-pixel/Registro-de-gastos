import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch, parseJson } from "../api/client.js";

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

const RANGE_OPTIONS = [
  { value: "week", label: "Semana (lun–dom)" },
  { value: "quincena1", label: "Quincena 1 (día 1–15)" },
  { value: "quincena2", label: "Quincena 2 (día 16–fin)" },
  { value: "month", label: "Mes completo" },
  { value: "global", label: "Total global" },
];

/** Paleta clara tipo iOS (accesible sobre fondo blanco) */
const CHART_COLORS = [
  "#007aff",
  "#34c759",
  "#ff9500",
  "#af52de",
  "#ff2d55",
  "#5ac8fa",
  "#ffcc00",
  "#8e8e93",
  "#30b0c7",
];

const chartTooltipStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.96)",
  border: "1px solid #e5e5ea",
  borderRadius: 12,
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
  color: "#1c1c1e",
  fontSize: 13,
};

const axisTick = { fill: "#8e8e93", fontSize: 11 };

function dayKeyToLabel(day) {
  if (!day) return "";
  const s = typeof day === "string" ? day : String(day);
  const part = s.includes("T") ? s.slice(0, 10) : s.slice(0, 10);
  const [y, m, d] = part.split("-").map(Number);
  if (!y || !m || !d) return s;
  return `${String(d).padStart(2, "0")}-${MONTHS[m - 1]}`;
}

function todayIsoLocal() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function Dashboard({ username, onLogout }) {
  const [types, setTypes] = useState([]);
  const [range, setRange] = useState("week");
  const [refDate, setRefDate] = useState(todayIsoLocal);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [form, setForm] = useState({
    expenseType: "",
    description: "",
    amount: "",
  });
  const [formMsg, setFormMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTypes = useCallback(async () => {
    const res = await apiFetch("/api/expenses/types");
    const data = await parseJson(res);
    if (res.ok && data?.types?.length) {
      setTypes(data.types);
      setForm((f) => ({ ...f, expenseType: f.expenseType || data.types[0] }));
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryError("");
    const qs = new URLSearchParams({ range });
    if (range !== "global") qs.set("ref", refDate);
    const res = await apiFetch(`/api/expenses/summary?${qs}`);
    const data = await parseJson(res);
    if (!res.ok) {
      setSummary(null);
      setSummaryError(data?.error || "No se pudieron cargar los datos");
      return;
    }
    setSummary(data);
  }, [range, refDate]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const pieData = useMemo(() => {
    if (!summary?.byType?.length) return [];
    return summary.byType.filter((r) => r.total > 0);
  }, [summary]);

  const barDaily = useMemo(() => {
    if (!summary?.byDay?.length) return [];
    return summary.byDay.map((r) => ({
      dayLabel: dayKeyToLabel(r.day),
      total: r.total,
      sortKey: typeof r.day === "string" ? r.day.slice(0, 10) : String(r.day),
    }));
  }, [summary]);

  const stackedData = useMemo(() => {
    if (!summary?.byDayType?.length) return [];
    const typeSet = new Set(summary.byDayType.map((x) => x.type));
    const typesOrder = [...typeSet];
    const byDay = new Map();
    for (const row of summary.byDayType) {
      const key =
        typeof row.day === "string" ? row.day.slice(0, 10) : String(row.day).slice(0, 10);
      if (!byDay.has(key)) {
        byDay.set(key, { dayLabel: dayKeyToLabel(row.day), sortKey: key });
        for (const t of typesOrder) byDay.get(key)[t] = 0;
      }
      byDay.get(key)[row.type] = row.total;
    }
    return [...byDay.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [summary]);

  const stackedTypes = useMemo(() => {
    if (!summary?.byDayType?.length) return [];
    return [...new Set(summary.byDayType.map((x) => x.type))];
  }, [summary]);

  async function handleAddExpense(e) {
    e.preventDefault();
    setFormMsg("");
    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount < 0) {
      setFormMsg("La cantidad debe ser un número entero (sin decimales).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          expenseType: form.expenseType,
          description: form.description,
          amount,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        setFormMsg(data?.error || "No se pudo guardar");
        return;
      }
      setForm((f) => ({ ...f, description: "", amount: "" }));
      setFormMsg("Gasto guardado.");
      await loadSummary();
    } catch {
      setFormMsg("Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    const qs = new URLSearchParams({ range });
    if (range !== "global") qs.set("ref", refDate);
    const res = await apiFetch(`/api/expenses/export.xlsx?${qs}`);
    if (!res.ok) {
      const data = await parseJson(res);
      alert(data?.error || "No se pudo descargar");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastos_${range}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <div className="layout">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h1>Hola, {username}</h1>
          <p className="sub" style={{ margin: 0 }}>
            Registro de gastos
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Salir
        </button>
      </header>

      <div className="card">
        <h2 className="chart-title" style={{ color: "var(--text)", marginTop: 0 }}>
          Añadir gasto
        </h2>
        <form onSubmit={handleAddExpense}>
          <div className="field">
            <label htmlFor="tipo">Tipo de gasto</label>
            <select
              id="tipo"
              value={form.expenseType}
              onChange={(e) => setForm((f) => ({ ...f, expenseType: e.target.value }))}
              required
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="desc">¿Qué se compró?</label>
            <textarea
              id="desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripción breve"
            />
          </div>
          <div className="field">
            <label htmlFor="monto">Cantidad (entero, sin decimales)</label>
            <input
              id="monto"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          {formMsg ? (
            <p className={formMsg.includes("Error") || formMsg.includes("No se") ? "error" : "sub"}>
              {formMsg}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : "Añadir gasto"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="chart-title" style={{ color: "var(--text)", marginTop: 0 }}>
          Periodo para gráficas y Excel
        </h2>
        <div className="field">
          <label htmlFor="range">Vista</label>
          <select
            id="range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {range !== "global" ? (
          <div className="field">
            <label htmlFor="ref">Fecha de referencia</label>
            <input
              id="ref"
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
            />
            <p className="sub" style={{ marginTop: "0.35rem", fontSize: "0.8rem" }}>
              La semana/quincena/mes se calcula según esta fecha (zona México).
            </p>
          </div>
        ) : null}
        <p style={{ margin: "0.5rem 0", fontWeight: 600 }}>
          Total en este periodo:{" "}
          {summary ? `$${Number(summary.total).toLocaleString("es-MX")}` : "…"}
        </p>
        {summaryError ? <p className="error">{summaryError}</p> : null}
        <button type="button" className="btn btn-ghost" onClick={handleExport}>
          Descargar Excel
        </button>
      </div>

      <div className="charts">
        <div className="card">
          <h3 className="chart-title">Gastos por tipo (pastel)</h3>
          {pieData.length === 0 ? (
            <p className="sub">No hay datos en este periodo.</p>
          ) : (
            <div style={{ width: "100%", height: 280, padding: "4px 0" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    stroke="#ffffff"
                    strokeWidth={2}
                    label={({ type, percent }) =>
                      `${type} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "#c6c6c8" }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => `$${Number(v).toLocaleString("es-MX")}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="chart-title">Gasto por día (barras)</h3>
          {barDaily.length === 0 ? (
            <p className="sub">No hay datos en este periodo.</p>
          ) : (
            <div style={{ width: "100%", height: 280, padding: "4px 0" }}>
              <ResponsiveContainer>
                <BarChart data={barDaily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={axisTick} axisLine={{ stroke: "#e5e5ea" }} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => `$${Number(v).toLocaleString("es-MX")}`}
                  />
                  <Bar dataKey="total" fill="#007aff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="chart-title">Por día y tipo (barras apiladas)</h3>
          {stackedData.length === 0 ? (
            <p className="sub">No hay datos en este periodo.</p>
          ) : (
            <div style={{ width: "100%", height: 320, padding: "4px 0" }}>
              <ResponsiveContainer>
                <BarChart data={stackedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={{ ...axisTick, fontSize: 10 }} axisLine={{ stroke: "#e5e5ea" }} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => `$${Number(v).toLocaleString("es-MX")}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#8e8e93", paddingTop: 8 }}
                  />
                  {stackedTypes.map((t, i) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="a"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <p className="pwa-hint">
        Para instalar: Android/Chrome menú → Instalar app. iPhone: Compartir → Agregar a
        inicio. La app necesita HTTPS (Render lo cumple).
      </p>
    </div>
  );
}
