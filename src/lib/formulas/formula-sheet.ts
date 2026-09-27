import { HubSpreadsheetColumn, HubSpreadsheetValue } from '../models/spreadsheet.types';
import { evaluateFormula } from './formula-evaluator';
import { isFormula, parseFormula } from './formula-parser';
import { HubFormula, HubFormulaFailure, HubFormulaOutcome, HubFormulaValue } from './formula.types';

/**
 * Working out what every cell of a sheet shows once formulas are in it.
 *
 * A formula reads other cells, and those may be formulas too, so the answer to one can depend on
 * the answer to another. Two things follow, and both are here rather than in the component:
 *
 * - **It has to be worked out in order.** A cell is not ready until everything it reads is ready.
 * - **It has to refuse to go round in circles.** A formula that needs its own result — directly,
 *   or through three others — has no answer, and a sheet that tries to find one stops responding.
 *
 * One rule follows from the second and is worth saying out loud: a whole-column reference leaves
 * out the cell that is asking for it. `=SUM([total:])` written in the total row is what everybody
 * writes and what everybody means, and taken literally it is a sum that needs its own answer.
 * Reading a *different* column is untouched — a total row that sums the prices sums every price.
 */

/** What a cell came to, and where it came from. */
export interface HubFormulaCellResult {
	/** What the cell shows. */
	readonly value: HubSpreadsheetValue;
	/** Set when the cell holds a formula that could not be run. */
	readonly failure?: HubFormulaFailure;
}

/** Every cell of the sheet, keyed by row index and column alias. */
export type HubFormulaSheet = ReadonlyArray<Readonly<Record<string, HubFormulaCellResult>>>;

/** What a sheet of formulas is worked out from. */
export interface HubFormulaSheetInput<TRow> {
	readonly rows: readonly TRow[];
	readonly columns: readonly HubSpreadsheetColumn<TRow>[];
	/**
	 * What a cell holds before any formula is run: a value, or the text of a formula.
	 *
	 * By row index rather than by row, because the caller usually has the grid already worked out
	 * and finding a row's place in a list to read it back is the kind of thing that turns a sheet
	 * of ten thousand rows into a sheet that takes a second to draw.
	 */
	readonly raw: (rowIndex: number, column: HubSpreadsheetColumn<TRow>) => HubSpreadsheetValue;
}

/** A cell's place, as the walk names it. */
type Where = `${number}\t${string}`;

const where = (row: number, alias: string): Where => `${row}\t${alias}`;

/**
 * Runs every formula in a sheet, in whatever order the dependencies demand.
 *
 * Worked out lazily and remembered: a cell is run the first time something needs it, and a column
 * read by twenty rows is not run twenty times. The walk carries the cells it is in the middle of,
 * which is how a circle is caught the moment it closes rather than by counting to a thousand.
 *
 * @returns Every cell of the sheet, ready to be shown.
 */
export function evaluateSheet<TRow>(input: HubFormulaSheetInput<TRow>): HubFormulaSheet {
	const { rows, columns, raw } = input;
	const byAlias = new Map(columns.map((column) => [column.key, column]));
	const done = new Map<Where, HubFormulaCellResult>();
	const parsed = new Map<string, HubFormula | HubFormulaFailure>();
	const running = new Set<Where>();

	/** The formula of a cell, parsed once however many cells hold the same text. */
	function formulaOf(text: string): HubFormula | HubFormulaFailure {
		let result = parsed.get(text);

		if (!result) {
			result = parseFormula(text);
			parsed.set(text, result);
		}

		return result;
	}

	function valueOf(rowIndex: number, alias: string): HubFormulaCellResult {
		const key = where(rowIndex, alias);
		const already = done.get(key);

		if (already) {
			return already;
		}

		const column = byAlias.get(alias);

		if (!column || rowIndex < 0 || rowIndex >= rows.length) {
			return { value: null, failure: { ok: false, code: 'name', at: alias } };
		}

		// A column that carries its own formula answers with it, whatever the row happens to hold.
		// The reader cannot type over one, so what is underneath is not a value that was replaced
		// — it is a value that was never asked for.
		const source = column.formula ?? raw(rowIndex, column);

		if (!isFormula(source)) {
			const plain: HubFormulaCellResult = { value: source };

			done.set(key, plain);

			return plain;
		}

		// Already on the stack: the cell needs itself. Remembered as a failure so the other cells
		// that read it fail the same way instead of starting the walk again.
		if (running.has(key)) {
			const circular: HubFormulaCellResult = { value: null, failure: { ok: false, code: 'cycle', at: alias } };

			done.set(key, circular);

			return circular;
		}

		const formula = formulaOf(source);

		if ('ok' in formula) {
			const broken: HubFormulaCellResult = { value: null, failure: formula };

			done.set(key, broken);

			return broken;
		}

		running.add(key);

		const outcome: HubFormulaOutcome = evaluateFormula(formula, {
			cell: (name) => (byAlias.has(name) ? (valueOf(rowIndex, name).value as HubFormulaValue) : undefined),
			// A whole column leaves out the cell that is asking for it, and only when the cell is
			// in that very column. `=SUM([total:])` written in the total row is what everybody
			// writes and what everybody means; taken at its word it is a sum that needs its own
			// answer, and the reader is shown `#CYCLE!` for asking the obvious thing. Reading a
			// different column is untouched: a total row summing the prices sums every price.
			column: (name) =>
				byAlias.has(name)
					? rows
							.map((_, index) =>
								name === alias && index === rowIndex ? null : (valueOf(index, name).value as HubFormulaValue)
							)
							.filter((_, index) => !(name === alias && index === rowIndex))
					: undefined,
			// A coordinate is the same walk under another name, so a circle drawn with `B3` is
			// caught exactly as one drawn with an alias.
			at: (row, col) => {
				const target = columns[col];

				return target && row >= 0 && row < rows.length
					? (valueOf(row, target.key).value as HubFormulaValue)
					: undefined;
			},
			area: (top, left, bottom, right) => {
				if (left < 0 || right >= columns.length || top < 0 || bottom >= rows.length) {
					return undefined;
				}

				const values: HubFormulaValue[] = [];

				for (let row = top; row <= bottom; row++) {
					for (let col = left; col <= right; col++) {
						// The cell asking is left out of its own rectangle, for the same reason a
						// whole column leaves it out: a total inside the range it totals.
						if (row === rowIndex && columns[col]?.key === alias) {
							continue;
						}

						values.push(valueOf(row, columns[col].key).value as HubFormulaValue);
					}
				}

				return values;
			}
		});

		running.delete(key);

		// A cell that turned out to be part of a circle answers with the circle, not with the
		// half-answer the walk happened to reach before it noticed.
		const settled = done.get(key);

		if (settled?.failure?.code === 'cycle') {
			return settled;
		}

		const result: HubFormulaCellResult = outcome.ok
			? { value: outcome.value as HubSpreadsheetValue }
			: { value: null, failure: outcome };

		done.set(key, result);

		return result;
	}

	return rows.map((_, rowIndex) => {
		const line: Record<string, HubFormulaCellResult> = {};

		for (const column of columns) {
			line[column.key] = valueOf(rowIndex, column.key);
		}

		return line;
	});
}
