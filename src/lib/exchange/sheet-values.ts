import { formulaErrorText } from '../formulas/formula-errors';
import { isFormula } from '../formulas/formula-parser';
import { evaluateSheet } from '../formulas/formula-sheet';
import { HubSpreadsheetColumn, HubSpreadsheetValue } from '../models/spreadsheet.types';

/** How a sheet's values are read for a file. */
export interface HubSheetValuesOptions {
	/**
	 * Whether to work the formulas out first.
	 *
	 * On for a file somebody else is going to read: a column of `=SUM([total:])` is of no use to
	 * them. Off for a round trip that is meant to come back with its formulas intact.
	 */
	readonly formulas?: boolean;
}

/**
 * What every cell of a sheet holds, with the formulas run if asked.
 *
 * Shared by the exporters because both need the same answer and neither should be the one deciding
 * it: what a cell shows is the sheet's business, and a second copy of that decision inside the CSV
 * writer would drift from the component the first time a formula grows a new case.
 *
 * A formula that cannot be worked out comes out as its spreadsheet spelling — `#DIV/0!` and the
 * rest — which is what Excel writes in the same situation and what the reader of the file expects
 * to see.
 */
export function sheetValues<TRow>(
	rows: readonly TRow[],
	columns: readonly HubSpreadsheetColumn<TRow>[],
	options: HubSheetValuesOptions = {}
): HubSpreadsheetValue[][] {
	const cells = rows.map((row) => columns.map((column) => column.cell(row).value));

	const anyFormula = columns.some((column) => column.formula) || cells.some((line) => line.some((value) => isFormula(value)));

	if (!options.formulas || !anyFormula) {
		return cells;
	}

	const places = new Map(columns.map((column, index) => [column.key, index]));
	const sheet = evaluateSheet({
		rows,
		columns,
		raw: (rowIndex, column) => cells[rowIndex]?.[places.get(column.key) ?? -1] ?? null
	});

	return cells.map((line, rowIndex) =>
		line.map((value, colIndex) => {
			const column = columns[colIndex];

			if (!isFormula(value) && !column.formula) {
				return value;
			}

			const result = sheet[rowIndex]?.[column.key];

			return result?.failure ? formulaErrorText(result.failure) : (result?.value ?? null);
		})
	);
}
