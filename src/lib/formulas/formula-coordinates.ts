/**
 * Coordinates: the other way to point at a cell, and what has to happen to them afterwards.
 *
 * An alias says which column it means and goes on meaning it whatever happens to the sheet. A
 * coordinate says *where* the column was when the formula was written, which is only the same
 * thing until somebody moves it. That is not a reason to refuse coordinates — a spreadsheet
 * without `B2` is not a spreadsheet — it is a reason to move them with the sheet, which is what
 * every spreadsheet does and what these functions are for.
 */

/** The letters a column is known by: A, B … Z, AA, AB … */
export function columnLabel(index: number): string {
	if (index < 0) {
		return '';
	}

	let label = '';
	let rest = index;

	for (;;) {
		label = String.fromCharCode(65 + (rest % 26)) + label;
		rest = Math.floor(rest / 26) - 1;

		if (rest < 0) {
			return label;
		}
	}
}

/** Which column a run of letters means, or -1 when it means none. */
export function columnIndexOf(label: string): number {
	if (!/^[A-Za-z]+$/.test(label)) {
		return -1;
	}

	let index = 0;

	for (const character of label.toUpperCase()) {
		index = index * 26 + (character.charCodeAt(0) - 64);
	}

	return index - 1;
}

/** What a coordinate points at, counting from nought. */
export interface HubFormulaCoordinate {
	readonly row: number;
	readonly col: number;
}

/** Reads `B3` as a place, or nothing when it is not one. */
export function parseCoordinate(text: string): HubFormulaCoordinate | null {
	const match = /^([A-Za-z]+)([0-9]+)$/.exec(text);

	if (!match) {
		return null;
	}

	const col = columnIndexOf(match[1]);
	const row = Number(match[2]) - 1;

	return col < 0 || row < 0 ? null : { row, col };
}

/** Writes a place back as `B3`, which is what a formula shows. */
export function formatCoordinate(coordinate: HubFormulaCoordinate): string {
	return `${columnLabel(coordinate.col)}${coordinate.row + 1}`;
}

/** What a reference has become after the sheet changed shape. */
type Moved = HubFormulaCoordinate | 'gone';

/** What a column moving does to a column index. */
function afterColumnMove(col: number, from: number, to: number): number {
	if (col === from) {
		return to;
	}

	// Everything between the two places shuffles by one, in whichever direction the column went.
	if (from < to) {
		return col > from && col <= to ? col - 1 : col;
	}

	return col >= to && col < from ? col + 1 : col;
}

/** What inserting or deleting tracks does to an index along that axis. */
function afterInsertOrDelete(index: number, at: number, count: number): number | 'gone' {
	if (count > 0) {
		return index >= at ? index + count : index;
	}

	const removed = -count;

	if (index >= at && index < at + removed) {
		return 'gone';
	}

	return index >= at + removed ? index - removed : index;
}

/** How the sheet changed shape. */
export type HubFormulaShapeChange =
	| { readonly kind: 'move-column'; readonly from: number; readonly to: number }
	/** A positive count inserts, a negative one deletes. */
	| { readonly kind: 'columns'; readonly at: number; readonly count: number }
	| { readonly kind: 'rows'; readonly at: number; readonly count: number };

/** Where a coordinate ends up after a change, or that it no longer points at anything. */
export function moveCoordinate(coordinate: HubFormulaCoordinate, change: HubFormulaShapeChange): Moved {
	if (change.kind === 'move-column') {
		return { row: coordinate.row, col: afterColumnMove(coordinate.col, change.from, change.to) };
	}

	if (change.kind === 'columns') {
		const col = afterInsertOrDelete(coordinate.col, change.at, change.count);

		return col === 'gone' ? 'gone' : { row: coordinate.row, col };
	}

	const row = afterInsertOrDelete(coordinate.row, change.at, change.count);

	return row === 'gone' ? 'gone' : { row, col: coordinate.col };
}

/**
 * Rewrites the coordinates in a formula so they point at the same data as before.
 *
 * Text, not a parsed tree, and deliberately: what a reader typed is what is stored, so what comes
 * back has to be something they would recognise as their own formula with a letter changed. A
 * reference to something that has been deleted becomes `#REF!`, which is what a spreadsheet does
 * and is honest — the alternative is a formula that quietly reads its neighbour.
 *
 * @param formula - The text of the formula, `=` and all.
 * @param change - What happened to the sheet.
 * @returns The formula with its coordinates moved.
 */
export function rewriteCoordinates(formula: string, change: HubFormulaShapeChange): string {
	if (typeof formula !== 'string' || !formula.trimStart().startsWith('=')) {
		return formula;
	}

	// Left alone inside quotes and inside brackets: `"A1"` is a word somebody wrote, and `[price]`
	// is an alias that happens to look like letters.
	let result = '';
	let index = 0;
	let quoted = false;
	let bracketed = false;

	while (index < formula.length) {
		const character = formula[index];

		if (quoted) {
			result += character;
			quoted = character !== '"' || formula[index + 1] === '"';
			index++;
			continue;
		}

		if (character === '"') {
			quoted = true;
			result += character;
			index++;
			continue;
		}

		if (character === '[') {
			bracketed = true;
		}

		if (character === ']') {
			bracketed = false;
		}

		if (!bracketed) {
			const match = /^[A-Za-z]+[0-9]+/.exec(formula.slice(index));
			const coordinate = match && parseCoordinate(match[0]);

			if (coordinate) {
				const moved = moveCoordinate(coordinate, change);

				result += moved === 'gone' ? '#REF!' : formatCoordinate(moved);
				index += match![0].length;
				continue;
			}
		}

		result += character;
		index++;
	}

	return result;
}

/**
 * The rows again, with every formula in them moved to match the sheet's new shape.
 *
 * The sheet reports what the reader asked for and writes nothing, as it does with everything else,
 * so this is the line the host writes in its own handler:
 *
 * ```ts
 * protected onColumnMoved(move: { from: number; to: number; keys: string[] }): void {
 *   this.order.set(move.keys);
 *   this.rows.update((rows) => rewriteRowFormulas(rows, { kind: 'move-column', from: move.from, to: move.to }));
 * }
 * ```
 *
 * Every own property that holds a formula is rewritten, which covers the usual case of formulas
 * living in the row's own fields. A host that keeps them somewhere else — a map beside the data, a
 * column that declares its own — walks that itself with {@link rewriteCoordinates}.
 *
 * @param rows - The rows as they are.
 * @param change - What happened to the sheet.
 * @returns New rows; the ones with nothing to rewrite are the very same objects, so a sheet that
 *          tracks by identity redraws only what moved.
 */
export function rewriteRowFormulas<TRow extends object>(rows: readonly TRow[], change: HubFormulaShapeChange): TRow[] {
	return rows.map((row) => {
		let changed = false;
		const next = { ...row } as Record<string, unknown>;

		for (const [key, value] of Object.entries(next)) {
			if (typeof value !== 'string') {
				continue;
			}

			const rewritten = rewriteCoordinates(value, change);

			if (rewritten !== value) {
				next[key] = rewritten;
				changed = true;
			}
		}

		return (changed ? next : row) as TRow;
	});
}
