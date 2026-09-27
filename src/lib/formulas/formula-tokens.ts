import { parseCoordinate } from './formula-coordinates';

/**
 * Splitting the text of a formula into the pieces a reader sees, so the sheet can draw them apart.
 *
 * A formula is a little grammar — a function here, a column alias there, a literal, an operator —
 * and in a plain field it all reads as one grey line of characters. Naming each piece is what lets
 * the editor colour it the way a spreadsheet does, so the shape of an expression is legible before
 * it is run rather than only after it is wrong.
 *
 * Deliberately not the parser: this one never refuses and never throws, because it runs on the
 * text of every keystroke, including the half-typed ones no grammar accepts. Whatever it cannot
 * place is `plain`, and the concatenation of the tokens is always the source, character for
 * character, which is what lets them be drawn behind a field that still owns the text.
 */

/** What a piece of a formula is, as far as a reader is concerned. */
export type HubFormulaTokenKind =
	/** The leading `=`, which is what says the rest is a formula at all. */
	| 'equals'
	/** A name that opens a bracket: `SUM(`. */
	| 'function'
	/** A column named the way formulas name them: `[units]`, `[total:]`. */
	| 'column'
	/** A place, or a rectangle of them: `B3`, `B3:D7`. */
	| 'coordinate'
	| 'number'
	/** A quoted string. */
	| 'text'
	/** `TRUE` or `FALSE`. */
	| 'boolean'
	/** `+`, `-`, `<=` … */
	| 'operator'
	/** `(` `)`. */
	| 'paren'
	/** `,` `;` `:`. */
	| 'separator'
	| 'space'
	/** Anything else: a word nothing answers to, a bracket left open. */
	| 'plain';

/** One piece of a formula. */
export interface HubFormulaToken {
	readonly kind: HubFormulaTokenKind;
	/** Exactly the characters it covers, so the tokens rebuild the source. */
	readonly text: string;
}

const OPERATORS = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '&', '=', '<', '>'];
const NUMBER = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?/;
const NAME = /^[A-Za-z_][A-Za-z0-9_.]*/;

/** The next character that is not a space, from a position. */
function nextSignificant(source: string, from: number): number {
	let index = from;

	while (index < source.length && /\s/.test(source[index])) {
		index++;
	}

	return index;
}

/**
 * Names every piece of a formula.
 *
 * @param source - The text, `=` and all, as the reader is typing it.
 * @returns The tokens in order, which joined back up are `source` again.
 */
export function tokenizeFormula(source: string): readonly HubFormulaToken[] {
	const tokens: HubFormulaToken[] = [];
	let index = 0;
	let leading = true;

	while (index < source.length) {
		const char = source[index];

		if (/\s/.test(char)) {
			const end = nextSignificant(source, index);

			tokens.push({ kind: 'space', text: source.slice(index, end) });
			index = end;
			continue;
		}

		// Only the first `=` opens the formula; every other one is a comparison.
		if (char === '=' && leading) {
			tokens.push({ kind: 'equals', text: '=' });
			index++;
			leading = false;
			continue;
		}

		leading = false;

		// A column, brackets and all. An unclosed one is left plain rather than guessed at.
		if (char === '[') {
			const end = source.indexOf(']', index);

			if (end < 0) {
				tokens.push({ kind: 'plain', text: source.slice(index) });
				break;
			}

			tokens.push({ kind: 'column', text: source.slice(index, end + 1) });
			index = end + 1;
			continue;
		}

		// A quoted string, doubled quotes and all. Unterminated stays plain.
		if (char === '"') {
			let end = index + 1;
			let closed = false;

			while (end < source.length) {
				if (source[end] === '"') {
					if (source[end + 1] === '"') {
						end += 2;
						continue;
					}

					end++;
					closed = true;
					break;
				}

				end++;
			}

			tokens.push({ kind: closed ? 'text' : 'plain', text: source.slice(index, end) });
			index = end;
			continue;
		}

		if (/[0-9.]/.test(char)) {
			const match = NUMBER.exec(source.slice(index));

			if (!match) {
				tokens.push({ kind: 'plain', text: char });
				index++;
				continue;
			}

			tokens.push({ kind: 'number', text: match[0] });
			index += match[0].length;
			continue;
		}

		if (/[A-Za-z_]/.test(char)) {
			const match = NAME.exec(source.slice(index))!;
			const name = match[0];
			const upper = name.toUpperCase();

			if (upper === 'TRUE' || upper === 'FALSE') {
				tokens.push({ kind: 'boolean', text: name });
				index += name.length;
				continue;
			}

			if (parseCoordinate(name)) {
				// A rectangle reads as one reference, not as two places with a colon between them.
				const colon = nextSignificant(source, index + name.length);

				if (source[colon] === ':') {
					const far = nextSignificant(source, colon + 1);
					const next = NAME.exec(source.slice(far));

					if (next && parseCoordinate(next[0])) {
						const end = far + next[0].length;

						tokens.push({ kind: 'coordinate', text: source.slice(index, end) });
						index = end;
						continue;
					}
				}

				tokens.push({ kind: 'coordinate', text: name });
				index += name.length;
				continue;
			}

			// A function is a name that opens a bracket, however much space is between them.
			if (source[nextSignificant(source, index + name.length)] === '(') {
				tokens.push({ kind: 'function', text: name });
				index += name.length;
				continue;
			}

			tokens.push({ kind: 'plain', text: name });
			index += name.length;
			continue;
		}

		const operator = OPERATORS.find((candidate) => source.startsWith(candidate, index));

		if (operator) {
			tokens.push({ kind: 'operator', text: operator });
			index += operator.length;
			continue;
		}

		if (char === '(' || char === ')') {
			tokens.push({ kind: 'paren', text: char });
			index++;
			continue;
		}

		if (char === ',' || char === ';' || char === ':') {
			tokens.push({ kind: 'separator', text: char });
			index++;
			continue;
		}

		tokens.push({ kind: 'plain', text: char });
		index++;
	}

	return tokens;
}
