import { HubSpreadsheetColumn } from '../models/spreadsheet.types';

/** A file read back: its headers, if it had any, and its rows as they were written. */
export interface HubSheetTable {
	readonly headers: readonly string[] | null;
	readonly rows: readonly (readonly string[])[];
}

/**
 * Turns a file's rows into records keyed by column alias, matching its headers to the sheet.
 *
 * Matched on the header first and the alias second, both ignoring case and surrounding space: a
 * file that came from this sheet carries the headers, and one written by hand often carries the
 * aliases. A column the file has nothing for is left out rather than filled with an empty string,
 * so a partial file updates what it names and leaves the rest alone.
 *
 * Shared by every importer, because the matching is the part that has to behave the same whatever
 * the file was: somebody who fixes a CSV by renaming a heading expects the same file to work when
 * they save it as a workbook instead.
 *
 * @returns One record per row of the file, keyed by column alias.
 */
export function tableToRecords<TRow>(
	table: HubSheetTable,
	columns: readonly HubSpreadsheetColumn<TRow>[]
): Array<Record<string, string>> {
	const normalise = (value: string) => value.trim().toLocaleLowerCase();
	const places = new Map<number, string>();

	if (table.headers) {
		table.headers.forEach((heading, index) => {
			const match = columns.find(
				(column) => normalise(column.header) === normalise(heading) || normalise(column.key) === normalise(heading)
			);

			if (match) {
				places.set(index, match.key);
			}
		});
	} else {
		columns.forEach((column, index) => places.set(index, column.key));
	}

	return table.rows.map((row) => {
		const record: Record<string, string> = {};

		for (const [index, alias] of places) {
			if (row[index] !== undefined) {
				record[alias] = row[index];
			}
		}

		return record;
	});
}
