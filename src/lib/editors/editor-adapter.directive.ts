import { Directive, OnDestroy, ViewContainerRef, afterNextRender, inject, input } from '@angular/core';
import { HUB_SPREADSHEET_CONTROLS } from './editor-adapter.token';
import { HubSpreadsheetControlConfig, HubSpreadsheetControlHandle } from './editor-adapter.types';

/**
 * Renders a cell's editor through the optional {@link HUB_SPREADSHEET_CONTROLS} adapter.
 *
 * Placed on an `<ng-container>` in the branch that only runs when an adapter is registered; the
 * native list stays in the branch beside it as the answer that needs nothing installed. The
 * control is created as a sibling of the anchor and torn down with it.
 *
 * The config is read once, when the editor opens. A cell editor lives for one decision — it opens,
 * the reader chooses, it closes — so there is nothing to keep in sync afterwards, and the value
 * arriving from elsewhere mid-edit is the case the sheet already refuses.
 */
@Directive({
	selector: '[hubSpreadsheetControl]'
})
export class HubSpreadsheetControlDirective implements OnDestroy {
	/** What to build. */
	readonly config = input.required<HubSpreadsheetControlConfig>({ alias: 'hubSpreadsheetControl' });

	private readonly vcr = inject(ViewContainerRef);
	private readonly adapter = inject(HUB_SPREADSHEET_CONTROLS, { optional: true });

	private handle: HubSpreadsheetControlHandle | null = null;

	constructor() {
		// After the cell has been laid out, so a control that measures itself against its host —
		// a panel deciding whether to open upwards — reads a box that is already the cell's.
		afterNextRender(() => {
			this.handle = this.adapter?.create(this.vcr, this.config()) ?? null;
		});
	}

	ngOnDestroy(): void {
		this.handle?.destroy();
		this.handle = null;
	}
}
