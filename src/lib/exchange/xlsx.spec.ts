import { describe, expect, it } from 'vitest';
import { sheetToXlsx } from './xlsx';
import { HubSpreadsheetColumn } from '../models/spreadsheet.types';

interface Line {
	product: string;
	units: number | null;
	day: string | null;
	state: string | null;
	total: string | null;
}

const columns: HubSpreadsheetColumn<Line>[] = [
	{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product }) },
	{ key: 'units', header: 'Unidades', kind: 'number', cell: (row) => ({ value: row.units }) },
	{ key: 'day', header: 'Fecha', kind: 'date', cell: (row) => ({ value: row.day }) },
	{
		key: 'state',
		header: 'Estado',
		kind: 'select',
		options: [{ value: 'paid', label: 'Pagado' }],
		cell: (row) => ({ value: row.state })
	},
	{ key: 'total', header: 'Total', kind: 'number', cell: (row) => ({ value: row.total }) }
];

const rows: Line[] = [
	{ product: 'Tornillo & tuerca', units: 100, day: '2024-01-15', state: 'paid', total: '=[units]*2' },
	{ product: 'Arandela', units: null, day: 'sin fecha', state: null, total: null }
];

/** The worksheet part, read back out of the archive. Stored entries make this a plain search. */
function worksheet(bytes: Uint8Array): string {
	const text = new TextDecoder().decode(bytes);
	const start = text.indexOf('<worksheet');

	return text.slice(start, text.indexOf('</worksheet>') + 12);
}

describe('sheetToXlsx', () => {
	const bytes = sheetToXlsx(rows, columns);
	const sheet = worksheet(bytes);

	it('writes an archive with every part a workbook needs', () => {
		const text = new TextDecoder().decode(bytes);

		for (const part of [
			'[Content_Types].xml',
			'_rels/.rels',
			'xl/workbook.xml',
			'xl/_rels/workbook.xml.rels',
			'xl/styles.xml',
			'xl/worksheets/sheet1.xml'
		]) {
			expect(text).toContain(part);
		}
	});

	it('puts the headers in the first row, in bold', () => {
		expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Producto</t></is></c>');
	});

	it('writes a number as a number, not as text', () => {
		expect(sheet).toContain('<c r="B2"><v>100</v></c>');
	});

	it('writes a date as the day number Excel counts in', () => {
		// 15 January 2024, counted from Excel's 30 December 1899.
		expect(sheet).toContain('<c r="C2" s="2"><v>45306</v></c>');
	});

	it('leaves a date-shaped column alone when the text is not a date', () => {
		expect(sheet).toContain('xml:space="preserve">sin fecha<');
	});

	it('writes what the cell shows for a select', () => {
		expect(sheet).toContain('xml:space="preserve">Pagado<');
	});

	it('writes what the row holds when the file is meant to come back', () => {
		expect(worksheet(sheetToXlsx(rows, columns, { values: 'stored' }))).toContain('xml:space="preserve">paid<');
	});

	it('works the formulas out rather than exporting their text', () => {
		expect(sheet).toContain('<c r="E2"><v>200</v></c>');
		expect(sheet).not.toContain('=[units]*2');
	});

	it('keeps the formula when the file is a round trip', () => {
		expect(worksheet(sheetToXlsx(rows, columns, { values: 'stored' }))).toContain('=[units]*2');
	});

	it('escapes what XML cannot carry as itself', () => {
		expect(sheet).toContain('Tornillo &amp; tuerca');
	});

	it('writes no cell at all for an empty one', () => {
		// An empty cell is absent, not an empty string: a workbook full of blanks is a workbook
		// where "go to the end of the data" lands in the wrong place.
		expect(sheet).toContain('<row r="3"><c r="A3"');
		expect(sheet).not.toContain('r="B3"');
	});

	it('can leave the headers out', () => {
		const without = worksheet(sheetToXlsx(rows, columns, { headers: false }));

		expect(without).toContain('<row r="1"><c r="A1"');
		expect(without).not.toContain('Producto');
	});

	it('names the sheet, keeping to what Excel accepts', () => {
		const text = new TextDecoder().decode(sheetToXlsx(rows, columns, { sheetName: 'Presupuesto/2024' }));

		expect(text).toContain('name="Presupuesto 2024"');
	});

	it('falls back to a name rather than writing an empty one', () => {
		expect(new TextDecoder().decode(sheetToXlsx(rows, columns, { sheetName: '  ' }))).toContain('name="Sheet1"');
	});

	it('states the range the data covers', () => {
		expect(sheet).toContain('<dimension ref="A1:E3"/>');
	});

	it('writes a workbook for no rows at all', () => {
		const empty = sheetToXlsx([], columns);

		expect(worksheet(empty)).toContain('<dimension ref="A1:E1"/>');
	});
});
