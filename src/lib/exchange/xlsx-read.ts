import { HubSpreadsheetColumn } from '../models/spreadsheet.types';
import { HubSheetTable, tableToRecords } from './table-records';
import { unzip } from './unzip';

/**
 * Reading an xlsx workbook.
 *
 * Only what a sheet of data needs: the first worksheet's cells, as text, with the headers if it has
 * them. Not the charts, not the pictures, not the pivot tables — a file with those in it still
 * reads, they are simply parts nobody opens here.
 *
 * Two things a workbook does that a CSV does not, and both have to be undone or the import is
 * wrong. A **shared string** is written once and pointed at from every cell that holds it, so a
 * column of the same word arrives as a column of numbers unless the table is read. And a **date**
 * is a count of days wearing a number format, so it arrives as `45306` unless the styles are read
 * to know which columns were dates.
 *
 * The XML is read with patterns rather than a parser. It is the part of this file to be suspicious
 * of, and it is a deliberate choice: these parts are machine-written, their shape is fixed by the
 * format, and `DOMParser` does not exist where the tests run. What it means in practice is that
 * anything beyond these few elements is not understood — and a workbook is not a document to be
 * edited here, only a file to be read once.
 */

/** How a workbook is read. */
export interface HubXlsxReadOptions {
	/** Whether the first row holds the headers. On unless turned off. */
	readonly headers?: boolean;
	/** Which sheet to read, by name. The first one when not given. */
	readonly sheetName?: string;
}

/** Number formats that mean a date, as the format numbers them. */
const DATE_FORMAT_IDS = new Set([
	14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58
]);

/** What Excel counts its days from. */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

const decoder = new TextDecoder();

/** Undoes the five escapes XML writes, which is all these parts contain. */
function unescapeXml(value: string): string {
	return value
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&amp;/g, '&');
}

/** A column letter back to its place: A is 0, AA is 26. */
function columnAt(reference: string): number {
	const letters = /^([A-Z]+)/.exec(reference)?.[1] ?? 'A';
	let index = 0;

	for (const letter of letters) {
		index = index * 26 + (letter.charCodeAt(0) - 64);
	}

	return index - 1;
}

/** Every `<si>` of the shared-string table, in order, runs of formatting joined back together. */
function sharedStrings(xml: string | undefined): string[] {
	if (!xml) {
		return [];
	}

	return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((item) =>
		[...item[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((piece) => unescapeXml(piece[1])).join('')
	);
}

/** Which style slots mean a date, worked out from the number format each one points at. */
function dateStyles(xml: string | undefined): Set<number> {
	const dates = new Set<number>();

	if (!xml) {
		return dates;
	}

	const custom = new Map<number, string>();

	for (const format of xml.matchAll(/<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
		custom.set(Number(format[1]), unescapeXml(format[2]));
	}

	const cellXfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? '';

	[...cellXfs.matchAll(/<xf[^>]*\/?>/g)].forEach((slot, index) => {
		const id = Number(/numFmtId="(\d+)"/.exec(slot[0])?.[1] ?? 0);

		if (DATE_FORMAT_IDS.has(id)) {
			dates.add(index);

			return;
		}

		// A custom format is a date when it says so: day, month or year outside quoted text. The
		// stripping matters — `"day "0` is a label, not a date.
		const code = custom.get(id);

		if (code && /[ymd]/i.test(code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, ''))) {
			dates.add(index);
		}
	});

	return dates;
}

/** A day count as an ISO date, which is what a date column of this sheet holds. */
function isoDate(serial: number): string {
	return new Date(EXCEL_EPOCH + Math.round(serial) * 86_400_000).toISOString().slice(0, 10);
}

/** Which worksheet part to read, following the workbook's own list rather than guessing at a name. */
function worksheetPath(files: Map<string, Uint8Array>, sheetName: string | undefined): string | undefined {
	const workbook = files.has('xl/workbook.xml') ? decoder.decode(files.get('xl/workbook.xml')) : '';
	const rels = files.has('xl/_rels/workbook.xml.rels') ? decoder.decode(files.get('xl/_rels/workbook.xml.rels')) : '';
	const sheets = [...workbook.matchAll(/<sheet\s[^>]*\/?>/g)].map((sheet) => ({
		name: unescapeXml(/name="([^"]*)"/.exec(sheet[0])?.[1] ?? ''),
		rel: /r:id="([^"]*)"/.exec(sheet[0])?.[1] ?? ''
	}));

	const wanted = sheetName ? sheets.find((sheet) => sheet.name === sheetName) : sheets[0];
	const target = wanted ? new RegExp(`<Relationship[^>]*Id="${wanted.rel}"[^>]*Target="([^"]*)"`).exec(rels)?.[1] : undefined;

	if (target) {
		const path = target.replace(/^\/?xl\//, '').replace(/^\//, '');

		if (files.has(`xl/${path}`)) {
			return `xl/${path}`;
		}
	}

	// A workbook whose relationships could not be followed still has its sheets where everyone
	// puts them. Better to read the file than to refuse it over a part nobody will ever look at.
	return [...files.keys()].find((path) => path.startsWith('xl/worksheets/') && path.endsWith('.xml'));
}

