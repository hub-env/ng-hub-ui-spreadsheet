import { FieldTree } from '@angular/forms/signals';
import { HubSpreadsheetColumn } from 'ng-hub-ui-spreadsheet';

/**
 * Turns a field tree over rows into the per-cell error map `<hub-spreadsheet>` reads.
 *
 * This is the piece that makes per-cell validation work, and it exists because of a limit in the
 * framework rather than a preference: a control bound to a collection is handed that field's own
 * errors and never its descendants'. Rules declared with `applyEach` therefore land on the row
 * fields, one level below anything the sheet could see for itself.
 *
 * So the host keeps the field tree, and this walks it: for each row and each column, it reads
 * that field's errors and writes the first message under the key the sheet addresses cells by.
 *
 * ```ts
 * readonly form = form(this.lines, (path) => {
 *   applyEach(path, (line) => {
 *     min(line.units, 1, { message: 'At least one unit' });
 *   });
 * });
 *
 * protected readonly cellErrors = computed(() =>
 *   spreadsheetFieldErrors(this.form, this.lines(), this.columns, (row) => row.id)
 * );
 * ```
 *
 * @param form The field tree over the rows.
 * @param rows The rows themselves, in the same order.
 * @param columns The sheet's columns; only aliases that name a field are looked up.
 * @param rowKey How the sheet names a row, so the keys line up with `states`.
 * @param touchedOnly Whether to report only fields the reader has visited. True by default: an
 *   untouched form that paints itself red the moment it renders is a form nobody trusts.
 */
export function spreadsheetFieldErrors<TRow extends object>(
	form: FieldTree<TRow[]>,
	rows: readonly TRow[],
	columns: readonly HubSpreadsheetColumn<TRow>[],
	rowKey: (row: TRow) => string,
	touchedOnly = true
): Record<string, string> {
	const errors: Record<string, string> = {};
	const tree = form as unknown as ArrayLike<Record<string, unknown>>;

	rows.forEach((row, index) => {
		const rowField = tree[index];

		if (!rowField) {
			return;
		}

		for (const column of columns) {
			const message = firstMessage(rowField[column.key], touchedOnly);

			if (message) {
				errors[`${rowKey(row)}\t${column.key}`] = message;
			}
		}
	});

	return errors;
}

/**
 * The first message a field has to offer, or nothing.
 *
 * Read defensively. A column alias need not name a field at all — a calculated total has no
 * counterpart in the model — and reaching into a field tree for a key that is not there must
 * report "no error" rather than throw in the middle of a render.
 */
function firstMessage(field: unknown, touchedOnly: boolean): string | undefined {
	if (typeof field !== 'function') {
		return undefined;
	}

	try {
		const state = (field as () => Record<string, () => unknown>)();

		if (touchedOnly && state['touched'] && state['touched']() !== true) {
			return undefined;
		}

		const list = state['errors']?.() as ReadonlyArray<{ message?: string; kind?: string }> | undefined;
		const first = list?.[0];

		return first?.message ?? first?.kind;
	} catch {
		return undefined;
	}
}

/**
 * Marks the field behind a cell as visited.
 *
 * Errors are held back until a cell has been touched, and a sheet has no way to report that on
 * its own: the `FormField` directive learns it from a control's `touch` output, and a sheet
 * driven through `errors` is not bound to a field at all. So the host says it, from the
 * `commit`, `pasted` and `cleared` handlers it already writes.
 *
 * Without this call, `spreadsheetFieldErrors()` in its default mode reports nothing and no cell
 * is ever marked — which looks exactly like validation that does not work.
 *
 * ```ts
 * protected onCommit(change: HubSpreadsheetCommit<Line>): void {
 *   this.lines.update(...);
 *   touchSpreadsheetField(this.orderForm, change.coords.row, change.column.key);
 * }
 * ```
 *
 * @param form The field tree over the rows.
 * @param row The row index of the cell.
 * @param columnKey The column's alias.
 */
export function touchSpreadsheetField<TRow extends object>(form: FieldTree<TRow[]>, row: number, columnKey: string): void {
	const field = (form as unknown as ArrayLike<Record<string, unknown>>)[row]?.[columnKey];

	if (typeof field !== 'function') {
		return;
	}

	try {
		const state = (field as () => { markAsTouched?: () => void })();

		state.markAsTouched?.();
	} catch {
		// A column alias that names no field. Nothing to mark, and nothing to report.
	}
}
