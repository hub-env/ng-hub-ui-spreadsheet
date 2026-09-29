import { HubGridCoords, HubGridRange } from 'ng-hub-ui-utils';

/**
 * The vocabulary of a spreadsheet: what a column declares, what a cell shows, and what the sheet
 * hands back when something changes.
 *
 * The sheet knows nothing about what the values mean. The owner describes the columns, keeps
 * whatever save state it wants, and does the writing when the sheet reports a change. That split
 * is what lets the same component serve an invoice, a price list and a timesheet.
 */

/**
 * How a column shows its values and reads back what is typed into it.
 *
 * `select` is the one that changes behaviour rather than formatting: a column with a closed list
 * of answers typed by hand accepts things that are not on the list, and checking afterwards is
 * too late.
 */
export type HubSpreadsheetValueKind = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'select';

/** One answer a `select` column offers. */
export interface HubSpreadsheetOption {
	/** What is stored. */
	readonly value: HubSpreadsheetValue;
	/** What is shown, both in the cell and in the list. */
	readonly label: string;
	/** Listed but not choosable — a value being retired, say, that old rows still hold. */
	readonly disabled?: boolean;
}

/**
 * Where a cell's save stands.
 *
 * `pending` is a value typed into a sheet that is saved as a whole later: written, not yet sent.
 * `conflict` is somebody else's write landing on a cell this session had already changed.
 */
export type HubSpreadsheetCellState = 'pending' | 'saving' | 'saved' | 'error' | 'conflict';

/** A value as the sheet carries it; null is an empty cell, not a zero. */
export type HubSpreadsheetValue = string | number | null;

/** What a single cell shows and allows, worked out by its column from the row. */
export interface HubSpreadsheetCell {
	/** What the cell holds. */
	readonly value: HubSpreadsheetValue;
	/**
	 * What to show instead of the value.
	 *
	 * For a cell whose display differs from its data — a code shown as a name, a number shown
	 * with a unit, a range written `from – to` while the cell still holds the figure. The
	 * clipboard still carries `value`, so a copy round-trips the data and not the decoration.
	 */
	readonly text?: string | null;
	/** A second, quieter line under the value. */
	readonly secondary?: string | null;
	/** Whether the cell can be typed into. Read-only when left out. */
	readonly editable?: boolean;
	/** Shown in a quieter tone, for a value that comes from somewhere else. */
	readonly muted?: boolean;
	/** Said when the pointer rests on the cell. */
	readonly title?: string | null;
}

/**
 * One column of a sheet.
 *
 * Note the two identities, and that they are not interchangeable. `key` is what everything stored
 * points at — the save state, the structured output, and later the formulas. `header` is what a
 * reader sees and may be rewritten at any time without touching a single stored reference. Making
 * the visible name the key is the mistake Excel made: rename a column there and every formula in
 * the workbook has to be rewritten to match.
 */
