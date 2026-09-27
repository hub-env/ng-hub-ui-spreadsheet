import { describe, expect, it } from 'vitest';
import { applySuggestion, formulaFragment, suggestFormula } from './formula-suggest';

const vocabulary = { aliases: ['price', 'units', 'product'], titles: { price: 'Precio', units: 'Unidades' } };

describe('formulaFragment', () => {
	it('is the word being typed', () => {
		expect(formulaFragment('=SU')).toMatchObject({ text: 'SU', inBrackets: false, start: 1 });
	});

	it('knows when the reader is inside brackets, where a column belongs', () => {
		expect(formulaFragment('=[pri')).toMatchObject({ text: 'pri', inBrackets: true, start: 2 });
	});

	it('is done with the brackets once they are closed', () => {
		expect(formulaFragment('=[price] * UN')).toMatchObject({ text: 'UN', inBrackets: false });
	});

	it('is empty right after an operator, which is when everything is still possible', () => {
		expect(formulaFragment('=[price] * ')).toMatchObject({ text: '', inBrackets: false });
	});
});

describe('suggestFormula', () => {
	it('offers nothing at all for something that is not a formula', () => {
		expect(suggestFormula('12', vocabulary)).toEqual([]);
	});

	it('offers everything to somebody who has just typed an equals sign', () => {
		const suggestions = suggestFormula('=', vocabulary);

		expect(suggestions.some((entry) => entry.kind === 'function')).toBe(true);
		expect(suggestions.some((entry) => entry.label === 'price')).toBe(true);
	});

	it('narrows to what has been typed', () => {
		expect(suggestFormula('=SU', vocabulary).map((entry) => entry.label)).toEqual(['SUM']);
	});

	it('offers only columns inside brackets, since a function cannot go there', () => {
		const suggestions = suggestFormula('=[p', vocabulary);

		expect(suggestions.map((entry) => entry.label)).toEqual(['price', 'product']);
		expect(suggestions.every((entry) => entry.kind === 'column')).toBe(true);
	});

	it('shows what a column is called on screen, which is not what the formula calls it', () => {
		expect(suggestFormula('=[pri', vocabulary)[0]).toMatchObject({ label: 'price', hint: 'Precio' });
	});

	it('brings its own brackets when there are none yet', () => {
		expect(suggestFormula('=pri', vocabulary)[0]?.insert).toBe('[price]');
	});
});

describe('applySuggestion', () => {
	it('replaces the word being typed rather than appending to it', () => {
		const suggestion = suggestFormula('=SU', vocabulary)[0];

		expect(applySuggestion('=SU', suggestion)).toEqual({ draft: '=SUM(', caret: 5 });
	});

	it('closes the bracket it opened, and does not double one already there', () => {
		const suggestion = suggestFormula('=[pri', vocabulary)[0];

		expect(applySuggestion('=[pri', suggestion).draft).toBe('=[price]');
		expect(applySuggestion('=[pri]', suggestion, 5).draft).toBe('=[price]');
	});

	it('leaves what comes after the caret where it was', () => {
		const suggestion = suggestFormula('=[pri', vocabulary)[0];

		expect(applySuggestion('=[pri * 2', suggestion, 5).draft).toBe('=[price] * 2');
	});

	it('leaves the caret where the next thing is typed', () => {
		const suggestion = suggestFormula('=[pri', vocabulary)[0];

		expect(applySuggestion('=[pri', suggestion).caret).toBe(8);
	});
});
