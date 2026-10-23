// The database uses snake_case columns; the pages use camelCase fields.
// Conversion happens here so the rest of the app never sees column names.

const camel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
const snake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

export function toCamel(row) {
  if (Array.isArray(row)) return row.map(toCamel)
  if (row === null || typeof row !== 'object') return row
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [camel(k), toCamel(v)]))
}

// Shallow on purpose: values are columns, and array/json values must pass through untouched
export function toSnake(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [snake(k), v]),
  )
}

// Resolve a supabase-js response, throwing on error so React Query sees a failure
export function unwrap({ data, error }) {
  if (error) throw error
  return toCamel(data)
}
