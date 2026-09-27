import { Directive, TemplateRef, inject, input } from '@angular/core';
import { HubSpreadsheetCell, HubSpreadsheetColumn, HubSpreadsheetValue } from '../../models/spreadsheet.types';

/** What a cell template is handed while the cell is sitting still. */
export interface HubSpreadsheetCellContext<TRow> {
	/** What the cell holds. */
	readonly $implicit: HubSpreadsheetValue;
	/** The cell as its column reported it. */
	readonly cell: HubSpreadsheetCell;
	/** The row it belongs to. */
	readonly row: TRow;
	/** The column it belongs to. */
	readonly column: HubSpreadsheetColumn<TRow>;
	/** Whether this is the cell the reader is on. */
	readonly active: boolean;
}

/**
 * Draws one column's cells yourself: a badge for a state, an avatar beside a name, a row of
 * actions.
 *
 * The sibling of `hubSpreadsheetEditor`, for the other half of a cell's life. That one replaces
 * what appears when the cell is opened; this one replaces what the cell shows while it is not.
 *
 * ```html
 * <hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
 *   <ng-template hubSpreadsheetCell="status" let-value>
 *     <hub-badge [variant]="value === 'done' ? 'success' : 'warning'">{{ value }}</hub-badge>
 *   </ng-template>
 * </hub-spreadsheet>
 * ```
 *
 * Two things stay the sheet's whatever the template draws. The clipboard carries the cell's value,
 * not its decoration, so a copy round-trips as data rather than as a picture of it. And the cell
 * is still the thing the keyboard is on: the template is drawn inside it, not instead of it.
 *
 * A template with something clickable in it joins the tab order of the page, which the grid's own
 * roving tab stop does not manage — put the action behind `hubSpreadsheetEditor` instead when the
 * cell should be entered before it can be used.
 */
@Directive({
	selector: '[hubSpreadsheetCell]',
	standalone: true
})
export class HubSpreadsheetCellDirective<TRow = unknown> {
	/** The alias of the column these cells belong to. */
	readonly column = input.required<string>({ alias: 'hubSpreadsheetCell' });

	/**
	 * The same rows the sheet is given, only so the compiler knows what a row is here.
	 *
	 * Nothing reads it. A template is compiled on its own, with no way of knowing which sheet will
	 * mount it, so `let-row` arrives as `unknown` and every use of it needs a cast. Handing the
	 * rows over is how Angular's own structural directives solve this, and it costs one binding:
	 *
	 * ```html
	 * <ng-template hubSpreadsheetCell="actions" [hubSpreadsheetCellRows]="orders()" let-row="row">
	 * ```
	 */
	readonly rows = input<readonly TRow[]>([], { alias: 'hubSpreadsheetCellRows' });

	readonly template = inject<TemplateRef<HubSpreadsheetCellContext<TRow>>>(TemplateRef);

	/** Lets Angular narrow `let-` bindings inside the template to the real context type. */
	static ngTemplateContextGuard<TRow>(
		_directive: HubSpreadsheetCellDirective<TRow>,
		_context: unknown
	): _context is HubSpreadsheetCellContext<TRow> {
		return true;
	}
}
