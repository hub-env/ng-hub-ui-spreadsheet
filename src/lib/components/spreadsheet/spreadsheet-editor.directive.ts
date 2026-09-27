import { Directive, TemplateRef, inject, input } from '@angular/core';
import { HubSpreadsheetCell, HubSpreadsheetColumn, HubSpreadsheetValue } from '../../models/spreadsheet.types';

/** What an editor template is handed when it opens. */
export interface HubSpreadsheetEditorContext<TRow> {
	/** The value the cell holds, ready to be edited. */
	readonly $implicit: HubSpreadsheetValue;
	/** The cell as its column reported it. */
	readonly cell: HubSpreadsheetCell;
	/**
	 * The character that opened the cell, when it was opened by typing into it.
	 *
	 * That keystroke is the reader's first, and an editor that ignores it makes them type it
	 * again. A picker should put it in its search box; a field, in its value.
	 */
	readonly seed: string | undefined;
	/** The row it belongs to. */
	readonly row: TRow;
	/** The column it belongs to. */
	readonly column: HubSpreadsheetColumn<TRow>;
	/** Accepts a new value and closes the editor, moving the cursor down as Enter would. */
	readonly commit: (value: HubSpreadsheetValue) => void;
	/** Closes the editor and keeps what the cell held. */
	readonly cancel: () => void;
}

/**
 * Replaces the editor of one column with a template of your own.
 *
 * The sheet ships editors for the kinds it knows — a field for text and figures, a list for a
 * column with options, a date field, a checkbox — and this is how a column gets something else:
 * a `hub-select` with a search box, a picker of your own, anything that can report a value.
 *
 * ```html
 * <hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
 *   <ng-template hubSpreadsheetEditor="supplier" let-value let-ctx="commit">
 *     <hub-select [options]="suppliers()" [ngModel]="value" (ngModelChange)="ctx($event)" />
 *   </ng-template>
 * </hub-spreadsheet>
 * ```
 *
 * The template is responsible for calling `commit` or `cancel`. Until it does, the editor stays
 * open — which is what lets a picker take as many clicks as it needs without the sheet deciding
 * the reader has finished.
 */
@Directive({
	selector: '[hubSpreadsheetEditor]',
	standalone: true
})
export class HubSpreadsheetEditorDirective<TRow = unknown> {
	/** The alias of the column this editor belongs to. */
	readonly column = input.required<string>({ alias: 'hubSpreadsheetEditor' });

	/**
	 * The same rows the sheet is given, only so the compiler knows what a row is here.
	 *
	 * Nothing reads it. A template is compiled on its own, with no way of knowing which sheet will
	 * mount it, so `let-row` arrives as `unknown` and every use of it needs a cast. Handing the
	 * rows over is how Angular's own structural directives solve this, and it costs one binding.
	 */
	readonly rows = input<readonly TRow[]>([], { alias: 'hubSpreadsheetEditorRows' });

	readonly template = inject<TemplateRef<HubSpreadsheetEditorContext<TRow>>>(TemplateRef);

	/** Lets Angular narrow `let-` bindings inside the template to the real context type. */
	static ngTemplateContextGuard<TRow>(
		_directive: HubSpreadsheetEditorDirective<TRow>,
		_context: unknown
	): _context is HubSpreadsheetEditorContext<TRow> {
		return true;
	}
}
