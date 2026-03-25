/** Opciones de "Tipo de gasto" (misma lista en front y back). */
export const EXPENSE_TYPES = [
  "Despensa",
  "Escuela",
  "servicios",
  "ropa",
  "diezmo",
  "ofrenda",
  "gasto hormiga",
  "Medicinas",
  "pago prestamo",
];

export function isValidExpenseType(value) {
  return typeof value === "string" && EXPENSE_TYPES.includes(value);
}
