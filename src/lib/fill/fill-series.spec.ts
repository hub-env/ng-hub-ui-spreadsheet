import { detectSeries, fillValues } from './fill-series';

describe('detectSeries', () => {
	it('finds the step of an arithmetic run', () => {
		expect(detectSeries([1, 2, 3])).toEqual({ kind: 'number', start: 3, step: 1 });
		expect(detectSeries([10, 20, 30])).toEqual({ kind: 'number', start: 30, step: 10 });
	});

	it('finds a descending run', () => {
		expect(detectSeries([9, 6, 3])).toEqual({ kind: 'number', start: 3, step: -3 });
	});

	it('treats a single number as a run of step one, which is what a spreadsheet does', () => {
		expect(detectSeries([5])).toEqual({ kind: 'number', start: 5, step: 1 });
	});

	it('refuses a run whose gaps differ, and repeats it instead', () => {
		expect(detectSeries([1, 2, 4])).toEqual({ kind: 'repeat', values: [1, 2, 4] });
	});

	it('repeats text rather than inventing a pattern for it', () => {
		expect(detectSeries(['North', 'South'])).toEqual({ kind: 'repeat', values: ['North', 'South'] });
	});

	it('finds the step of a numbered text run, keeping its prefix and its padding', () => {
		expect(detectSeries(['INV-001', 'INV-002'])).toEqual({
			kind: 'text-number',
			prefix: 'INV-',
			suffix: '',
			start: 2,
			step: 1,
			pad: 3
		});
	});

	it('numbers a single piece of text from where it stands', () => {
		expect(detectSeries(['Week 7'])).toEqual({
			kind: 'text-number',
			prefix: 'Week ',
			suffix: '',
			start: 7,
			step: 1,
			pad: 1
		});
	});

	it('refuses a text run whose prefixes differ', () => {
		expect(detectSeries(['INV-1', 'REC-2'])).toEqual({ kind: 'repeat', values: ['INV-1', 'REC-2'] });
	});

	it('repeats when the run is empty or all empty', () => {
		expect(detectSeries([])).toEqual({ kind: 'repeat', values: [] });
		expect(detectSeries([null, null])).toEqual({ kind: 'repeat', values: [null, null] });
	});

	it('repeats a mixed run rather than guessing which type wins', () => {
		expect(detectSeries([1, 'two'])).toEqual({ kind: 'repeat', values: [1, 'two'] });
	});
});

describe('fillValues', () => {
	it('continues a number run', () => {
		expect(fillValues([1, 2, 3], 3)).toEqual([4, 5, 6]);
	});

	it('continues a descending run past zero, because a spreadsheet does not stop there', () => {
		expect(fillValues([2, 1], 3)).toEqual([0, -1, -2]);
	});

	it('continues a numbered text run, keeping the padding', () => {
		expect(fillValues(['INV-008', 'INV-009'], 2)).toEqual(['INV-010', 'INV-011']);
	});

	it('cycles a repeated run', () => {
		expect(fillValues(['North', 'South'], 5)).toEqual(['North', 'South', 'North', 'South', 'North']);
	});

	it('cycles a single value, which is the common case of dragging one cell down', () => {
		expect(fillValues(['Pending'], 3)).toEqual(['Pending', 'Pending', 'Pending']);
	});

	it('gives nothing when nothing is asked for', () => {
		expect(fillValues([1, 2], 0)).toEqual([]);
		expect(fillValues([1, 2], -4)).toEqual([]);
	});

	it('gives nulls when the source is empty rather than failing', () => {
		expect(fillValues([], 2)).toEqual([null, null]);
	});

	it('rounds away the drift of repeated decimal addition', () => {
		expect(fillValues([0.1, 0.2], 2)).toEqual([0.3, 0.4]);
	});
});
