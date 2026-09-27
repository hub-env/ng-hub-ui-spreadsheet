import { displayValue } from '../columns/cell-values';
import { HubSpreadsheetColumn, HubSpreadsheetValue } from '../models/spreadsheet.types';
import { downloadBlob } from './download';
import { sheetValues } from './sheet-values';
import { zip } from './zip';

/**
 * A sheet as a real `.xlsx`, written by hand.
 *
 * CSV loses everything except the characters: a figure becomes text the moment a locale disagrees
 * about the decimal mark, a date is whatever the reader's machine decides it is, and nothing knows
 * a column of prices from a column of postcodes. That is why the export people actually ask for is
 * this one.
 *
 * What comes out is a small, honest workbook: one sheet, a header row in bold, numbers as numbers
 * and dates as dates. No charts, no merges, no column widths — anybody who needs those has a
 * workbook of their own to paste into, and every one of them costs another part of a format that
 * is already the largest thing in this library.
 *
 * The one thing worth knowing about the file: its parts are **stored** rather than compressed, so
 * it is a few times larger than what Excel writes. That is the whole price of not depending on a
 * compression library, and no reader can tell the difference.
 */

export interface HubXlsxOptions {
	/** The sheet's name in the workbook. `Sheet1` when not given. */
	readonly sheetName?: string;
	/** Whether to write the column headers as the first row. On unless turned off. */
	readonly headers?: boolean;
	/** What to write: what the cell shows, or what the row holds. */
	readonly values?: 'shown' | 'stored';
	/** Whether to work the formulas out first. On unless turned off. */
	readonly formulas?: boolean;
}

/** The media type a browser and Excel both recognise. */
export const XLSX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** What the day numbers are counted from: 30 December 1899, which is Excel's zero. */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Style slots, in the order `styles.xml` declares them. */
const STYLE_PLAIN = 0;
const STYLE_HEADER = 1;
const STYLE_DATE = 2;

/** XML has five characters that cannot be written as themselves, and one that must not be written at all. */
function escapeXml(value: string): string {
	return value
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** A column's letter, as a spreadsheet names it: A, B, … Z, AA. */
function letter(index: number): string {
	let name = '';
	let rest = index;

	do {
		name = String.fromCharCode(65 + (rest % 26)) + name;
		rest = Math.floor(rest / 26) - 1;
	} while (rest >= 0);

	return name;
}

/**
 * A date as the number of days since Excel's zero, or null when the text is not a date.
 *
 * Only whole days and only the ISO shape, which is what a date column of this sheet holds. A
 * string that merely looks date-ish — `2024` — is left as text on purpose: guessing wrong turns a
 * catalogue number into a Tuesday.
 */
function dateSerial(value: string): number | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

	if (!match) {
		return null;
	}

	const stamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

	return Number.isNaN(stamp) ? null : Math.round((stamp - EXCEL_EPOCH) / 86_400_000);
}

/** One cell, as the worksheet spells it. */
function cellXml<TRow>(
	reference: string,
	value: HubSpreadsheetValue,
	column: HubSpreadsheetColumn<TRow> | undefined,
	options: HubXlsxOptions
): string {
	if (value === null || value === '') {
		return '';
	}

	if (typeof value === 'number') {
		return `<c r="${reference}"><v>${value}</v></c>`;
	}

	if (column?.kind === 'date') {
		const serial = dateSerial(value);

		if (serial !== null) {
			return `<c r="${reference}" s="${STYLE_DATE}"><v>${serial}</v></c>`;
		}
	}

	// What the reader saw, not the code underneath: a select cell exports the label somebody chose.
	// `values: 'stored'` is the round trip, and there the stored value is the point.
	const text = options.values === 'stored' || !column ? value : displayValue(value, column);

	// Inline rather than through the shared-strings table. A workbook of a few thousand cells does
	// not care about the repetition, and the table is a second part to keep in step for nothing.
	return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

/** A sheet name Excel will accept: no more than 31 characters and none of its reserved ones. */
function sheetNameOf(name: string | undefined): string {
	const clean = (name ?? 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').trim();

	return clean ? clean.slice(0, 31) : 'Sheet1';
}

/** The parts of the workbook that never change. */
const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

/** Three slots: plain, a bold header, and a date. Everything else is Excel's default. */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/**
 * Writes a sheet as an xlsx workbook.
 *
 * @param rows - The rows, as the sheet has them.
 * @param columns - The columns, which decide the order and the headers.
 * @param options - How to write it.
 * @returns The bytes of the file.
 */
export function sheetToXlsx<TRow>(
	rows: readonly TRow[],
	columns: readonly HubSpreadsheetColumn<TRow>[],
	options: HubXlsxOptions = {}
): Uint8Array {
	const values = sheetValues(rows, columns, { formulas: options.values !== 'stored' && options.formulas !== false });
	const withHeaders = options.headers !== false;
	const lines: string[] = [];

	if (withHeaders) {
		const cells = columns
			.map(
				(column, index) =>
					`<c r="${letter(index)}1" s="${STYLE_HEADER}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(column.header)}</t></is></c>`
			)
			.join('');

		lines.push(`<row r="1">${cells}</row>`);
	}

	values.forEach((line, rowIndex) => {
		const number = rowIndex + (withHeaders ? 2 : 1);
		const cells = line.map((value, index) => cellXml(`${letter(index)}${number}`, value, columns[index], options)).join('');

		lines.push(`<row r="${number}">${cells}</row>`);
	});

	const last = `${letter(Math.max(columns.length - 1, 0))}${Math.max(lines.length, 1)}`;
	const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}"/><sheetData>${lines.join('')}</sheetData></worksheet>`;

	const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetNameOf(options.sheetName))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

	// `[Content_Types].xml` goes first because that is where a reader looks first, and several
	// older ones will not look anywhere else for it.
	return zip([
		{ path: '[Content_Types].xml', data: CONTENT_TYPES },
		{ path: '_rels/.rels', data: ROOT_RELS },
		{ path: 'xl/workbook.xml', data: workbook },
		{ path: 'xl/_rels/workbook.xml.rels', data: WORKBOOK_RELS },
		{ path: 'xl/styles.xml', data: STYLES },
		{ path: 'xl/worksheets/sheet1.xml', data: sheet }
	]);
}

/**
 * Hands the reader an xlsx file to save.
 *
 * @param filename - What to call it; `.xlsx` is added when missing.
 * @param bytes - The workbook, from `sheetToXlsx`.
 */
export function downloadXlsx(filename: string, bytes: Uint8Array): void {
	const name = /\.xlsx$/i.test(filename) ? filename : `${filename}.xlsx`;

	downloadBlob(name, new Blob([bytes as BlobPart], { type: XLSX_MEDIA_TYPE }));
}
