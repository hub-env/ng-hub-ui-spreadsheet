/**
 * Delimited text, read and written.
 *
 * The clipboard speaks it with tabs and a CSV file with commas — or with semicolons, wherever the
 * comma is already busy being a decimal mark. Everything else about them is the same, so they
 * share this.
 */

/**
 * Reads a table out of delimited text.
 *
 * One state machine for the clipboard and for CSV, because they are the same format with a
 * different separator and the awkward parts are identical: a quoted cell holding the separator, a
 * doubled quote standing for one, a line ending that may be one character or two, and a stray
 * quote in the middle of a cell that is content rather than punctuation — `12" de pantalla`.
 *
 * @param input - The text to read.
 * @param delimiter - What separates the cells of a row.
 * @returns The rows, each as a list of cells, exactly as they were written.
 */
export function parseDelimited(input: string, delimiter = '\t'): string[][] {
	if (input === '') {
		return [];
	}

	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	let atCellStart = true;

	for (let index = 0; index < input.length; index++) {
		const char = input[index];

		if (quoted) {
			if (char === '"') {
				if (input[index + 1] === '"') {
					cell += '"';
					index++;
				} else {
					quoted = false;
				}
			} else {
				cell += char;
			}

			continue;
		}

		if (char === '"' && atCellStart) {
			quoted = true;
			atCellStart = false;
			continue;
		}

		atCellStart = false;

		if (char === delimiter) {
			row.push(cell);
			cell = '';
			atCellStart = true;
			continue;
		}

		if (char === '\n' || char === '\r') {
			// Swallow the LF of a CRLF so a Windows paste does not gain a blank row per line.
			if (char === '\r' && input[index + 1] === '\n') {
				index++;
			}

			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
			atCellStart = true;
			continue;
		}

		cell += char;
	}

	// A trailing newline closed the last row already; anything left is a real final row.
	if (cell !== '' || row.length) {
		row.push(cell);
		rows.push(row);
	}

	return rows;
}

/**
 * Writes a table as delimited text.
 *
 * A cell is quoted only when it has to be: one that holds the separator, a quote, or a line
 * ending. Quoting everything is also correct and is what many exporters do, but it makes a file
 * that is unpleasant to read and twice the size for nothing.
 *
 * @param rows - The rows to write.
 * @param delimiter - What to put between the cells.
 * @param newline - What ends a line. CRLF is what a spreadsheet on Windows expects.
 */
export function serialiseDelimited(
	rows: readonly (readonly string[])[],
	delimiter = '\t',
	newline: '\n' | '\r\n' = '\n'
): string {
	const needsQuotes = (cell: string) => cell.includes(delimiter) || cell.includes('"') || /[\r\n]/.test(cell);

	return rows
		.map((row) => row.map((cell) => (needsQuotes(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(delimiter))
		.join(newline);
}
