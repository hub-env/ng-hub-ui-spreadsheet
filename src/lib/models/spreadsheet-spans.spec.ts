import { describe, expect, it } from 'vitest';
import { applySpanMerge, applySpanUnmerge, mergeRequestFor, spansWithin } from './spreadsheet-spans';

const block = (row: number, col: number, rowSpan: number, colSpan: number) => ({ row, col, rowSpan, colSpan });

describe('mergeRequestFor', () => {
	it('turns a selection into the block it would become', () => {
		expect(mergeRequestFor([], { top: 1, left: 2, bottom: 2, right: 4 })?.span).toEqual(block(1, 2, 2, 3));
	});

	it('has nothing to offer for a single cell', () => {
		expect(mergeRequestFor([], { top: 1, left: 1, bottom: 1, right: 1 })).toBeNull();
	});

	it('names the blocks the new one swallows, so the host does not keep two claiming a cell', () => {
		const spans = [block(0, 0, 2, 2), block(5, 5, 2, 2)];

		expect(mergeRequestFor(spans, { top: 0, left: 0, bottom: 3, right: 3 })?.replaced).toEqual([{ row: 0, col: 0 }]);
	});
});

describe('spansWithin', () => {
	it('finds a block the selection merely touches, not only one it contains', () => {
		const spans = [block(0, 0, 3, 3)];

		expect(spansWithin(spans, { top: 2, left: 2, bottom: 4, right: 4 })).toHaveLength(1);
	});

	it('leaves alone a block that shares no cell with it', () => {
		const spans = [block(0, 0, 2, 2)];

		expect(spansWithin(spans, { top: 2, left: 2, bottom: 3, right: 3 })).toHaveLength(0);
	});
});

describe('applySpanMerge', () => {
	it('adds the block and drops what it swallowed', () => {
		const spans = [block(0, 0, 2, 2), block(4, 4, 2, 2)];
		const request = mergeRequestFor(spans, { top: 0, left: 0, bottom: 2, right: 2 })!;

		expect(applySpanMerge(spans, request)).toEqual([block(4, 4, 2, 2), block(0, 0, 3, 3)]);
	});

	it('leaves the rest where they were', () => {
		const spans = [block(6, 0, 2, 1)];
		const request = mergeRequestFor(spans, { top: 0, left: 0, bottom: 1, right: 1 })!;

		expect(applySpanMerge(spans, request)).toEqual([block(6, 0, 2, 1), block(0, 0, 2, 2)]);
	});
});

describe('applySpanUnmerge', () => {
	it('takes apart the blocks it was pointed at, and only those', () => {
		const spans = [block(0, 0, 2, 2), block(4, 4, 2, 2)];

		expect(applySpanUnmerge(spans, [{ row: 0, col: 0 }])).toEqual([block(4, 4, 2, 2)]);
	});

	it('does nothing when it is pointed at no block', () => {
		const spans = [block(0, 0, 2, 2)];

		expect(applySpanUnmerge(spans, [{ row: 3, col: 3 }])).toEqual(spans);
	});
});
