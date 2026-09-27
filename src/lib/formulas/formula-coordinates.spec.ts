import { describe, expect, it } from 'vitest';
import {
	columnIndexOf,
	columnLabel,
	formatCoordinate,
	moveCoordinate,
	parseCoordinate,
	rewriteCoordinates,
	rewriteRowFormulas
} from './formula-coordinates';

describe('column letters', () => {
	it('counts the way a spreadsheet does, past Z', () => {
		expect(columnLabel(0)).toBe('A');
		expect(columnLabel(25)).toBe('Z');
		expect(columnLabel(26)).toBe('AA');
		expect(columnLabel(51)).toBe('AZ');
		expect(columnLabel(52)).toBe('BA');
	});

	it('reads them back', () => {
		for (const index of [0, 25, 26, 51, 52, 701, 702]) {
			expect(columnIndexOf(columnLabel(index))).toBe(index);
		}
	});
});

describe('coordinates', () => {
	it('reads a place and writes it back', () => {
		expect(parseCoordinate('B3')).toEqual({ row: 2, col: 1 });
		expect(formatCoordinate({ row: 2, col: 1 })).toBe('B3');
	});

	it('is not a place when it is a word, or a row nought', () => {
		expect(parseCoordinate('SUM')).toBeNull();
		expect(parseCoordinate('B0')).toBeNull();
	});
});

describe('moving a coordinate with the sheet', () => {
	it('follows the column that moved', () => {
		expect(moveCoordinate({ row: 0, col: 1 }, { kind: 'move-column', from: 1, to: 3 })).toEqual({ row: 0, col: 3 });
	});

	it('shuffles the ones it passed on its way', () => {
		// B moves to D: what was C becomes B.
		expect(moveCoordinate({ row: 0, col: 2 }, { kind: 'move-column', from: 1, to: 3 })).toEqual({ row: 0, col: 1 });
		// D moves to B: what was B becomes C.
		expect(moveCoordinate({ row: 0, col: 1 }, { kind: 'move-column', from: 3, to: 1 })).toEqual({ row: 0, col: 2 });
	});

	it('moves along when something is inserted before it', () => {
		expect(moveCoordinate({ row: 5, col: 0 }, { kind: 'rows', at: 2, count: 1 })).toEqual({ row: 6, col: 0 });
		expect(moveCoordinate({ row: 1, col: 0 }, { kind: 'rows', at: 2, count: 1 })).toEqual({ row: 1, col: 0 });
	});

	it('comes back when something before it is deleted', () => {
		expect(moveCoordinate({ row: 5, col: 0 }, { kind: 'rows', at: 2, count: -2 })).toEqual({ row: 3, col: 0 });
	});

	it('is gone when the thing it pointed at is the thing deleted', () => {
		expect(moveCoordinate({ row: 2, col: 0 }, { kind: 'rows', at: 2, count: -1 })).toBe('gone');
		expect(moveCoordinate({ row: 0, col: 3 }, { kind: 'columns', at: 3, count: -1 })).toBe('gone');
	});
});

describe('rewriting a formula', () => {
	it('moves every coordinate in it', () => {
		expect(rewriteCoordinates('=B2 + B3 * 2', { kind: 'rows', at: 0, count: 1 })).toBe('=B3 + B4 * 2');
	});

	it('leaves a deleted one as #REF!, rather than pointing at the neighbour', () => {
		expect(rewriteCoordinates('=A1 + B1', { kind: 'columns', at: 1, count: -1 })).toBe('=A1 + #REF!');
	});

	it('leaves alias references alone, since they were never about where', () => {
		expect(rewriteCoordinates('=[price] * B2', { kind: 'rows', at: 0, count: 1 })).toBe('=[price] * B3');
	});

	it('leaves words inside quotes alone', () => {
		expect(rewriteCoordinates('="B2 is a place" & B2', { kind: 'rows', at: 0, count: 1 })).toBe('="B2 is a place" & B3');
	});

	it('leaves a function name alone even when it looks like letters', () => {
		expect(rewriteCoordinates('=SUM(A1:A3)', { kind: 'rows', at: 0, count: 1 })).toBe('=SUM(A2:A4)');
	});

	it('leaves anything that is not a formula exactly as it was', () => {
		expect(rewriteCoordinates('B2', { kind: 'rows', at: 0, count: 1 })).toBe('B2');
	});
});

describe('rewriting the rows of a sheet', () => {
	it('moves the formulas and leaves the values alone', () => {
		const rows = [
			{ id: 'a', name: 'Bolt', total: '=A1 * 2' },
			{ id: 'b', name: 'Nut', total: '=A2 * 2' }
		];
		const moved = rewriteRowFormulas(rows, { kind: 'rows', at: 0, count: 1 });

		expect(moved[0].total).toBe('=A2 * 2');
		expect(moved[1].total).toBe('=A3 * 2');
		expect(moved[0].name).toBe('Bolt');
	});

	it('hands back the very same row when it held no formula, so nothing redraws for nothing', () => {
		const rows = [{ id: 'a', name: 'Bolt', total: 12 }];
		const moved = rewriteRowFormulas(rows, { kind: 'rows', at: 0, count: 1 });

		expect(moved[0]).toBe(rows[0]);
	});
});