export interface HubSpreadsheetColumn<TRow> {
	/** Stable identifier, unique within the sheet. Never shown to the reader. */
	readonly key: string;
	/** The header text, or a translation key when `translate` is set. */
	readonly header: string;
	/** Resolves `header` through the translation system instead of printing it literally. */
	readonly translate?: boolean;
	/** A second, smaller line under the header. */
	readonly subheader?: string | null;
	/** How values are shown and parsed. Text when left out. */
	readonly kind?: HubSpreadsheetValueKind;
	/** Currency code for a `currency` column; the application's own when left out. */
	readonly currency?: string | null;
	/**
	 * The answers a `select` column offers, in the order they are listed.
	 *
	 * A cell shows the matching option's label rather than its stored value, and falls back to
	 * the raw value when nothing matches — an old row holding a value that has since been retired
	 * has to remain readable, not blank.
	 */
	readonly options?: readonly HubSpreadsheetOption[];
	/** Figures go to the end, so they read down the column. */
	readonly align?: 'start' | 'center' | 'end';
	/** A floor for the column's width, as a CSS length. */
	readonly minWidth?: string;
	/**
	 * How deep in an outline this column sits: `1` is inside one fold, `2` inside two, and left out
	 * or `0` means it is not folded at all.
	 *
	 * A run of neighbouring columns at a level is a group, and the sheet draws the toggle that
	 * folds it away. Which groups are folded is the owner's, through the sheet's
	 * `collapsedColumns`; the sheet only draws and reports.
	 */
	readonly level?: number;
	/**
	 * A hint shown in an empty cell of this column while the pointer rests on it.
	 *
	 * Only on hover, and never in place of a value: a column of hints reads as a column of
	 * content, and a reader scanning for what is filled in would have to look twice at every row.
	 */
	readonly placeholder?: string;
	/**
	 * Keeps the header readable by assistive technology but hides it from sight, for a column
	 * whose cells explain themselves and need no name repeated down every row.
	 */
	readonly headerHidden?: boolean;
	/**
	 * A formula every cell of this column is worked out from, fixed by whoever declared it.
	 *
	 * The other way round from a formula a reader types: that one is a value the row holds and can
	 * be changed like any other, while this one belongs to the column and is the same in every
	 * row. A total that is part of how the sheet works — a line total, a running balance — belongs
	 * here, where nobody can type over it by accident and no round trip through the data can lose
	 * it.
	 *
	 * The cells of such a column cannot be typed into; their `editable` is ignored, since there is
	 * nothing to edit. Needs `formulas` on the sheet, as any formula does.
	 */
	readonly formula?: string;
	/** What this column shows for a given row. */
	readonly cell: (row: TRow) => HubSpreadsheetCell;
}

/** A cell as the sheet hands it to its owner. */
export interface HubSpreadsheetCellRef<TRow> {
	/** Where it sits. */
	readonly coords: HubGridCoords;
	/** The row it belongs to. */
	readonly row: TRow;
	/** The column it belongs to. */
	readonly column: HubSpreadsheetColumn<TRow>;
	/** What it showed when the event happened. */
	readonly cell: HubSpreadsheetCell;
}

/**
 * What an expansion template is handed when a row is opened.
 *
 * The row's own content, laid out where the row is rather than in a dialog over it: a dialog hides
 * the row it is about and cannot be compared with the one above, which is the whole reason a sheet
 * opens a row in place. The owner draws whatever the row holds behind its figures and closes it
 * again through `close`.
 */
export interface HubSpreadsheetExpansionContext<TRow> {
	/** The row that was opened. */
	readonly $implicit: TRow;
	/** The same row, under its own name. */
	readonly row: TRow;
	/** Where it sits among the rows. */
	readonly index: number;
	/** Its key, as `rowKey` gives it. */
	readonly key: string;
	/** Closes the row again. */
	readonly close: () => void;
}

/** A value typed or pasted into a cell, already read as a number where the column is one. */
export interface HubSpreadsheetCommit<TRow> extends HubSpreadsheetCellRef<TRow> {
	/** The new value; null when the cell was emptied. */
	readonly value: HubSpreadsheetValue;
}

/**
 * A block pasted into the sheet, and what did not fit.
 *
 * The counts matter: a paste that silently drops half its values is the complaint every grid in
 * this field collects, so the owner is told how much fell on read-only cells and how much did not
 * read as a number, and can say so.
 */
export interface HubSpreadsheetPaste<TRow> {
	/** The cells that take a new value. */
	readonly cells: readonly HubSpreadsheetCommit<TRow>[];
	/** The rectangle the paste covered, trimmed to the sheet. */
	readonly range: HubGridRange;
	/** Values that landed on cells that cannot be typed into, or outside the sheet. */
	readonly skipped: number;
	/** Values that did not read as a number in a figure column. */
	readonly rejected: number;
}

/**
 * A row of the sheet as plain data, keyed by column alias.
 *
 * This is what the aliases buy: the owner gets `{ price: 12, quantity: 3 }` rather than a grid of
 * coordinates it has to map back by position.
 */
export type HubSpreadsheetRecord = Record<string, HubSpreadsheetValue>;
