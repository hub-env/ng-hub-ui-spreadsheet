import { ViewContainerRef } from '@angular/core';

/**
 * Hosting a richer editor inside a cell without depending on the library it comes from.
 *
 * The sheet ships a native list for a column with options, which needs nothing installed and
 * behaves the way the platform does on a phone. A project that has a component library wires this
 * adapter once and every list column upgrades — no template per sheet, and the sheet still imports
 * nothing: the shape is declared here and satisfied structurally, which is the same bargain
 * `ng-hub-ui-paginable` strikes for its table controls.
 *
 * `ng-hub-ui-forms` ships an implementation that fits: `hubFormControlAdapter`.
 */

/** How the adapter should present the control's name. Mirrors the family's label types. */
export type HubSpreadsheetControlLabelType = 'floating' | 'stacked' | 'horizontal' | 'visually-hidden';

/** One answer a hosted list offers. */
export interface HubSpreadsheetControlOption {
	value: unknown;
	label: string;
	/**
	 * Listed but not choosable, where the adapter honours it.
	 *
	 * The sheet's own list guarantees this; a hosted control is another library's, and the sheet
	 * can only pass the flag on.
	 */
	disabled?: boolean;
}

/**
 * What the sheet asks for when a cell of a list column opens.
 *
 * Only lists go through the adapter. A text or figure cell keeps the sheet's own editor, which
 * holds the draft, reads the reader's decimal mark and refuses what the column cannot store —
 * none of which a foreign control knows about, and all of which a value-per-keystroke contract
 * would throw away.
 */
export interface HubSpreadsheetControlConfig {
	/** The only kind the sheet hosts today. */
	kind: 'select';
	/** What the cell holds. */
	value: unknown;
	/** The answers, in the order the column declared them. */
	options?: ReadonlyArray<HubSpreadsheetControlOption>;
	/** The column's header, so the control is not left anonymous inside a grid. */
	label?: string;
	/** How to present that name. `visually-hidden` unless the host says otherwise. */
	labelType?: HubSpreadsheetControlLabelType;
	/** The name to fall back on where the adapter ignores {@link label}. */
	ariaLabel?: string;
	/** Shown while the cell is empty. */
	placeholder?: string;
	/** Extra class forwarded to the control. */
	cssClass?: string;
	/** Whether the control offers a search box. True from a cell: a long list is why you wire one. */
	searchable?: boolean;
	/** Whether it offers to clear itself. False from a cell: `Delete` empties a cell. */
	clearable?: boolean;
	/** Whether it opens as it appears. True from a cell, where the click that opened it is spent. */
	autoOpen?: boolean;
	/** A term to start filtered by — the character the reader opened the cell with. */
	searchTerm?: string;
	/**
	 * Called when the reader chooses. The sheet commits and moves on, as the native list does.
	 *
	 * Typed `unknown` rather than the sheet's own value type, and deliberately: a callback is
	 * checked the other way round, so a narrower parameter here would refuse the very adapters
	 * this contract exists to accept. What comes back is read through the column, which is where
	 * the refusing belongs anyway.
	 */
	onValueChange: (value: unknown) => void;
}

/** Live handle to a control the adapter created. */
export interface HubSpreadsheetControlHandle {
	/** Pushes a value in from outside. */
	setValue(value: unknown): void;
	/** Destroys the control and releases what it holds. */
	destroy(): void;
}

/**
 * Optional, structurally typed adapter that renders a cell's list with a richer control.
 *
 * Declared here rather than imported, so the library keeps no dependency at all on whatever
 * provides it. With no adapter registered the sheet draws its native list; with one, every list
 * column upgrades at once.
 */
export interface HubSpreadsheetControlsAdapter {
	/**
	 * Creates a control inside `container`.
	 *
	 * @returns A handle to update or destroy it.
	 */
	create(container: ViewContainerRef, config: HubSpreadsheetControlConfig): HubSpreadsheetControlHandle;
}
