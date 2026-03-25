import { DateTime } from "luxon";

const TZ = "America/Mexico_City";

/**
 * @param {string} range 'global' | 'week' | 'quincena1' | 'quincena2' | 'month'
 * @param {string} [refIso] Fecha de referencia YYYY-MM-DD (día en zona México)
 * @returns {{ start: Date | null, end: Date | null }}
 */
export function getRangeBounds(range, refIso) {
  if (range === "global") {
    return { start: null, end: null };
  }

  const ref = refIso
    ? DateTime.fromISO(refIso, { zone: TZ }).startOf("day")
    : DateTime.now().setZone(TZ).startOf("day");

  if (!ref.isValid) {
    throw new Error("Fecha de referencia inválida");
  }

  switch (range) {
    case "week": {
      const start = ref.startOf("week"); // lunes
      const end = ref.endOf("week"); // domingo 23:59:59.999
      return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
    }
    case "month": {
      const start = ref.startOf("month");
      const end = ref.endOf("month");
      return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
    }
    case "quincena1": {
      const start = ref.set({ day: 1 }).startOf("day");
      const end = ref.set({ day: 15 }).endOf("day");
      return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
    }
    case "quincena2": {
      const start = ref.set({ day: 16 }).startOf("day");
      const end = ref.endOf("month");
      return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
    }
    default:
      throw new Error("Rango no válido");
  }
}
