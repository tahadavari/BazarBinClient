const POSTGRES_IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/

export const POSTGRES_DATA_TYPES = [
  "text",
  "varchar",
  "integer",
  "bigint",
  "numeric",
  "boolean",
  "date",
  "timestamp",
  "jsonb",
  "uuid",
] as const

export type PostgresDataType = (typeof POSTGRES_DATA_TYPES)[number]

const BOOLEAN_VALUES = new Set([
  "true",
  "false",
  "t",
  "f",
  "yes",
  "no",
  "y",
  "n",
  "1",
  "0",
])

export function sanitizeIdentifier(value: string, fallback?: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_")
  let sanitized = normalized.replace(/[^a-z0-9_]/g, "_")
  sanitized = sanitized.replace(/_+/g, "_").replace(/^_+|_+$/g, "")

  if (!sanitized && fallback) {
    return sanitizeIdentifier(fallback)
  }

  if (!sanitized) {
    sanitized = "item"
  }

  if (/^[0-9]/.test(sanitized)) {
    sanitized = `_${sanitized}`
  }

  if (sanitized.length > 63) {
    sanitized = sanitized.slice(0, 63)
  }

  return sanitized
}

export function getIdentifierError(value: string): string | null {
  if (!value) {
    return "نام نمی‌تواند خالی باشد."
  }
  if (value.length > 63) {
    return "طول نام باید کمتر از ۶۳ کاراکتر باشد."
  }
  if (!POSTGRES_IDENTIFIER_PATTERN.test(value)) {
    return "نام باید با حرف یا آندرلاین شروع شود و تنها شامل حروف کوچک انگلیسی، آندرلاین و اعداد باشد."
  }
  return null
}

export function inferPostgresType(samples: string[]): PostgresDataType {
  const cleanedSamples = samples
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, 25)

  if (!cleanedSamples.length) {
    return "text"
  }

  if (cleanedSamples.every(looksLikeBoolean)) {
    return "boolean"
  }

  if (cleanedSamples.every(looksLikeInteger)) {
    const maxAbsolute = Math.max(
      ...cleanedSamples.map((value) => Math.abs(parseInt(value, 10)))
    )
    return maxAbsolute > 2147483647 ? "bigint" : "integer"
  }

  if (cleanedSamples.every(looksLikeNumeric)) {
    return "numeric"
  }

  if (cleanedSamples.every(looksLikeTimestamp)) {
    return "timestamp"
  }

  if (cleanedSamples.every(looksLikeDate)) {
    return "date"
  }

  if (cleanedSamples.every(looksLikeUuid)) {
    return "uuid"
  }

  if (cleanedSamples.every(looksLikeJson)) {
    return "jsonb"
  }

  if (cleanedSamples.every((value) => value.length <= 255)) {
    return "varchar"
  }

  return "text"
}

function looksLikeBoolean(value: string): boolean {
  return BOOLEAN_VALUES.has(value.toLowerCase())
}

function looksLikeInteger(value: string): boolean {
  return /^[+-]?\d+$/.test(value)
}

function looksLikeNumeric(value: string): boolean {
  return /^[+-]?(\d+\.?\d*|\d*\.\d+)$/.test(value)
}

function looksLikeTimestamp(value: string): boolean {
  return /^(\d{4}-\d{2}-\d{2})([ T]\d{2}:\d{2}(:\d{2})?(\.\d{1,6})?)?$/.test(value)
}

function looksLikeDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || !/[\[{]/.test(trimmed[0])) {
    return false
  }

  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === "object" && parsed !== null
  } catch (error) {
    return false
  }
}

