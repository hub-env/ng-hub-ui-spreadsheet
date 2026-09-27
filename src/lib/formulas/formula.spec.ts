import { describe, expect, it } from 'vitest';
import { evaluateFormula } from './formula-evaluator';
import { isFormula, parseFormula } from './formula-parser';
import { HubFormula, HubFormulaContext, HubFormulaFailure, HubFormulaValue } from './formula.types';

/** A sheet of three rows, seen from the second one. */
function sheet(overrides: Record<string, HubFormulaValue> = {}): HubFormulaContext {
	const rows = [
		{ price: 10, units: 3, name: 'Bolt' },
		{ price: 20, units: 4, name: 'Nut' },
		{ price: null as HubFormulaValue, units: 5, name: 'Washer' }
	];

	return {
		// `??` would take an override of null for no override at all, which is the very case these
		// tests are about.
		cell: (alias) => (alias in overrides ? overrides[alias] : alias in rows[1] ? (rows[1] as never)[alias] : undefined),
		column: (alias) => (alias in rows[0] ? rows.map((row) => (row as never)[alias]) : undefined)
	};
}

/** Runs a formula against that sheet, or explodes with why it could not be read. */
function run(source: string, context: HubFormulaContext = sheet()): HubFormulaValue | HubFormulaFailure {
	const parsed = parseFormula(source);

	if ('ok' in parsed) {
		return parsed;
	}

	const outcome = evaluateFormula(parsed as HubFormula, context);

	return outcome.ok ? outcome.value : outcome;
}

describe('isFormula', () => {
	it('is anything that starts with an equals sign, spaces and all', () => {
		expect(isFormula('=1+1')).toBe(true);
		expect(isFormula('   =SUM([price:])')).toBe(true);
	});

	it('is not a number, a word, or an empty cell', () => {
		expect(isFormula('1+1')).toBe(false);
		expect(isFormula(12)).toBe(false);
		expect(isFormula(null)).toBe(false);
	});
});

describe('arithmetic', () => {
	it('adds, subtracts, multiplies and divides', () => {
		expect(run('=2+3')).toBe(5);
		expect(run('=10-4')).toBe(6);
		expect(run('=6*7')).toBe(42);
		expect(run('=9/2')).toBe(4.5);
	});

	it('gives multiplication its place before addition', () => {
		expect(run('=2+3*4')).toBe(14);
		expect(run('=(2+3)*4')).toBe(20);
	});

	it('raises to a power, right to left as everywhere else', () => {
		expect(run('=2^3^2')).toBe(512);
	});

	it('takes a sign in front of anything', () => {
		expect(run('=-3+10')).toBe(7);
		expect(run('=-(2+3)')).toBe(-5);
	});

	it('refuses to divide by nought rather than answering infinity', () => {
		expect(run('=1/0')).toMatchObject({ ok: false, code: 'divide-by-zero' });
	});
});

describe('references', () => {
	it('reads this row by the column alias', () => {
		expect(run('=[price] * [units]')).toBe(80);
	});

	it('reads a whole column when the alias ends in a colon', () => {
		expect(run('=SUM([price:])')).toBe(30);
	});

	it('tells an alias nothing answers to apart from an empty cell', () => {
		expect(run('=[nosuch] + 1')).toMatchObject({ ok: false, code: 'name', at: 'nosuch' });
		expect(run('=[price] + 1', sheet({ price: null }))).toBe(1);
	});

	it('counts an empty cell as nought in arithmetic, the way a spreadsheet does', () => {
		expect(run('=[price] * 2', sheet({ price: null }))).toBe(0);
	});
});

describe('functions', () => {
	it('adds a column up, leaving the gaps out', () => {
		// Three rows, one of them empty: the sum is of the two that are not.
		expect(run('=SUM([price:])')).toBe(30);
		expect(run('=COUNT([price:])')).toBe(2);
	});

	it('averages over what is there rather than over what could have been', () => {
		expect(run('=AVERAGE([price:])')).toBe(15);
	});

	it('takes the least and the most', () => {
		expect(run('=MIN([price:])')).toBe(10);
		expect(run('=MAX([price:])')).toBe(20);
	});

	it('rounds, to a given number of places', () => {
		expect(run('=ROUND(2.345, 2)')).toBe(2.35);
		expect(run('=ROUND(2.5)')).toBe(3);
	});

	it('decides with IF, and only runs the branch it takes', () => {
		expect(run('=IF([units] > 3, "many", "few")')).toBe('many');
		expect(run('=IF([units] > 30, 1/0, "safe")')).toBe('safe');
	});

	it('joins text, with an empty cell as an empty string and not as a word', () => {
		expect(run('=[name] & " x" & [units]')).toBe('Nut x4');
		expect(run('=[price] & "!"', sheet({ price: null }))).toBe('!');
	});

	it('answers yes and no', () => {
		expect(run('=AND([units] > 1, [price] > 1)')).toBe(true);
		expect(run('=OR(FALSE, [units] = 4)')).toBe(true);
		expect(run('=NOT(TRUE)')).toBe(false);
	});

	it('refuses a function nobody has heard of, by name', () => {
		expect(run('=VLOOKUP(1)')).toMatchObject({ ok: false, code: 'name', at: 'VLOOKUP' });
	});

	it('takes a semicolon between arguments as readily as a comma', () => {
		expect(run('=ROUND(2.345; 2)')).toBe(2.35);
	});
});

describe('comparison', () => {
	it('compares numbers as numbers and words as words', () => {
		expect(run('=2 < 10')).toBe(true);
		expect(run('="b" > "a"')).toBe(true);
		expect(run('=[name] = "Nut"')).toBe(true);
		expect(run('=[name] <> "Nut"')).toBe(false);
	});
});

describe('what a formula cannot be', () => {
	it('says where it gave up on a bracket left open', () => {
		expect(run('=SUM([price:]')).toMatchObject({ ok: false, code: 'syntax' });
		expect(run('=[price')).toMatchObject({ ok: false, code: 'syntax', at: '[' });
	});

	it('refuses an operator with nothing after it', () => {
		expect(run('=1 +')).toMatchObject({ ok: false, code: 'syntax', at: 'end' });
	});

	it('refuses a bare word, which is a column written without its brackets', () => {
		expect(run('=price * 2')).toMatchObject({ ok: false, code: 'name', at: 'price' });
	});

	it('refuses arithmetic on words', () => {
		expect(run('=[name] * 2')).toMatchObject({ ok: false, code: 'type' });
	});

	it('will not let a whole column be the answer, since a cell cannot show one', () => {
		expect(run('=[price:]')).toMatchObject({ ok: false, code: 'type' });
	});
});

describe('what a formula says it reads', () => {
	it('names the cells and the columns, which is what a redraw is decided on', () => {
		const parsed = parseFormula('=[price] * [units] + SUM([price:])') as HubFormula;

		expect([...parsed.cells].sort()).toEqual(['price', 'units']);
		expect(parsed.columns).toEqual(['price']);
	});
});
