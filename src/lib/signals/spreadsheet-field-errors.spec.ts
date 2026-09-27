import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { applyEach, form, min, required } from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import { HubSpreadsheetColumn } from '../models/spreadsheet.types';
import { spreadsheetFieldErrors, touchSpreadsheetField } from '../../../signals/src/lib/spreadsheet-field-errors';

interface Line {
	id: string;
	product: string;
	units: number | null;
}

const columns: HubSpreadsheetColumn<Line>[] = [
	{ key: 'product', header: 'Product', cell: (row) => ({ value: row.product, editable: true }) },
	{ key: 'units', header: 'Units', kind: 'number', cell: (row) => ({ value: row.units, editable: true }) },
	// A calculated column has no counterpart in the model; looking it up must not throw.
	{ key: 'total', header: 'Total', kind: 'number', cell: () => ({ value: 0 }) }
];

const rowKey = (row: Line) => row.id;

function build(lines: Line[]) {
	return TestBed.runInInjectionContext(() => {
		const model = signal<Line[]>(lines);
		const tree = form(model, (path) => {
			applyEach(path, (line) => {
				required(line.product, { message: 'A line needs a product' });
				min(line.units, 1, { message: 'At least one unit' });
			});
		});

		return { model, tree };
	});
}

describe('spreadsheetFieldErrors', () => {
	it('reports nothing when every line is valid', () => {
		const { model, tree } = build([{ id: 'a', product: 'Bolt', units: 10 }]);

		expect(spreadsheetFieldErrors(tree, model(), columns, rowKey, false)).toEqual({});
	});

	it('names the offending cell by row key and column alias', () => {
		const { model, tree } = build([
			{ id: 'a', product: '', units: 10 },
			{ id: 'b', product: 'Washer', units: 0 }
		]);

		expect(spreadsheetFieldErrors(tree, model(), columns, rowKey, false)).toEqual({
			'a\tproduct': 'A line needs a product',
			'b\tunits': 'At least one unit'
		});
	});

	it('survives a column whose alias names no field', () => {
		const { model, tree } = build([{ id: 'a', product: '', units: 10 }]);
		const keys = Object.keys(spreadsheetFieldErrors(tree, model(), columns, rowKey, false));

		expect(keys.some((key) => key.endsWith('\ttotal'))).toBe(false);
	});

	/**
	 * The default holds errors back until a cell has been visited, and nothing here has been.
	 * A sheet that paints itself red before the reader has typed a character is a sheet nobody
	 * believes, so this is the wanted behaviour — and the reason a host has to report touches.
	 */
	it('says nothing about untouched cells while the default is in force', () => {
		const { model, tree } = build([{ id: 'a', product: '', units: 0 }]);

		expect(spreadsheetFieldErrors(tree, model(), columns, rowKey)).toEqual({});
	});

	it('reports a cell once it has been touched', () => {
		const { model, tree } = build([{ id: 'a', product: '', units: 0 }]);

		TestBed.runInInjectionContext(() => touchSpreadsheetField(tree, 0, 'product'));

		expect(spreadsheetFieldErrors(tree, model(), columns, rowKey)).toEqual({
			'a\tproduct': 'A line needs a product'
		});
	});

	it('touches only the cell it was asked about', () => {
		const { model, tree } = build([{ id: 'a', product: '', units: 0 }]);

		TestBed.runInInjectionContext(() => touchSpreadsheetField(tree, 0, 'product'));

		expect(Object.keys(spreadsheetFieldErrors(tree, model(), columns, rowKey))).toEqual(['a\tproduct']);
	});

	it('shrugs off a touch on a column that names no field, or a row that is not there', () => {
		const { tree } = build([{ id: 'a', product: '', units: 0 }]);

		expect(() =>
			TestBed.runInInjectionContext(() => {
				touchSpreadsheetField(tree, 0, 'total');
				touchSpreadsheetField(tree, 99, 'product');
			})
		).not.toThrow();
	});
});
