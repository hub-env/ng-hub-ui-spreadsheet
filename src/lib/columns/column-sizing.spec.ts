import { moveColumn, resolveColumnWidth } from './column-sizing';

describe('resolveColumnWidth', () => {
	it('adds the travelled distance to where the drag started', () => {
		expect(resolveColumnWidth(120, 30, 40)).toBe(150);
		expect(resolveColumnWidth(120, -30, 40)).toBe(90);
	});

	it('stops at the floor instead of letting a column vanish', () => {
		expect(resolveColumnWidth(120, -200, 40)).toBe(40);
	});

	it('rounds to whole pixels, since half a pixel of column leaves a hairline', () => {
		expect(resolveColumnWidth(120.4, 30.3, 40)).toBe(151);
	});

	it('refuses to answer when the starting width could not be measured', () => {
		// Any number here would be invented, and an invented width makes the column jump.
		expect(resolveColumnWidth(Number.NaN, 30, 40)).toBeNull();
	});

	it('refuses a starting width of zero, which means nothing had been laid out yet', () => {
		expect(resolveColumnWidth(0, 60, 48)).toBeNull();
		expect(resolveColumnWidth(-10, 60, 48)).toBeNull();
	});

	it('treats a distance it could not read as no movement, keeping the column as it was', () => {
		expect(resolveColumnWidth(120, Number.NaN, 40)).toBe(120);
	});
});

describe('moveColumn', () => {
	const columns = ['a', 'b', 'c', 'd'];

	it('moves a column later, closing the gap behind it', () => {
		expect(moveColumn(columns, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
	});

	it('moves a column earlier', () => {
		expect(moveColumn(columns, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
	});

	it('leaves the order alone when a column lands where it already was', () => {
		expect(moveColumn(columns, 2, 2)).toEqual(columns);
	});

	it('clamps a destination past either end rather than losing the column', () => {
		expect(moveColumn(columns, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
		expect(moveColumn(columns, 3, -5)).toEqual(['d', 'a', 'b', 'c']);
	});

	it('returns the list untouched when the source is not in it', () => {
		expect(moveColumn(columns, 9, 0)).toEqual(columns);
	});

	it('copes with a list of one, and with an empty one', () => {
		expect(moveColumn(['a'], 0, 0)).toEqual(['a']);
		expect(moveColumn([], 0, 1)).toEqual([]);
	});

	it('never mutates what it was given', () => {
		const original = [...columns];

		moveColumn(columns, 0, 3);

		expect(columns).toEqual(original);
	});
});
