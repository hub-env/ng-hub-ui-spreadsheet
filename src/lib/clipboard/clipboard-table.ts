import { HubSpreadsheetValue } from '../models/spreadsheet.types';
import { parseDelimited } from '../exchange/delimited';

/**
 * Reading and writing the clipboard the way spreadsheets actually use it.
 *
 * Two flavours travel together. `text/plain` is tab-separated and carries what the source
 * *displayed*, formatted in the source's own locale — so a figure copied from Excel in Spain
 * arrives as `1.234,56 €`. `text/html` is where the raw number travels, in an attribute, and is
 * the only place a value can be read back without guessing which convention wrote it.
 *
 * Reading only the plain text is the bug this module exists to avoid.
 */

/** A cell as it came off the clipboard. */
export interface HubClipboardCell {
	/** What the source displayed. */
	readonly text: string;
	/** The underlying number, when the source declared one. */
	readonly raw?: number;
}

/** The two flavours a paste may carry. */
export interface HubClipboardPayload {
	readonly text?: string;
	readonly html?: string;
}

/** Both flavours of a copy, ready to be put on the clipboard. */
export interface HubClipboardWrite {
	readonly text: string;
	readonly html: string;
}

/**
 * Reads a number out of text written in the reader's convention.
 *
 * Deliberately three-valued: a number, `null` for an empty cell — which is an absence and not a
 * zero — and `undefined` for text that is not a number at all, so a caller can refuse a paste
 * instead of silently writing NaN.
 *
 * @param text The text as typed or as pasted.
 * @param decimalMark Which character separates the decimals for this reader.
 */
export function parseDecimal(text: string, decimalMark: ',' | '.'): number | null | undefined {
	// Excel pads figures with non-breaking spaces, which trim() does not touch.
	const trimmed = text.replace(/[\s ]/g, '');

	if (trimmed === '') {
		return null;
	}

	const thousands = decimalMark === ',' ? '.' : ',';
	const bare = trimmed.split(thousands).join('').replace(/%$/, '').replace(decimalMark, '.');

	if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(bare)) {
		return undefined;
	}

	const value = Number(bare);

	return Number.isFinite(value) ? value : undefined;
}

/**
 * Parses a pasted block into a table of cells.
 *
 * The plain text decides the shape, because it is the only flavour guaranteed to be there and to
 * be complete. The HTML, when present and parseable, is read alongside it purely to recover raw
 * numbers.
 */
export function parseClipboardTable(payload: HubClipboardPayload): HubClipboardCell[][] {
	const rows = parseDelimited(payload.text ?? '');

	if (!rows.length) {
		return [];
	}

	const raw = payload.html ? rawValuesFromHtml(payload.html) : [];

	return rows.map((row, rowIndex) =>
		row.map((text, colIndex) => {
			const value = raw[rowIndex]?.[colIndex];

			return value === undefined ? { text } : { text, raw: value };
		})
	);
}

/**
 * Writes a block of values as both flavours.
 *
 * Numbers go into the plain text with a dot and no grouping, which every spreadsheet reads
 * whatever its reader has configured, and into the HTML as `x:num`, which is what lets another
 * instance of this component — or Excel — recover the exact value rather than re-parsing a
 * formatted string.
 */
export function serialiseClipboardTable(rows: readonly (readonly HubSpreadsheetValue[])[]): HubClipboardWrite {
	const text = rows.map((row) => row.map(toDelimitedCell).join('\t')).join('\n');

	const html = '<table>' + rows.map((row) => '<tr>' + row.map(toHtmlCell).join('') + '</tr>').join('') + '</table>';

	return { text, html };
}

/** One cell as tab-separated text, quoted only when it would otherwise break the shape. */
function toDelimitedCell(value: HubSpreadsheetValue): string {
	if (value === null) {
		return '';
	}

	if (typeof value === 'number') {
		return String(value);
	}

	return /[\t\n\r"]/.test(value) ? `"${value.split('"').join('""')}"` : value;
}

/** One cell as HTML, with the raw number attached when there is one. */
function toHtmlCell(value: HubSpreadsheetValue): string {
	if (value === null) {
		return '<td></td>';
	}

	if (typeof value === 'number') {
		return `<td x:num="${value}">${value}</td>`;
	}

	return `<td>${escapeHtml(value)}</td>`;
}

function escapeHtml(value: string): string {
	return value.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
}

/**
 * Splits tab-separated text into rows and cells, honouring quoting.
 *
 * A hand-rolled state machine rather than a pair of splits, because a cell may legitimately hold
 * a tab or a newline when it is quoted, and splitting first destroys exactly that data. A stray
 * quote in the middle of a cell — `12" de pantalla` — is content, not a delimiter, so quoting
 * only counts at the start of a cell.
 */

/**
 * Pulls the raw numbers out of the HTML flavour, laid out to match the table.
 *
 * Parsed with `DOMParser` and read through `textContent` and attributes. The clipboard is
 * attacker-controlled input, so nothing here is ever assigned to `innerHTML`: pasting a crafted
 * cell into a page is a direct route to running somebody else's script.
 */
function rawValuesFromHtml(html: string): (number | undefined)[][] {
	if (typeof DOMParser === 'undefined') {
		return [];
	}

	// Office prefixes the fragment with a byte-offset header that is not markup.
	const markup = html.slice(Math.max(0, html.indexOf('<')));
	const table = new DOMParser().parseFromString(markup, 'text/html').querySelector('table');

	if (!table) {
		return [];
	}

	return [...table.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td, th')].map((cell) => rawValueOf(cell)));
}

/** The declared number of one cell, from whichever dialect the source speaks. */
function rawValueOf(cell: Element): number | undefined {
	const excel = cell.getAttribute('x:num');

	if (excel !== null && excel !== '') {
		const value = Number(excel);

		return Number.isFinite(value) ? value : undefined;
	}

	const sheets = cell.getAttribute('data-sheets-value');

	if (sheets) {
		try {
			// Google encodes the type in key "1" and the number in key "3"; 3 means number.
			const parsed = JSON.parse(sheets) as Record<string, unknown>;

			if (parsed['1'] === 3 && typeof parsed['3'] === 'number') {
				return parsed['3'];
			}
		} catch {
			// A dialect this does not know. The displayed text still carries the cell.
		}
	}

	return undefined;
}
