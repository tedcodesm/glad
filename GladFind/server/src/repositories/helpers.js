// Helpers shared by the memory and mongo repository implementations.

/** Escape user input so it can be embedded in a MongoDB `$regex` safely. */
export function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalise a query-string value that may arrive as a single value or a list,
 * e.g. `?insurance=NHIF` or `?insurance=NHIF&insurance=Jubilee%20Health`.
 */
export function toArray(value) {
  if (value == null || value === '') return [];
  return (Array.isArray(value) ? value : [value]).map((v) => String(v).trim()).filter(Boolean);
}