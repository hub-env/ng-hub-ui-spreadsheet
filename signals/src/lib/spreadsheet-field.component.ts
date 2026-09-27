import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, model, output } from '@angular/core';
import { FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { HubGridRange, HubGridSpan } from 'ng-hub-ui-utils';
import {
	HubSpreadsheetCellRef,
	HubSpreadsheetCellState,
	HubSpreadsheetColumn,
	HubSpreadsheetCommit,
	HubSpreadsheetComponent,
	HubSpreadsheetPaste
} from 'ng-hub-ui-spreadsheet';

/**
 * A sheet that is a form control: its value is the rows.
 *
 * Bind it with the `FormField` directive and the rows become the field's value, written back on
 * every edit, paste and clearing. Because the contract is Angular's own
 * {@link FormValueControl}, the same component also works inside reactive and template-driven
 * forms — Angular's migration guide says as much, and forbids implementing the old
 * `ControlValueAccessor` alongside it.
 *
 * **What this shape cannot do, and why it is not the only one.** A control bound to a collection
 * receives that field's own errors and never its descendants'. A rule declared with `applyEach`
 * on the rows therefore produces errors this component will not see, and per-cell validation is
 * the whole point of an editable sheet. When you need it, keep `<hub-spreadsheet>` bound to your
 * own rows and feed its `errors` input — `spreadsheetFieldErrors()` maps a field tree onto the
 * map it expects.
 */
@Component({
	selector: 'hub-spreadsheet-field',
	standalone: true,
	imports: [HubSpreadsheetComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<hub-spreadsheet
			[rows]="value()"
			[columns]="columns()"
			[rowKey]="rowKey()"
			[states]="states()"
			[errors]="cellErrors()"
			[decimalMark]="decimalMark()"
			[emptyText]="emptyText()"
			[pageSize]="pageSize()"
			[readonly]="readonly() || disabled()"
			[frozenColumns]="frozenColumns()"
			[frozenRows]="frozenRows()"
			[spans]="spans()"
			(commit)="onCommit($event)"
			(pasted)="onPaste($event)"
			(cleared)="onCleared($event)"
			(selectionChange)="selectionChange.emit($event)"
		/>
	`
})
export class HubSpreadsheetFieldComponent<TRow extends object> implements FormValueControl<TRow[]> {
	/** The rows, as the field's value. Written back whenever the reader changes a cell. */
	readonly value = model<TRow[]>([]);

	/** What each column shows and allows. */
	readonly columns = input.required<readonly HubSpreadsheetColumn<TRow>[]>();
	/** A stable name per row. */
	readonly rowKey = input.required<(row: TRow) => string>();
	/** The save state of each cell. */
	readonly states = input<Record<string, HubSpreadsheetCellState>>({});
	/** The character this reader types decimals with. */
	readonly decimalMark = input<',' | '.'>(',');
	/** What an empty sheet says. */
	readonly emptyText = input('');
	/** How many rows Page Up and Page Down travel. */
	readonly pageSize = input(10);
	/** Turns off every editor, whatever the cells say. */
	readonly readonly = input(false, { transform: booleanAttribute });
	/** How many columns stay pinned to the leading edge. */
	readonly frozenColumns = input(0);
	/** How many rows stay pinned below the header. */
	readonly frozenRows = input(0);
	/** Merged blocks. */
	readonly spans = input<readonly HubGridSpan[]>([]);

	/**
	 * Bound by the `FormField` directive. Only the array field's own errors arrive here, which is
	 * why they are shown as a whole rather than attributed to a cell.
	 */
	readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
	/** Bound by the `FormField` directive; disables every editor. */
	readonly disabled = input(false, { transform: booleanAttribute });

	/** The selected rectangle changed. */
	readonly selectionChange = output<HubGridRange | null>();

	/**
	 * The sheet's own per-cell error map.
	 *
	 * Empty here on purpose: this shape has no per-cell errors to give. It exists so the inner
	 * component's input is always bound to something, and so a future release can fill it without
	 * changing the template.
	 */
	protected readonly cellErrors = computed<Record<string, string>>(() => ({}));

	protected onCommit(change: HubSpreadsheetCommit<TRow>): void {
		this.write(change.coords.row, change.column.key, change.value);
	}

	protected onPaste(paste: HubSpreadsheetPaste<TRow>): void {
		if (!paste.cells.length) {
			return;
		}

		// One update for the whole block rather than one per cell: a paste is a single change as
		// far as the field is concerned, and writing it cell by cell would fire the form's
		// validation hundreds of times for one gesture.
		this.value.update((rows) => {
			const next = [...rows];

			for (const change of paste.cells) {
				next[change.coords.row] = { ...next[change.coords.row], [change.column.key]: change.value };
			}

			return next;
		});
	}

	protected onCleared(cells: readonly HubSpreadsheetCellRef<TRow>[]): void {
		this.value.update((rows) => {
			const next = [...rows];

			for (const ref of cells) {
				next[ref.coords.row] = { ...next[ref.coords.row], [ref.column.key]: null };
			}

			return next;
		});
	}

	private write(row: number, key: string, value: unknown): void {
		this.value.update((rows) =>
			rows.map((candidate, index) => (index === row ? { ...candidate, [key]: value } : candidate))
		);
	}
}

/** Re-exported so a consumer can type a handler without importing from two packages. */
export type { WithOptionalFieldTree };
