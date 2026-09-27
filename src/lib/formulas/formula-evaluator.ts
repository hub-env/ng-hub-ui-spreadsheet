import {
	HubFormula,
	HubFormulaContext,
	HubFormulaFailure,
	HubFormulaNode,
	HubFormulaOutcome,
	HubFormulaValue
} from './formula.types';

/**
 * Running a parsed formula against the sheet around it.
 *
 * The rules are a spreadsheet's rather than a programming language's, which is what a reader
 * expects: an empty cell is nought in arithmetic and an empty string in text, `TRUE` is one, and
 * dividing by nought is an error rather than infinity.
 */

/** Whether what came back is a failure. */
function failed(value: unknown): value is HubFormulaFailure {
	return (
		typeof value === 'object' && value !== null && 'ok' in (value as object) && (value as HubFormulaFailure).ok === false
	);
}

/**
 * A value as a number.
 *
 * An empty cell counts as nought, as it does in a spreadsheet — a column of figures with gaps adds
 * up rather than refusing. Text that is not a number is an error and not a silent nought: `"abc" *
 * 2` is a mistake worth seeing.
 */
function asNumber(value: HubFormulaValue): number | HubFormulaFailure {
	if (value === null || value === '') {
		return 0;
	}

	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : { ok: false, code: 'type' };
	}

	if (typeof value === 'boolean') {
		return value ? 1 : 0;
	}

	const parsed = Number(String(value).replace(',', '.'));

	return Number.isFinite(parsed) ? parsed : { ok: false, code: 'type', at: String(value) };
}

/** A value as text, where an empty cell is an empty string rather than the word "null". */
function asText(value: HubFormulaValue): string {
	if (value === null) {
		return '';
	}

	if (typeof value === 'boolean') {
		return value ? 'TRUE' : 'FALSE';
	}

	return String(value);
}

/** Whether a value counts as yes. */
function asBoolean(value: HubFormulaValue): boolean {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		return value !== 0;
	}

	return value !== null && value !== '' && value.toUpperCase() !== 'FALSE';
}

/** Every number in a list of values and lists, with the empties left out. */
function numbersOf(values: readonly (HubFormulaValue | readonly HubFormulaValue[])[]): number[] | HubFormulaFailure {
	const numbers: number[] = [];

	for (const value of values) {
		if (Array.isArray(value)) {
			const nested = numbersOf(value);

			if (failed(nested)) {
				return nested;
			}

			numbers.push(...nested);
			continue;
		}

		const single = value as HubFormulaValue;

		// A gap in a column is not a nought to average against: SUM of three figures and two
		// blanks is the sum of three figures, and AVERAGE of them divides by three.
		if (single === null || single === '') {
			continue;
		}

		const number = asNumber(single);

		if (failed(number)) {
			return number;
		}

		numbers.push(number);
	}

	return numbers;
}

/** What a function is handed: values, and whole columns as lists. */
type Argument = HubFormulaValue | readonly HubFormulaValue[];

/**
 * Runs a formula.
 *
 * @param formula - What {@link parseFormula} gave back.
 * @param context - How to reach the sheet: this row's cells, and whole columns.
 * @returns The value, or what went wrong.
 */
