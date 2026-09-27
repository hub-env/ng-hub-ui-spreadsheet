import { describe, expect, it } from 'vitest';
import { xlsxToRecords, xlsxToTable } from './xlsx-read';
import { sheetToXlsx } from './xlsx';
import { HubSpreadsheetColumn } from '../models/spreadsheet.types';

interface Line {
	product: string;
	units: number | null;
	day: string | null;
	state: string | null;
}

const columns: HubSpreadsheetColumn<Line>[] = [
	{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product }) },
	{ key: 'units', header: 'Unidades', kind: 'number', cell: (row) => ({ value: row.units }) },
	{ key: 'day', header: 'Fecha', kind: 'date', cell: (row) => ({ value: row.day }) },
	{ key: 'state', header: 'Estado', kind: 'text', cell: (row) => ({ value: row.state }) }
];

/** The bytes of the fixture at the foot of this file. */
function foreign(): Uint8Array {
	return Uint8Array.from(atob(FOREIGN_WORKBOOK), (character) => character.charCodeAt(0));
}

describe('xlsxToTable, on a workbook written elsewhere', () => {
	it('reads the headers and every row through the shared-string table', async () => {
		const table = await xlsxToTable(foreign());

		expect(table.headers).toEqual(['Producto', 'Unidades', 'Fecha', 'Estado']);
		expect(table.rows[0]).toEqual(['Tornillo & tuerca', '100', '2024-01-15', 'Pagado']);
	});

	it('turns a day count wearing a date format back into a date', async () => {
		const table = await xlsxToTable(foreign());

		// Without reading the styles this cell arrives as 45306, and the import writes a five-digit
		// number into a date column.
		expect(table.rows[0][2]).toBe('2024-01-15');
	});

	it('joins a string written in runs of formatting', async () => {
		const table = await xlsxToTable(foreign());

		expect(table.rows[2][0]).toBe('Añil');
	});

	it('keeps the gaps where cells are missing', async () => {
		const table = await xlsxToTable(foreign());

		// The row holds A and D and nothing between them; taken in order, `true` would land in B.
		expect(table.rows[1]).toEqual(['Arandela', '', '', 'true']);
	});

	it('reads the sheet the workbook lists first, not the one the archive happens to hold first', async () => {
		const table = await xlsxToTable(foreign());

		expect(table.rows.some((row) => row[0] === 'otra hoja')).toBe(false);
	});

	it('reads a sheet by name', async () => {
		const table = await xlsxToTable(foreign(), { sheetName: 'Otra', headers: false });

		expect(table.rows[0][0]).toBe('otra hoja');
	});

	it('can treat the first row as data', async () => {
		const table = await xlsxToTable(foreign(), { headers: false });

		expect(table.headers).toBeNull();
		expect(table.rows[0][0]).toBe('Producto');
	});

	it('refuses a file that is not a workbook', async () => {
		await expect(xlsxToTable(new TextEncoder().encode('not a zip at all'))).rejects.toThrow();
	});
});

describe('xlsxToRecords', () => {
	it('keys the rows by column alias', async () => {
		const records = await xlsxToRecords(foreign(), columns);

		expect(records[0]).toEqual({ product: 'Tornillo & tuerca', units: '100', day: '2024-01-15', state: 'Pagado' });
	});
});

describe('a workbook this library wrote', () => {
	const rows: Line[] = [
		{ product: 'Tornillo & tuerca «M8»', units: 100, day: '2024-01-15', state: 'Pagado' },
		{ product: 'Arandela', units: null, day: null, state: null }
	];

	it('reads back the way it went in', async () => {
		const table = await xlsxToTable(sheetToXlsx(rows, columns));

		expect(table.headers).toEqual(['Producto', 'Unidades', 'Fecha', 'Estado']);
		expect(table.rows[0]).toEqual(['Tornillo & tuerca «M8»', '100', '2024-01-15', 'Pagado']);
	});

	it('comes back as records the sheet can be filled from', async () => {
		const records = await xlsxToRecords(sheetToXlsx(rows, columns), columns);

		expect(records).toHaveLength(2);
		expect(records[1]['product']).toBe('Arandela');
	});
});

/**
 * A workbook written by something other than this library: deflated entries, a shared-string table,
 * a string split into runs of formatting, a builtin date format, a row with a hole in it, and two
 * sheets listed in the opposite order to the one the archive stores them in.
 *
 * It is here as base64 on purpose. The whole point of it is to be a file this code did not write —
 * built with Python's zip and zlib and checked with openpyxl — so rebuilding it from parts at test
 * time would test the reader against its own idea of the format, which is exactly what it must not
 * do.
 */
const FOREIGN_WORKBOOK =
	'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' +
	'AA==';
