/**
 * Creado y diseñado por XO
 * XLayout System — Parser Unificado de Importaciones
 *
 * Detecta el formato del archivo (CSV o XLSX) y devuelve un array
 * normalizado de registros con headers en lowercase/snake_case.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

// Resultado del parseo
export interface ParseResult {
  records: Record<string, string>[];
  format: 'csv' | 'xlsx';
  headers: string[];
  totalRows: number;
}

/**
 * Normaliza un header a snake_case minúscula.
 * Ej: "Price A" → "price_a", "BaseSKU" → "base_sku"
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase → snake_case
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Elimina BOM (Byte Order Mark) de un string si está presente.
 */
function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

/**
 * Parsea un archivo CSV desde su contenido en texto.
 */
function parseCSV(content: string): ParseResult {
  const clean = stripBom(content);

  const records: Record<string, string>[] = parse(clean, {
    columns: (rawHeaders: string[]) => rawHeaders.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  // Extraer headers normalizados de la primera fila
  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  return {
    records,
    format: 'csv',
    headers,
    totalRows: records.length,
  };
}

/**
 * Parsea un archivo XLSX (primera hoja).
 */
function parseXLSX(filePath: string): ParseResult {
  const workbook = XLSX.readFile(filePath, { type: 'file' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const sheet = workbook.Sheets[sheetName];
  // Convertir a JSON con headers en la primera fila
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false, // Forzar string para consistencia
  });

  // Normalizar headers
  const records = rawRows.map((row) => {
    const normalizedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const normKey = normalizeHeader(key);
      normalizedRow[normKey] = String(value ?? '').trim();
    }
    return normalizedRow;
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  return {
    records,
    format: 'xlsx',
    headers,
    totalRows: records.length,
  };
}

/**
 * Punto de entrada principal: parsea un archivo según su extensión.
 * Acepta ruta absoluta al archivo en disco.
 */
export function parseImportFile(filePath: string): ParseResult {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf8');
    return parseCSV(content);
  }

  if (ext === '.xlsx' || ext === '.xls') {
    return parseXLSX(filePath);
  }

  throw new Error(`Formato de archivo no soportado: '${ext}'. Use CSV o XLSX.`);
}

/**
 * Parsea contenido directo (para archivos descargados por HTTP).
 * Siempre asume CSV.
 */
export function parseCSVContent(content: string): ParseResult {
  return parseCSV(content);
}