/**
 * Reads a workbook's first sheet as a table of text.
 *
 * @param bytes - The whole file, as it was read or dropped.
 * @param options - How to read it.
 * @returns The headers, if it has them, and every row.
 * @throws When the file is not a workbook at all.
 */
export async function xlsxToTable(bytes: Uint8Array, options: HubXlsxReadOptions = {}): Promise<HubSheetTable> {
	const files = await unzip(bytes);
	const path = worksheetPath(files, options.sheetName);

	if (!path) {
		throw new Error('Not an xlsx workbook: no worksheet inside it.');
	}

	const strings = sharedStrings(
		files.has('xl/sharedStrings.xml') ? decoder.decode(files.get('xl/sharedStrings.xml')) : undefined
	);
	const dates = dateStyles(files.has('xl/styles.xml') ? decoder.decode(files.get('xl/styles.xml')) : undefined);
	const sheet = decoder.decode(files.get(path));
	const rows: string[][] = [];

	for (const row of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
		const line: string[] = [];

		for (const cell of row[1].matchAll(/<c(\s[^>]*)>([\s\S]*?)<\/c>/g)) {
			const attributes = cell[1];
			const at = columnAt(/r="([A-Z]+)/.exec(attributes)?.[1] ?? '');
			const type = /t="([^"]*)"/.exec(attributes)?.[1] ?? 'n';
			const style = Number(/s="(\d+)"/.exec(attributes)?.[1] ?? -1);
			const value = /<v>([\s\S]*?)<\/v>/.exec(cell[2])?.[1];
			let text = '';

			if (type === 's') {
				text = strings[Number(value ?? -1)] ?? '';
			} else if (type === 'inlineStr') {
				text = [...cell[2].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((piece) => unescapeXml(piece[1])).join('');
			} else if (type === 'b') {
				text = value === '1' ? 'true' : 'false';
			} else if (value !== undefined) {
				const number = Number(value);

				text = dates.has(style) && Number.isFinite(number) ? isoDate(number) : unescapeXml(value);
			}

			// Cells are absent where they are empty, so the gaps have to be filled or every value
			// after the first empty cell lands in the wrong column.
			while (line.length < at) {
				line.push('');
			}

			line[at] = text;
		}

		rows.push(line);
	}

	if (options.headers === false || !rows.length) {
		return { headers: null, rows };
	}

	return { headers: rows[0], rows: rows.slice(1) };
}

/**
 * Reads a workbook into rows keyed by column alias, matching its headers to the sheet's columns.
 *
 * @returns One record per row of the file, keyed by column alias.
 */
export async function xlsxToRecords<TRow>(
	bytes: Uint8Array,
	columns: readonly HubSpreadsheetColumn<TRow>[],
	options: HubXlsxReadOptions = {}
): Promise<Array<Record<string, string>>> {
	return tableToRecords(await xlsxToTable(bytes, options), columns);
}
