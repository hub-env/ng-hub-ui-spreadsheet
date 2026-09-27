import { parseCoordinate } from './formula-coordinates';
import { HubFormula, HubFormulaFailure, HubFormulaNode } from './formula.types';

/**
 * Turning the text of a formula into something that can be run.
 *
 * Hand-written rather than generated, and deliberately: a grammar this small is a page of code,
 * and a parser generator would be a dependency, a build step and a licence to check for the sake
 * of it. What it costs is that the precedence is written out by hand — which is also what makes it
 * readable.
 *
 * Precedence, loosest first, as in a spreadsheet:
 *
 *     comparison   =  <>  <  <=  >  >=
 *     concatenation &
 *     additive     +  -
 *     multiplicative *  /
 *     power        ^
 *     unary        -  +
 *     primary      number, text, TRUE/FALSE, [alias], [alias:], NAME(…), ( … )
 */

/** Whether a stored value is a formula rather than a value. */
export function isFormula(value: unknown): value is string {
	return typeof value === 'string' && value.trimStart().startsWith('=');
}

type Token =
	| { kind: 'number'; value: number }
	| { kind: 'text'; value: string }
	| { kind: 'reference'; alias: string; whole: boolean }
	| { kind: 'name'; value: string }
	| { kind: 'symbol'; value: string };

const SYMBOLS = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '&', '=', '<', '>', '(', ')', ',', ';', ':'];

/** Splits the text into the pieces the parser walks, or says where it gave up. */
function tokenise(source: string): Token[] | HubFormulaFailure {
	const tokens: Token[] = [];
	let index = 0;

	while (index < source.length) {
		const char = source[index];

		if (/\s/.test(char)) {
			index++;
			continue;
		}

		// A reference: [alias] for this row, [alias:] for the whole column.
		if (char === '[') {
			const end = source.indexOf(']', index);

			if (end < 0) {
				return { ok: false, code: 'syntax', at: '[' };
			}

			const inside = source.slice(index + 1, end);
			const whole = inside.endsWith(':');
			const alias = (whole ? inside.slice(0, -1) : inside).trim();

			if (!alias) {
				return { ok: false, code: 'syntax', at: '[]' };
			}

			tokens.push({ kind: 'reference', alias, whole });
			index = end + 1;
			continue;
		}

		// A quoted string. Two quotes in a row are one quote, as in a spreadsheet.
		if (char === '"') {
			let text = '';
			index++;

			for (;;) {
				if (index >= source.length) {
					return { ok: false, code: 'syntax', at: '"' };
				}

				if (source[index] === '"') {
					if (source[index + 1] === '"') {
						text += '"';
						index += 2;
						continue;
					}

					index++;
					break;
				}

				text += source[index];
				index++;
			}

			tokens.push({ kind: 'text', value: text });
			continue;
		}

		if (/[0-9.]/.test(char)) {
			const match = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?/.exec(source.slice(index));

			if (!match) {
				return { ok: false, code: 'syntax', at: char };
			}

			tokens.push({ kind: 'number', value: Number(match[0]) });
			index += match[0].length;
			continue;
		}

		if (/[A-Za-z_]/.test(char)) {
			const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(index))!;

			tokens.push({ kind: 'name', value: match[0] });
			index += match[0].length;
			continue;
		}

		const symbol = SYMBOLS.find((candidate) => source.startsWith(candidate, index));

		if (!symbol) {
			return { ok: false, code: 'syntax', at: char };
		}

		tokens.push({ kind: 'symbol', value: symbol });
		index += symbol.length;
	}

	return tokens;
}

/** Whether what came back is a failure rather than what was asked for. */
function failed<T>(value: T | HubFormulaFailure): value is HubFormulaFailure {
	return typeof value === 'object' && value !== null && 'ok' in value && (value as HubFormulaFailure).ok === false;
}

/**
 * Reads the text of a formula, with or without its leading `=`.
 *
 * @returns The parsed formula, or the first thing that did not make sense.
 */
