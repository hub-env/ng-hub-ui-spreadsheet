import { describe, expect, it } from 'vitest';
import { csvToRecords, csvToTable, sheetToCsv, sniffDelimiter } from './csv';
import { HubSpreadsheetColumn } from '../models/spreadsheet.types';

interface Line {
	product: string;
	units: number | null;
	state: string | null;
}

const columns: HubSpreadsheetColumn<Line>[] = [
	{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product }) },
	{ key: 'units', header: 'Unidades', kind: 'number', cell: (row) => ({ value: row.units }) },
	{
		key: 'state',
		header: 'Estado',
		kind: 'select',
		options: [
			{ value: 'paid', label: 'Pagado' },
			{ value: 'due', label: 'Pendiente' }
		],
		cell: (row) => ({ value: row.state })
	}
];

const rows: Line[] = [
	{ product: 'Tornillo', units: 100, state: 'paid' },
	{ product: 'Arandela; con coma', units: null, state: 'due' }
];

describe('sheetToCsv', () => {
	it('writes the headers and the rows', () => {
		const csv = sheetToCsv(rows, columns, { delimiter: ',', newline: '\n' });

		expect(csv.split('\n')[0]).toBe('Producto,Unidades,Estado');
		expect(csv.split('\n')[1]).toBe('Tornillo,100,Pagado');
	});

	it('writes what the cell shows, not what the row holds', () => {
		// The select exports the label somebody chose: `paid` is of no use to whoever gets the file.
		expect(sheetToCsv(rows, columns, { delimiter: ',' })).toContain('Pagado');
	});

	it('writes what the row holds when the file is meant to come back', () => {
		expect(sheetToCsv(rows, columns, { delimiter: ',', values: 'stored' })).toContain('paid');
	});

	it('quotes only what has to be quoted', () => {
		const csv = sheetToCsv(rows, columns, { delimiter: ';', newline: '\n' });

		expect(csv.split('\n')[2]).toBe('"Arandela; con coma";;Pendiente');
	});

	it('separates with semicolons where the comma is the decimal mark', () => {
		expect(sheetToCsv(rows, columns, { decimalMark: ',', newline: '\n' }).split('\n')[0]).toBe('Producto;Unidades;Estado');
	});

	it('writes the figures the way this reader writes them', () => {
		const decimals: Line[] = [{ product: 'x', units: 1234.5, state: null }];

		expect(sheetToCsv(decimals, columns, { decimalMark: ',', newline: '\n' })).toContain('1234,5');
	});

	it('leaves the headers out when they are not wanted', () => {
		expect(sheetToCsv(rows, columns, { headers: false, delimiter: ',', newline: '\n' }).split('\n')[0]).toBe(
			'Tornillo,100,Pagado'
		);
	});
});

describe('sniffDelimiter', () => {
	it('counts what is on the first line rather than guessing', () => {
		expect(sniffDelimiter('a,b,c\n1,2,3')).toBe(',');
		expect(sniffDelimiter('a;b;c\n1;2;3')).toBe(';');
		expect(sniffDelimiter('a\tb\tc')).toBe('\t');
	});

	it('falls back to a comma for a file of one column', () => {
		expect(sniffDelimiter('alone\nagain')).toBe(',');
	});
});

describe('csvToTable', () => {
	it('takes the first line as the headers', () => {
		const table = csvToTable('a,b\n1,2\n3,4');

		expect(table.headers).toEqual(['a', 'b']);
		expect(table.rows).toEqual([
			['1', '2'],
			['3', '4']
		]);
	});

	it('keeps every line when there are no headers', () => {
		expect(csvToTable('1,2\n3,4', { headers: false }).rows).toHaveLength(2);
	});

	it('reads a quoted cell holding the separator', () => {
		expect(csvToTable('a;b\n"uno; y dos";3', { delimiter: ';' }).rows[0][0]).toBe('uno; y dos');
	});
});

describe('csvToRecords', () => {
	it(`matches the file's headers to the columns, by header or by alias`, () => {
		const records = csvToRecords('Producto,units\nTornillo,100', columns);

		expect(records).toEqual([{ product: 'Tornillo', units: '100' }]);
	});

	it('ignores case and space around a heading', () => {
		expect(csvToRecords('  PRODUCTO ,Unidades\nx,1', columns)[0]).toEqual({ product: 'x', units: '1' });
	});

	it('leaves out a column the file says nothing about, so a partial file updates only what it names', () => {
		expect(csvToRecords('Producto\nx', columns)[0]).toEqual({ product: 'x' });
	});

	it('goes by position when the file has no headers', () => {
		expect(csvToRecords('x,1,paid', columns, { headers: false })[0]).toEqual({
			product: 'x',
			units: '1',
			state: 'paid'
		});
	});

	it('leaves a heading nothing answers to out rather than inventing a column', () => {
		expect(csvToRecords('Producto,Nada\nx,y', columns)[0]).toEqual({ product: 'x' });
	});
});
