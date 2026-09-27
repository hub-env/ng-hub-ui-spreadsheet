import { describe, expect, it } from 'vitest';
import { evaluateSheet } from './formula-sheet';
import { HubSpreadsheetColumn } from '../models/spreadsheet.types';

interface Line {
	price: string | number | null;
	units: string | number | null;
	total: string | number | null;
}

function columns(): HubSpreadsheetColumn<Line>[] {
	return [
		{ key: 'price', header: 'Price', cell: (row) => ({ value: row.price }) },
		{ key: 'units', header: 'Units', cell: (row) => ({ value: row.units }) },
		{ key: 'total', header: 'Total', cell: (row) => ({ value: row.total }) }
	];
}

function evaluate(rows: Line[]) {
	return evaluateSheet({
		rows,
		columns: columns(),
		raw: (index, column) => (rows[index] as never)[column.key]
	});
}

describe('evaluateSheet', () => {
	it('leaves a plain value where it found it', () => {
		const sheet = evaluate([{ price: 10, units: 2, total: null }]);

		expect(sheet[0]['price'].value).toBe(10);
		expect(sheet[0]['total'].value).toBeNull();
	});

	it('works out a formula from its own row', () => {
		const sheet = evaluate([{ price: 10, units: 3, total: '=[price] * [units]' }]);

		expect(sheet[0]['total'].value).toBe(30);
	});

	it('follows a formula that depends on another formula', () => {
		const sheet = evaluate([{ price: '=5 * 2', units: 3, total: '=[price] * [units]' }]);

		expect(sheet[0]['total'].value).toBe(30);
	});

	it('adds up a column of formulas, leaving out the cell that is asking', () => {
		const sheet = evaluate([
			{ price: 10, units: 1, total: '=[price] * [units]' },
			{ price: 20, units: 2, total: '=[price] * [units]' },
			{ price: 5, units: 3, total: '=SUM([total:])' }
		]);

		// A total row that included itself could never be worked out, and it is what everybody
		// writes: ten and forty, not a circle.
		expect(sheet[2]['total'].value).toBe(50);
		expect(sheet[0]['total'].value).toBe(10);
		expect(sheet[1]['total'].value).toBe(40);
	});

	it('leaves nothing out when the column being read is a different one', () => {
		const sheet = evaluate([
			{ price: 10, units: 1, total: null },
			{ price: 20, units: 2, total: null },
			{ price: 5, units: 3, total: '=SUM([price:])' }
		]);

		// Thirty-five: a total row summing the prices sums every price, its own row included.
		expect(sheet[2]['total'].value).toBe(35);
	});

	it('catches a cell that reads itself', () => {
		const sheet = evaluate([{ price: '=[price] + 1', units: 1, total: null }]);

		expect(sheet[0]['price'].failure?.code).toBe('cycle');
		expect(sheet[0]['price'].value).toBeNull();
	});

	it('catches a circle that goes round three cells', () => {
		const sheet = evaluate([{ price: '=[total]', units: '=[price]', total: '=[units]' }]);

		expect(sheet[0]['price'].failure?.code).toBe('cycle');
	});

	it('keeps going after a cell that cannot be worked out', () => {
		const sheet = evaluate([
			{ price: '=1/0', units: 2, total: '=[units] * 3' },
			{ price: 4, units: 5, total: '=[price] * [units]' }
		]);

		expect(sheet[0]['price'].failure?.code).toBe('divide-by-zero');
		expect(sheet[0]['total'].value).toBe(6);
		expect(sheet[1]['total'].value).toBe(20);
	});

	it('reads a cell by its place, the way a spreadsheet writes it', () => {
		const sheet = evaluate([
			{ price: 10, units: 1, total: null },
			{ price: 20, units: 2, total: '=A1 * 3' }
		]);

		// A1 is the first column of the first row: the price of the row above.
		expect(sheet[1]['total'].value).toBe(30);
	});

	it('adds up a rectangle of places', () => {
		const sheet = evaluate([
			{ price: 10, units: 1, total: null },
			{ price: 20, units: 2, total: null },
			{ price: 5, units: 3, total: '=SUM(A1:A2)' }
		]);

		expect(sheet[2]['total'].value).toBe(30);
	});

	it('says #REF! rather than reading the neighbour when a place is off the sheet', () => {
		const sheet = evaluate([{ price: '=Z9 + 1', units: 1, total: null }]);

		expect(sheet[0]['price'].failure).toMatchObject({ code: 'name' });
	});

	it('catches a circle drawn with places as readily as one drawn with aliases', () => {
		const sheet = evaluate([{ price: '=C1', units: 1, total: '=A1' }]);

		expect(sheet[0]['price'].failure?.code).toBe('cycle');
	});

	it('names the alias nothing answers to', () => {
		const sheet = evaluate([{ price: '=[nosuch] * 2', units: 1, total: null }]);

		expect(sheet[0]['price'].failure).toMatchObject({ code: 'name', at: 'nosuch' });
	});

	it('runs a column that twenty rows read without running it twenty times', () => {
		let reads = 0;
		const rows: Line[] = Array.from({ length: 20 }, () => ({ price: 2, units: 3, total: '=SUM([price:])' }));
		const sheet = evaluateSheet({
			rows,
			columns: columns(),
			raw: (index, column) => {
				reads += 1;

				return (rows[index] as never)[column.key];
			}
		});

		expect(sheet[19]['total'].value).toBe(40);
		// Sixty cells, read once each: without the remembering this is twenty times more.
		expect(reads).toBe(60);
	});
});
