import { displayValue } from '../columns/cell-values';
import { HubSpreadsheetColumn, HubSpreadsheetValue } from '../models/spreadsheet.types';
import { downloadBlob } from './download';
import { parseDelimited, serialiseDelimited } from './delimited';
import { sheetValues } from './sheet-values';
import { HubSheetTable, tableToRecords } from './table-records';

/**
 * A sheet as a CSV file, and back.
 *
 * Two things decide whether a CSV is any use, and both are here rather than left to the caller.
 *
 * The **separator** is not always a comma: where the comma is the decimal mark — most of Europe —
 * a spreadsheet writes and expects semicolons, and a file written with the wrong one opens as a
 * single column of text. So it is chosen from the decimal mark when nobody says otherwise, and
 * sniffed when reading rather than assumed.
 *
 * The **values** are what the reader sees, not what the row holds: a select column exports the
 * label somebody chose, and a formula exports the number it came to. A CSV is what gets sent to
 * somebody who does not have the application, and a column of `pending` codes is of no use to
 * them. `values: 'stored'` is there for the round trip that is meant to come back.
 */

export interface HubCsvOptions {
	/** What separates the cells. Chosen from the decimal mark when not given. */
	readonly delimiter?: ',' | ';' | '\t';
	/** Whether to write the column headers as the first line. On unless turned off. */
	readonly headers?: boolean;
	/** What to write: what the cell shows, or what the row holds. */
	readonly values?: 'shown' | 'stored';
	/** How this reader writes decimals, which decides the separator and the figures. */
	readonly decimalMark?: ',' | '.';
	/** What ends a line. CRLF, because that is what a spreadsheet on Windows expects. */
	readonly newline?: '\n' | '\r\n';
	/**
	 * Whether to work the formulas out before writing. On unless turned off, and never done for
	 * `values: 'stored'`, where the formula itself is the thing worth keeping.
	 */
	readonly formulas?: boolean;
}

/** The separator to use when nobody said: a comma cannot separate what it also punctuates. */
function delimiterFor(options: HubCsvOptions): ',' | ';' | '\t' {
	return options.delimiter ?? (options.decimalMark === ',' ? ';' : ',');
}

/** A value as it goes into the file. */
function textOf<TRow>(value: HubSpreadsheetValue, column: HubSpreadsheetColumn<TRow>, options: HubCsvOptions): string {
	if (value === null) {
		return '';
	}

	if (options.values === 'stored') {
		return String(value);
	}

	const shown = displayValue(value, column);

	// A figure is written the way this reader writes figures, or a spreadsheet opening the file
	// reads 1.234,56 as text and quietly leaves the column out of every sum.
	return typeof value === 'number' && options.decimalMark === ',' ? shown.replace('.', ',') : shown;
}

/**
 * Writes a sheet as CSV.
 *
 * @param rows - The rows, as the sheet has them.
 * @param columns - The columns, which decide the order and the headers.
 * @param options - How to write it.
 * @returns The file's contents.
 */
export function sheetToCsv<TRow>(
	rows: readonly TRow[],
	columns: readonly HubSpreadsheetColumn<TRow>[],
	options: HubCsvOptions = {}
): string {
	const delimiter = delimiterFor(options);
	const lines: string[][] = [];

	if (options.headers !== false) {
		lines.push(columns.map((column) => column.header));
	}

	const values = sheetValues(rows, columns, { formulas: options.values !== 'stored' && options.formulas !== false });

	for (const line of values) {
		lines.push(line.map((value, index) => textOf(value, columns[index], options)));
	}

	return serialiseDelimited(lines, delimiter, options.newline ?? '\r\n');
}

/**
 * Which separator a file is written with.
 *
 * Counted on the first line rather than guessed from the file's name: an exporter's idea of CSV
 * and the reader's locale often disagree, and the line that holds the headers is the one that
 * shows it most clearly.
 */
export function sniffDelimiter(text: string): ',' | ';' | '\t' {
	const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
	const counts: Array<[',' | ';' | '\t', number]> = [
		[',', (firstLine.match(/,/g) ?? []).length],
		[';', (firstLine.match(/;/g) ?? []).length],
		['\t', (firstLine.match(/\t/g) ?? []).length]
	];

	return counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ',';
}

/**
 * Reads a CSV file.
 *
 * @param text - The file's contents.
 * @param options - How to read it; the separator is sniffed when not given.
 */
export function csvToTable(text: string, options: HubCsvOptions = {}): HubSheetTable {
	const rows = parseDelimited(text, options.delimiter ?? sniffDelimiter(text));

	if (options.headers === false || !rows.length) {
		return { headers: null, rows };
	}

	return { headers: rows[0], rows: rows.slice(1) };
}

/**
 * Reads a CSV file into rows keyed by column alias, matching its headers to the sheet's columns.
 *
 * @returns One record per row of the file, keyed by column alias.
 */
export function csvToRecords<TRow>(
	text: string,
	columns: readonly HubSpreadsheetColumn<TRow>[],
	options: HubCsvOptions = {}
): Array<Record<string, string>> {
	return tableToRecords(csvToTable(text, options), columns);
}

/**
 * Hands the reader a CSV file to save.
 *
 * @param filename - What to call it.
 * @param text - What goes in it.
 * @param type - Its media type.
 */
export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
	// The mark is what tells a spreadsheet the file is UTF-8. Without it an accented word opens as
	// two characters of nonsense, and the reader blames whoever exported it.
	const contents = type.startsWith('text/csv') ? '\ufeff' + text : text;

	downloadBlob(filename, new Blob([contents], { type }));
}
