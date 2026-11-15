import { Directive, TemplateRef, inject, input } from '@angular/core';
import { HubSpreadsheetColumn } from '../../models/spreadsheet.types';

/** What a header template is handed. */
export interface HubSpreadsheetHeaderContext<TRow> {
	/** The column the header belongs to. */
	readonly $implicit: HubSpreadsheetColumn<TRow>;
	/** The column's position among the columns the sheet was given. */
	readonly index: number;
	/** The column's alias, so a handler can say which column it was asked on. */
	readonly key: string;
	/** The plain title the sheet would have drawn, for a template that only decorates it. */
	readonly header: string;
}

/**
 * Draws one column's header title yourself: an icon beside the name, a button that edits the column.
 *
 * The sibling of `hubSpreadsheetCell`, for the header. The template replaces what the header draws
 * as its title and its subheader; the `<th>` stays the sheet's, with its classes, width, freezing,
 * sticky position, aria and the check-all box of a yes/no column.
 *
 * ```html
 * <hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
 *   <ng-template hubSpreadsheetHeader="price" let-column>
 *     {{ column.header }} <button type="button" (click)="editPrice()">Edit</button>
 *   </ng-template>
 * </hub-spreadsheet>
 * ```
 *
 * A button, link or field inside the template works as it would anywhere: pressing it neither starts
 * dragging the column nor selects the header. A template with nothing interactive in it leaves the
 * header draggable as before.
 *
 * `headerHidden` only silences the sheet's own title. A template is something the host chose to draw,
 * so it is always shown; leave `headerHidden` off on a column that has one.
 */
@Directive({
	selector: '[hubSpreadsheetHeader]',
	standalone: true
})
export class HubSpreadsheetHeaderDirective<TRow = unknown> {
	/** The alias of the column this header belongs to. */
	readonly column = input.required<string>({ alias: 'hubSpreadsheetHeader' });

	/**
	 * The same rows the sheet is given, only so the compiler knows what a row is here. Nothing reads it.
	 *
	 * ```html
	 * <ng-template hubSpreadsheetHeader="price" [hubSpreadsheetHeaderRows]="orders()" let-column>
	 * ```
	 */
	readonly rows = input<readonly TRow[]>([], { alias: 'hubSpreadsheetHeaderRows' });

	readonly template = inject<TemplateRef<HubSpreadsheetHeaderContext<TRow>>>(TemplateRef);

	/** Lets Angular narrow `let-` bindings inside the template to the real context type. */
	static ngTemplateContextGuard<TRow>(
		_directive: HubSpreadsheetHeaderDirective<TRow>,
		_context: unknown
	): _context is HubSpreadsheetHeaderContext<TRow> {
		return true;
	}
}
