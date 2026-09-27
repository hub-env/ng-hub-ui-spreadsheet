import { duplicateColumnKeys, spreadsheetRecord, spreadsheetRecords } from './spreadsheet-records';
import { HubSpreadsheetColumn } from './spreadsheet.types';

interface Line {
	readonly product: string;
	readonly units: number;
	readonly unitPrice: number;
}

const lines: Line[] = [
	{ product: 'Tornillo M6', units: 120, unitPrice: 0.12 },
	{ product: 'Arandela', units: 0, unitPrice: 0.04 }
];

const columns: HubSpreadsheetColumn<Line>[] = [
	{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product }) },
	{ key: 'units', header: 'Unidades', kind: 'number', cell: (row) => ({ value: row.units }) },
	{
		key: 'price',
		header: 'Precio unitario',
		kind: 'currency',
		cell: (row) => ({ value: row.unitPrice })
	}
];

describe('spreadsheetRecord', () => {
	it('keys the values by column alias, not by position', () => {
		expect(spreadsheetRecord(lines[0], columns)).toEqual({
			product: 'Tornillo M6',
			units: 120,
			price: 0.12
		});
	});

	it('keeps a zero, which is a value and not an absence', () => {
		expect(spreadsheetRecord(lines[1], columns)['units']).toBe(0);
	});

	it('carries the alias and not the header, so renaming a column changes nothing', () => {
		const renamed = columns.map((column) => ({ ...column, header: `${column.header} (2026)` }));

		expect(spreadsheetRecord(lines[0], renamed)).toEqual(spreadsheetRecord(lines[0], columns));
	});

	it('reports the underlying value, never the decorated text', () => {
		const decorated: HubSpreadsheetColumn<Line>[] = [
			{ key: 'units', header: 'Unidades', cell: (row) => ({ value: row.units, text: `${row.units} ud.` }) }
		];

		expect(spreadsheetRecord(lines[0], decorated)).toEqual({ units: 120 });
	});
});

describe('spreadsheetRecords', () => {
	it('maps every row in order', () => {
		expect(spreadsheetRecords(lines, columns)).toEqual([
			{ product: 'Tornillo M6', units: 120, price: 0.12 },
			{ product: 'Arandela', units: 0, price: 0.04 }
		]);
	});

	it('returns nothing for an empty sheet', () => {
		expect(spreadsheetRecords([], columns)).toEqual([]);
	});
});

describe('duplicateColumnKeys', () => {
	it('says nothing when every alias is its own', () => {
		expect(duplicateColumnKeys(columns)).toEqual([]);
	});

	it('names the alias that repeats, because the second one would silently win', () => {
		const clashing = [...columns, { key: 'units', header: 'Cantidad', cell: () => ({ value: null }) }];

		expect(duplicateColumnKeys(clashing)).toEqual(['units']);
	});

	it('names each repeated alias once, however many times it repeats', () => {
		const clashing = [
			{ key: 'a', header: 'A', cell: () => ({ value: null }) },
			{ key: 'a', header: 'A bis', cell: () => ({ value: null }) },
			{ key: 'a', header: 'A ter', cell: () => ({ value: null }) },
			{ key: 'b', header: 'B', cell: () => ({ value: null }) },
			{ key: 'b', header: 'B bis', cell: () => ({ value: null }) }
		];

		expect(duplicateColumnKeys(clashing)).toEqual(['a', 'b']);
	});
});