export function evaluateFormula(formula: HubFormula, context: HubFormulaContext): HubFormulaOutcome {
	function walk(node: HubFormulaNode): Argument | HubFormulaFailure {
		switch (node.kind) {
			case 'number':
			case 'text':
			case 'boolean':
				return node.value;

			case 'cell': {
				const value = context.cell(node.alias);

				// Undefined is "no such column", which is a mistake; null is an empty cell, which
				// is not. Collapsing the two is how a typo in an alias comes out as nought.
				return value === undefined ? { ok: false, code: 'name', at: node.alias } : value;
			}

			case 'column': {
				const values = context.column(node.alias);

				return values === undefined ? { ok: false, code: 'name', at: node.alias } : values;
			}

			case 'at': {
				const value = context.at?.(node.row, node.col);

				// A place outside the sheet is a mistake, not an empty cell: a formula that points
				// off the edge should say so rather than quietly read nothing.
				return value === undefined ? { ok: false, code: 'name', at: 'ref' } : value;
			}

			case 'area': {
				const values = context.area?.(node.top, node.left, node.bottom, node.right);

				return values === undefined ? { ok: false, code: 'name', at: 'ref' } : values;
			}

			case 'unary': {
				const operand = walk(node.operand);

				if (failed(operand)) {
					return operand;
				}

				const number = asNumber(operand as HubFormulaValue);

				if (failed(number)) {
					return number;
				}

				return node.operator === '-' ? -number : number;
			}

			case 'binary':
				return binary(node);

			case 'call':
				return call(node);
		}
	}

	function binary(node: Extract<HubFormulaNode, { kind: 'binary' }>): Argument | HubFormulaFailure {
		const left = walk(node.left);

		if (failed(left)) {
			return left;
		}

		const right = walk(node.right);

		if (failed(right)) {
			return right;
		}

		const a = left as HubFormulaValue;
		const b = right as HubFormulaValue;

		if (node.operator === '&') {
			return asText(a) + asText(b);
		}

		if (['=', '<>', '<', '<=', '>', '>='].includes(node.operator)) {
			return compare(node.operator, a, b);
		}

		const x = asNumber(a);

		if (failed(x)) {
			return x;
		}

		const y = asNumber(b);

		if (failed(y)) {
			return y;
		}

		switch (node.operator) {
			case '+':
				return x + y;
			case '-':
				return x - y;
			case '*':
				return x * y;
			case '/':
				return y === 0 ? { ok: false, code: 'divide-by-zero' } : x / y;
			case '^':
				return x ** y;
		}

		return { ok: false, code: 'syntax', at: node.operator };
	}

	/** Two values compared the way a reader means it: numbers as numbers, text as text. */
	function compare(operator: string, a: HubFormulaValue, b: HubFormulaValue): boolean {
		const bothNumbers = typeof a !== 'string' && typeof b !== 'string';
		const x = bothNumbers ? (asNumber(a) as number) : asText(a);
		const y = bothNumbers ? (asNumber(b) as number) : asText(b);

		switch (operator) {
			case '=':
				return x === y;
			case '<>':
				return x !== y;
			case '<':
				return x < y;
			case '<=':
				return x <= y;
			case '>':
				return x > y;
			default:
				return x >= y;
		}
	}

	function call(node: Extract<HubFormulaNode, { kind: 'call' }>): Argument | HubFormulaFailure {
		const args: Argument[] = [];

		// IF decides which branch to run, so its arguments are not all worked out up front: a
		// division by nought on the branch that is not taken is not an error the reader made.
		if (node.name === 'IF') {
			if (node.args.length < 2 || node.args.length > 3) {
				return { ok: false, code: 'type', at: 'IF' };
			}

			const condition = walk(node.args[0]);

			if (failed(condition)) {
				return condition;
			}

			if (asBoolean(condition as HubFormulaValue)) {
				return walk(node.args[1]);
			}

			return node.args[2] ? walk(node.args[2]) : false;
		}

		for (const argument of node.args) {
			const value = walk(argument);

			if (failed(value)) {
				return value;
			}

			args.push(value);
		}

		return apply(node.name, args);
	}

	function apply(name: string, args: readonly Argument[]): Argument | HubFormulaFailure {
		switch (name) {
			case 'SUM':
			case 'AVERAGE':
			case 'AVG':
			case 'MIN':
			case 'MAX': {
				const numbers = numbersOf(args);

				if (failed(numbers)) {
					return numbers;
				}

				if (name === 'SUM') {
					return numbers.reduce((total, value) => total + value, 0);
				}

				if (!numbers.length) {
					// Nothing to average, and nothing to take the least or the most of.
					return name === 'MIN' || name === 'MAX' ? 0 : { ok: false, code: 'divide-by-zero' };
				}

				if (name === 'MIN') {
					return Math.min(...numbers);
				}

				if (name === 'MAX') {
					return Math.max(...numbers);
				}

				return numbers.reduce((total, value) => total + value, 0) / numbers.length;
			}

			case 'COUNT': {
				const numbers = numbersOf(args);

				return failed(numbers) ? 0 : numbers.length;
			}

			case 'ROUND': {
				const value = asNumber(args[0] as HubFormulaValue);

				if (failed(value)) {
					return value;
				}

				const places = args.length > 1 ? asNumber(args[1] as HubFormulaValue) : 0;

				if (failed(places)) {
					return places;
				}

				const factor = 10 ** places;

				return Math.round(value * factor) / factor;
			}

			case 'ABS': {
				const value = asNumber(args[0] as HubFormulaValue);

				return failed(value) ? value : Math.abs(value);
			}

			case 'AND':
				return args.every((value) => asBoolean(value as HubFormulaValue));

			case 'OR':
				return args.some((value) => asBoolean(value as HubFormulaValue));

			case 'NOT':
				return !asBoolean(args[0] as HubFormulaValue);

			case 'CONCAT':
				return args.map((value) => asText(value as HubFormulaValue)).join('');

			case 'LEN':
				return asText(args[0] as HubFormulaValue).length;

			default:
				return { ok: false, code: 'name', at: name };
		}
	}

	const result = walk(formula.node);

	if (failed(result)) {
		return result;
	}

	// A whole column where a single value was wanted: SUM() takes one, but a cell cannot show one.
	if (Array.isArray(result)) {
		return { ok: false, code: 'type' };
	}

	return { ok: true, value: result as HubFormulaValue };
}
