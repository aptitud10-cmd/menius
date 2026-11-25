/**
 * One CSV cell, safe to open in Excel / Google Sheets.
 *
 * Text that starts with = + - @ (or tab / carriage return) is run as a formula
 * when the file is opened. Customer names, notes and addresses come from the
 * public checkout, so a name like `=HYPERLINK("http://…")` would become a live
 * link in the owner's spreadsheet. Those cells get a leading apostrophe
 * (OWASP "CSV injection"). Plain numbers and phone numbers (+1 555 …, -12.50)
 * are left as they are.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
const NUMERIC_LIKE = /^[+-]?[\d\s().,-]*\d[\d\s().,-]*$/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (typeof value === 'string' && FORMULA_START.test(str) && !NUMERIC_LIKE.test(str)) {
    str = `'${str}`;
  }
  return /[",\n\r]/.test(str) || str !== str.trim() ? `"${str.replace(/"/g, '""')}"` : str;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}