export function parseFormula(source: string): HubFormula | HubFormulaFailure {
	const text = source.trimStart().startsWith('=') ? source.trimStart().slice(1) : source;
	const tokens = tokenise(text);

	if (failed(tokens)) {
		return tokens;
	}

	let at = 0;

	const peek = (): Token | undefined => tokens[at];
	const eat = (value: string): boolean => {
		const token = peek();

		if (token?.kind === 'symbol' && token.value === value) {
			at++;

			return true;
		}

		return false;
	};

	const cells = new Set<string>();
	const columns = new Set<string>();
	let coordinates = false;

	function parseExpression(): HubFormulaNode | HubFormulaFailure {
		return parseComparison();
	}

	function parseComparison(): HubFormulaNode | HubFormulaFailure {
		let left = parseConcat();

		if (failed(left)) {
			return left;
		}

		for (;;) {
			const token = peek();
			const operator = token?.kind === 'symbol' ? token.value : '';

			if (!['=', '<>', '<', '<=', '>', '>='].includes(operator)) {
				return left;
			}

			at++;

			const right = parseConcat();

			if (failed(right)) {
				return right;
			}

			left = { kind: 'binary', operator: operator as '=', left, right };
		}
	}

	function parseConcat(): HubFormulaNode | HubFormulaFailure {
		let left = parseAdditive();

		if (failed(left)) {
			return left;
		}

		while (eat('&')) {
			const right = parseAdditive();

			if (failed(right)) {
				return right;
			}

			left = { kind: 'binary', operator: '&', left, right };
		}

		return left;
	}

	function parseAdditive(): HubFormulaNode | HubFormulaFailure {
		let left = parseMultiplicative();

		if (failed(left)) {
			return left;
		}

		for (;;) {
			const token = peek();
			const operator = token?.kind === 'symbol' ? token.value : '';

			if (operator !== '+' && operator !== '-') {
				return left;
			}

			at++;

			const right = parseMultiplicative();

			if (failed(right)) {
				return right;
			}

			left = { kind: 'binary', operator, left, right };
		}
	}

	function parseMultiplicative(): HubFormulaNode | HubFormulaFailure {
		let left = parsePower();

		if (failed(left)) {
			return left;
		}

		for (;;) {
			const token = peek();
			const operator = token?.kind === 'symbol' ? token.value : '';

			if (operator !== '*' && operator !== '/') {
				return left;
			}

			at++;

			const right = parsePower();

			if (failed(right)) {
				return right;
			}

			left = { kind: 'binary', operator, left, right };
		}
	}

	function parsePower(): HubFormulaNode | HubFormulaFailure {
		const left = parseUnary();

		if (failed(left)) {
			return left;
		}

		if (!eat('^')) {
			return left;
		}

		// Right to left, as everywhere else: 2^3^2 is 2^(3^2).
		const right = parsePower();

		if (failed(right)) {
			return right;
		}

		return { kind: 'binary', operator: '^', left, right };
	}

	function parseUnary(): HubFormulaNode | HubFormulaFailure {
		const token = peek();

		if (token?.kind === 'symbol' && (token.value === '-' || token.value === '+')) {
			at++;

			const operand = parseUnary();

			if (failed(operand)) {
				return operand;
			}

			return { kind: 'unary', operator: token.value, operand };
		}

		return parsePrimary();
	}

	function parsePrimary(): HubFormulaNode | HubFormulaFailure {
		const token = peek();

		if (!token) {
			return { ok: false, code: 'syntax', at: 'end' };
		}

		if (token.kind === 'number') {
			at++;

			return { kind: 'number', value: token.value };
		}

		if (token.kind === 'text') {
			at++;

			return { kind: 'text', value: token.value };
		}

		if (token.kind === 'reference') {
			at++;

			if (token.whole) {
				columns.add(token.alias);

				return { kind: 'column', alias: token.alias };
			}

			cells.add(token.alias);

			return { kind: 'cell', alias: token.alias };
		}

		if (token.kind === 'name') {
			at++;

			const upper = token.value.toUpperCase();

			if (upper === 'TRUE' || upper === 'FALSE') {
				return { kind: 'boolean', value: upper === 'TRUE' };
			}

			// A place: `B3`, or `B3:D7` for a rectangle of them. Written the way a spreadsheet
			// writes it, because that is what somebody arriving from one will type.
			const place = parseCoordinate(token.value);

			if (place) {
				coordinates = true;

				if (!eat(':')) {
					return { kind: 'at', row: place.row, col: place.col };
				}

				const next = peek();
				const far = next?.kind === 'name' ? parseCoordinate(next.value) : null;

				if (!far) {
					return { ok: false, code: 'syntax', at: ':' };
				}

				at++;

				return {
					kind: 'area',
					top: Math.min(place.row, far.row),
					left: Math.min(place.col, far.col),
					bottom: Math.max(place.row, far.row),
					right: Math.max(place.col, far.col)
				};
			}

			if (!eat('(')) {
				// A bare word is a name nothing answers to — the reader probably meant a column,
				// which is written in brackets.
				return { ok: false, code: 'name', at: token.value };
			}

			const args: HubFormulaNode[] = [];

			if (!eat(')')) {
				for (;;) {
					const argument = parseExpression();

					if (failed(argument)) {
						return argument;
					}

					args.push(argument);

					// A comma or a semicolon: the same separator wears both costumes depending on
					// where the reader learnt to write formulas.
					if (eat(',') || eat(';')) {
						continue;
					}

					if (eat(')')) {
						break;
					}

					return { ok: false, code: 'syntax', at: ')' };
				}
			}

			return { kind: 'call', name: upper, args };
		}

		if (token.value === '(') {
			at++;

			const inner = parseExpression();

			if (failed(inner)) {
				return inner;
			}

			if (!eat(')')) {
				return { ok: false, code: 'syntax', at: ')' };
			}

			return inner;
		}

		return { ok: false, code: 'syntax', at: token.value };
	}

	const node = parseExpression();

	if (failed(node)) {
		return node;
	}

	if (at < tokens.length) {
		const rest = tokens[at];

		return { ok: false, code: 'syntax', at: rest.kind === 'symbol' || rest.kind === 'name' ? String(rest.value) : 'end' };
	}

	return { node, cells: [...cells], columns: [...columns], coordinates };
}
