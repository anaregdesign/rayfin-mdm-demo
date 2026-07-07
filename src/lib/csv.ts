/**
 * Tiny dependency-free CSV codec (RFC 4180-ish) shared by the bulk
 * import/export use cases. Pure string ⇄ matrix — no DOM, no SDK.
 *
 * - Fields may be quoted with double quotes; embedded quotes are escaped by
 *   doubling (`""`).
 * - Quoted fields may contain commas and CR/LF line breaks.
 * - Both `\n` and `\r\n` line endings are accepted on parse.
 * - A trailing newline does not produce an extra empty record.
 */

/** Parse CSV text into a matrix of rows × cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let sawAny = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = '';
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    sawAny = true;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else {
      field += ch;
    }
  }

  // Flush the final field/row unless the input ended exactly on a newline.
  if (field.length > 0 || row.length > 0) {
    endRow();
  } else if (!sawAny) {
    // empty input → no rows
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** Serialize a matrix of rows × cells into CSV text (LF-terminated lines). */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

function escapeCell(value: string): string {
  const needsQuote = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/**
 * Zip a parsed matrix into header-keyed records. The first row is the header;
 * each subsequent row becomes `{ [header]: cell }`. Ragged rows are padded
 * with empty strings so every record has every declared column.
 */
export function recordsFromMatrix(matrix: string[][]): {
  headers: string[];
  records: Record<string, string>[];
} {
  if (matrix.length === 0) return { headers: [], records: [] };
  const headers = matrix[0].map((h) => h.trim());
  const records = matrix.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? '').trim();
    });
    return record;
  });
  return { headers, records };
}
