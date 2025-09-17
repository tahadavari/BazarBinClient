const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"] as const

export type CsvDelimiter = (typeof CANDIDATE_DELIMITERS)[number]

export interface ParseCsvOptions {
  maxRows?: number
}

export interface ParseCsvResult {
  rows: string[][]
  delimiter: string
}

export function parseCsv(content: string, options: ParseCsvOptions = {}): ParseCsvResult {
  const maxRows = options.maxRows ?? 500
  const normalized = content.replace(/\r\n?/g, "\n")
  const delimiter = detectDelimiter(normalized)
  const rows: string[][] = []

  let currentField = ""
  let currentRow: string[] = []
  let insideQuotes = false

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    const nextChar = normalized[index + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    const isDelimiter = char === delimiter
    const isNewLine = char === "\n"

    if (!insideQuotes && (isDelimiter || isNewLine)) {
      currentRow.push(currentField)
      currentField = ""

      if (isNewLine) {
        rows.push(currentRow)
        currentRow = []
        if (rows.length >= maxRows) {
          break
        }
      }
      continue
    }

    currentField += char
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
  }
  if (currentRow.length) {
    rows.push(currentRow)
  }

  return {
    rows: trimTrailingEmptyRows(rows),
    delimiter,
  }
}

function detectDelimiter(content: string): string {
  const sample = content.split("\n").slice(0, 10)
  let bestDelimiter: string = ","
  let bestScore = -1

  for (const candidate of CANDIDATE_DELIMITERS) {
    const score = sample.reduce((accumulator, line) => {
      if (!line) return accumulator
      return accumulator + line.split(candidate).length
    }, 0)

    if (score > bestScore) {
      bestDelimiter = candidate
      bestScore = score
    }
  }

  return bestDelimiter
}

function trimTrailingEmptyRows(rows: string[][]): string[][] {
  let end = rows.length - 1
  while (end >= 0) {
    const row = rows[end]
    const hasValue = row.some((cell) => cell.trim().length > 0)
    if (hasValue) {
      break
    }
    end -= 1
  }

  return rows.slice(0, end + 1)
}
