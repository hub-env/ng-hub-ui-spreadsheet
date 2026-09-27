import { describe, expect, it } from 'vitest';
import { HubFormulaToken, tokenizeFormula } from './formula-tokens';

/** The kinds of the tokens, with the spaces dropped so a case reads as its parts. */
function kinds(source: string): string[] {
	return tokenizeFormula(source)
		.filter((token) => token.kind !== 'space')
		.map((token) => token.kind);
}

/** The tokens of a kind, so a case can say what a piece was. */
function ofKind(source: string, kind: HubFormulaToken['kind']): string[] {
	return tokenizeFormula(source)
		.filter((token) => token.kind === kind)
		.map((token) => token.text);
}

describe('tokenizeFormula', () => {
	it('puts the source back together, character for character', () => {
		for (const source of ['=SUM([units] * 2)', '=A1:B2 & "x"', '=ROUND([total] * 0.21, 2)', 'Tornillo 5']) {
			expect(
				tokenizeFormula(source)
					.map((token) => token.text)
					.join('')
			).toBe(source);
		}
	});

	it('reads the leading equals as the formula marker and the rest as operators', () => {
		expect(kinds('=A1 = 2')).toEqual(['equals', 'coordinate', 'operator', 'number']);
	});

	it('tells a function, a column, a place and a literal apart', () => {
		expect(kinds('=ROUND([total] * 0.21, 2)')).toEqual([
			'equals',
			'function',
			'paren',
			'column',
			'operator',
			'number',
			'separator',
			'number',
			'paren'
		]);
	});

	it('keeps a rectangle of places as one reference', () => {
		expect(ofKind('=SUM(B3:D7)', 'coordinate')).toEqual(['B3:D7']);
	});

	it('reads a place on its own', () => {
		expect(ofKind('=A1 + B2', 'coordinate')).toEqual(['A1', 'B2']);
	});

	it('knows TRUE and FALSE from an ordinary name', () => {
		expect(kinds('=IF(TRUE, 1, 0)')).toEqual([
			'equals',
			'function',
			'paren',
			'boolean',
			'separator',
			'number',
			'separator',
			'number',
			'paren'
		]);
	});

	it('takes a quoted string whole, doubled quotes and all', () => {
		expect(ofKind('="a ""b"" c"', 'text')).toEqual(['"a ""b"" c"']);
	});

	it('reads the two-character operators before their halves', () => {
		expect(ofKind('=A1<=B2', 'operator')).toEqual(['<=']);
	});

	it('leaves a word nothing answers to plain', () => {
		expect(kinds('=units')).toEqual(['equals', 'plain']);
	});

	it('leaves an unclosed bracket or quote plain rather than inventing the end', () => {
		expect(kinds('=SUM([units')).toEqual(['equals', 'function', 'paren', 'plain']);
		expect(kinds('="open')).toEqual(['equals', 'plain']);
	});

	it('does not highlight anything in a value that is not a formula', () => {
		expect(kinds('Tornillo 5')).toEqual(['plain', 'number']);
	});
});
