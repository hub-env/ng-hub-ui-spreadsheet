import { HubSpreadsheetColumn, HubSpreadsheetRecord } from './spreadsheet.types';

/**
 * Reading a sheet back as plain data, keyed by column alias.
 *
 * The point of the aliases: the owner works with `{ price: 12, units: 3 }` instead of mapping a
 * grid of coordinates back onto its own fields by position, which breaks the moment a column
 * moves.
 *
 * These read the value a column reports, never the text it decides to display, so a cell showing
 * «120 ud.» still yields the number 120.
 */

/** One row as plain data. */
export function spreadsheetRecord<TRow>(row: TRow, columns: readonly HubSpreadsheetColumn<TRow>[]): HubSpreadsheetRecord {
	const record: HubSpreadsheetRecord = {};

	for (const column of columns) {
		record[column.key] = column.cell(row).value;
	}

	return record;
}

/** Every row as plain data, in the order the sheet holds them. */
export function spreadsheetRecords<TRow>(
	rows: readonly TRow[],
	columns: readonly HubSpreadsheetColumn<TRow>[]
): HubSpreadsheetRecord[] {
	return rows.map((row) => spreadsheetRecord(row, columns));
}

/**
 * The aliases declared more than once, each named a single time.
 *
 * A repeated alias is not a cosmetic problem: the later column silently overwrites the earlier
 * one in every structured read, and once formulas arrive the reference becomes ambiguous. The
 * sheet reports this rather than guessing which column was meant.
 */
export function duplicateColumnKeys<TRow>(columns: readonly HubSpreadsheetColumn<TRow>[]): string[] {
	const seen = new Set<string>();
	const repeated = new Set<string>();

	for (const column of columns) {
		if (seen.has(column.key)) {
			repeated.add(column.key);
		}

		seen.add(column.key);
	}

	return [...repeated];
}
