# ng-hub-ui-spreadsheet

[Español](./README.es.md) | **English**

[![NPM Version](https://img.shields.io/npm/v/ng-hub-ui-spreadsheet.svg)](https://www.npmjs.com/package/ng-hub-ui-spreadsheet)
[![Angular](https://img.shields.io/badge/Angular-22%2B-red.svg)](https://angular.dev)
[![License](https://img.shields.io/npm/l/ng-hub-ui-spreadsheet.svg)](LICENSE)

An editable sheet of cells for Angular 22+ — typed into, moved through with the keyboard, and pasted into from Excel. Rectangular selection, a clipboard that round-trips both ways, frozen panes and a save state per cell, from a single `<hub-spreadsheet>` element. Real grid semantics rather than a table styled to look like one. No paid tier, no feature gate, and nothing outside Angular in its dependencies: the grid primitives live in `ng-hub-ui-utils`, not in `@angular/cdk`.

## Documentation and Live Examples

This package is part of [Hub UI](https://hubui.dev/en/), a collection of Angular component libraries for standalone apps.

- Docs: https://hubui.dev/en/spreadsheet/overview/
- Live examples: https://hubui.dev/en/spreadsheet/examples/
- Hub UI: https://hubui.dev/en/
- Hub UI on GitHub (issues, roadmap and contributing): https://github.com/hub-env/hub-ui

## 🧩 Library Family `ng-hub-ui`

This library is part of the **ng-hub-ui** ecosystem:

- [**ng-hub-ui-action-sheet**](https://www.npmjs.com/package/ng-hub-ui-action-sheet)
- [**ng-hub-ui-avatar**](https://www.npmjs.com/package/ng-hub-ui-avatar)
- [**ng-hub-ui-badges**](https://www.npmjs.com/package/ng-hub-ui-badges)
- [**ng-hub-ui-board**](https://www.npmjs.com/package/ng-hub-ui-board)
- [**ng-hub-ui-breadcrumbs**](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [**ng-hub-ui-buttons**](https://www.npmjs.com/package/ng-hub-ui-buttons)
- [**ng-hub-ui-calendar**](https://www.npmjs.com/package/ng-hub-ui-calendar)
- [**ng-hub-ui-ds**](https://www.npmjs.com/package/ng-hub-ui-ds)
- [**ng-hub-ui-forms**](https://www.npmjs.com/package/ng-hub-ui-forms)
- [**ng-hub-ui-history**](https://www.npmjs.com/package/ng-hub-ui-history)
- [**ng-hub-ui-icons**](https://www.npmjs.com/package/ng-hub-ui-icons)
- [**ng-hub-ui-loading**](https://www.npmjs.com/package/ng-hub-ui-loading)
- [**ng-hub-ui-metrics**](https://www.npmjs.com/package/ng-hub-ui-metrics)
- [**ng-hub-ui-milestones**](https://www.npmjs.com/package/ng-hub-ui-milestones)
- [**ng-hub-ui-modal**](https://www.npmjs.com/package/ng-hub-ui-modal)
- [**ng-hub-ui-nav**](https://www.npmjs.com/package/ng-hub-ui-nav)
- [**ng-hub-ui-paginable**](https://www.npmjs.com/package/ng-hub-ui-paginable)
- [**ng-hub-ui-panels**](https://www.npmjs.com/package/ng-hub-ui-panels)
- [**ng-hub-ui-portal**](https://www.npmjs.com/package/ng-hub-ui-portal)
- [**ng-hub-ui-signature**](https://www.npmjs.com/package/ng-hub-ui-signature)
- [**ng-hub-ui-skeleton**](https://www.npmjs.com/package/ng-hub-ui-skeleton)
- [**ng-hub-ui-sortable**](https://www.npmjs.com/package/ng-hub-ui-sortable)
- [**ng-hub-ui-spreadsheet**](https://www.npmjs.com/package/ng-hub-ui-spreadsheet) ← You are here
- [**ng-hub-ui-stepper**](https://www.npmjs.com/package/ng-hub-ui-stepper)
- [**ng-hub-ui-toast**](https://www.npmjs.com/package/ng-hub-ui-toast)
- [**ng-hub-ui-utils**](https://www.npmjs.com/package/ng-hub-ui-utils)

## 📑 Table of Contents

- [📦 Description](#-description)
- [✨ Features](#-features)
- [⚙️ Installation](#️-installation)
- [🚀 Quick Start](#-quick-start)
- [📊 Columns](#-columns)
- [⌨️ Keyboard](#️-keyboard)
- [📋 The Clipboard](#-the-clipboard)
- [❄️ Frozen Panes](#️-frozen-panes)
- [💾 Save State](#-save-state)
- [➕ Adding and Removing Rows and Columns](#-adding-and-removing-rows-and-columns)
- [📖 API Reference](#-api-reference)
- [Files](#files)
- [🎨 Styling](#-styling)
- [♿ Accessibility](#-accessibility)
- [🤝 Contributing](#-contributing)
- [📄 Support & License](#-support--license)

## 📦 Description

`<hub-spreadsheet>` renders rows and columns you already hold, and reports what the reader did to them. It never writes to your data. You describe each column — what it shows, whether it can be typed into — and handle `commit`, `pasted` and `cleared` as you see fit: write to a store, post to a server, or ignore them.

That split is deliberate. It is what lets the same component serve an invoice, a price list and a timesheet without knowing anything about invoices, prices or time.

## ✨ Features

- **Two identities per column.** A stable alias that everything stored points at, and a visible header you can rewrite whenever you like without breaking a single reference.
- **Excel's editing keyboard**, down to the details: typing replaces, `F2` keeps, `Enter` commits and drops, `Tab` commits and advances, `Escape` reverts.
- **Rectangular selection** by shift-arrow, shift-click or dragging, and **more than one block at a time** with `Ctrl` held. `Delete` empties every block; a copy happens when the blocks line up and is refused when they do not, exactly as a spreadsheet refuses it.
- **A clipboard that actually round-trips with Excel.** Both flavours written, both read, with the raw number recovered from the HTML so a figure copied in a locale that writes `1.234,56` arrives as `1234.56`.
- **Frozen panes**, counted from the edge the way Excel freezes them.
- **Five save states per cell**, drawn as a bar rather than a badge.
- **Cells that open onto something**, said by their own template and reported through `opened` — with the pointer and with `Enter`. A row's own detail opens **in place**, under an `expansion` template.
- **Foldable columns and rows**, by outline level — Excel's grouping: a run at a level folds away with one toggle, and which groups are folded is yours.
- **Structured output by alias**: `{ price: 12, units: 3 }`, not a grid of coordinates.
- **Real grid semantics** — `role="grid"`, row and column indices, `aria-selected`, a roving tab stop — so a screen reader can navigate it.
- **Input-method safe.** The `Enter` that confirms a Chinese, Japanese or Korean character does not commit the cell.
- **69 CSS variables** that inherit from `--hub-table-*` before falling back to the design system.
- **Out to a real `.xlsx` and back**, with figures as figures and dates as dates — and to CSV, with the separator the reader's locale expects. The zip and the XML are written here, so exporting brings no dependency.
- **No `@angular/cdk`.** The grid primitives are in `ng-hub-ui-utils`.

## ⚙️ Installation

```bash
npm install ng-hub-ui-spreadsheet ng-hub-ui-utils
```

`ng-hub-ui-ds` is optional. Without it every token falls back to a literal and the sheet still renders.

## 🚀 Quick Start

```typescript
import { Component, signal } from '@angular/core';
import { HubSpreadsheetColumn, HubSpreadsheetCommit, HubSpreadsheetComponent } from 'ng-hub-ui-spreadsheet';

interface Line {
	id: string;
	product: string;
	units: number | null;
	price: number | null;
}

@Component({
	selector: 'app-order',
	standalone: true,
	imports: [HubSpreadsheetComponent],
	template: `
		<hub-spreadsheet
			[rows]="lines()"
			[columns]="columns"
			[rowKey]="rowKey"
			[frozenColumns]="1"
			(commit)="onCommit($event)"
		/>
	`
})
export class OrderComponent {
	protected readonly lines = signal<Line[]>([
		{ id: 'a', product: 'M6 bolt', units: 1200, price: 0.12 },
		{ id: 'b', product: 'M6 washer', units: 3400, price: 0.04 }
	]);

	protected readonly rowKey = (row: Line) => row.id;

	protected readonly columns: HubSpreadsheetColumn<Line>[] = [
		{ key: 'product', header: 'Product', cell: (row) => ({ value: row.product, editable: true }) },
		{ key: 'units', header: 'Units', kind: 'number', align: 'end', cell: (row) => ({ value: row.units, editable: true }) },
		{
			key: 'price',
			header: 'Unit price',
			kind: 'currency',
			align: 'end',
			cell: (row) => ({ value: row.price, editable: true })
		},
		{
			key: 'total',
			header: 'Total',
			kind: 'currency',
			align: 'end',
			cell: (row) => ({ value: (row.units ?? 0) * (row.price ?? 0), muted: true })
		}
	];

	protected onCommit(change: HubSpreadsheetCommit<Line>): void {
		this.lines.update((lines) =>
			lines.map((line) => (line.id === change.row.id ? { ...line, [change.column.key]: change.value } : line))
		);
	}
}
```

The `total` column has no `editable`, so it cannot be typed into. Paste a block over it and those values are counted as `skipped` rather than written.

## 📊 Columns

A column says what it is called and how to get a cell out of a row:

```typescript
{
	key: 'price',              // stable; what stored state and formulas point at
	header: 'Unit price',      // visible; rename freely
	kind: 'currency',          // 'text' | 'number' | 'currency'
	align: 'end',
	minWidth: '8rem',
	cell: (row) => ({ value: row.price, editable: true })
}
```

**Why two names.** Make the visible name the key and renaming a column means rewriting every reference to it — the mistake Excel made, and the reason a renamed column there breaks formulas across the workbook. Keep them apart and a rename is a rename.

A column can also **hint at an empty cell**: `placeholder` is shown while the pointer rests on a cell that holds nothing, never in place of a value. A **cell can carry one of its own**, for the row where the column's hint would not tell the truth:

```typescript
cell: (row) => ({ value: row.due, editable: true, placeholder: row.id === 'c' ? 'after the cabling' : null })
```

Left out or `null`, the column's placeholder is used.

Read the sheet back as plain data keyed by alias:

```typescript
import { spreadsheetRecords } from 'ng-hub-ui-spreadsheet';

spreadsheetRecords(this.lines(), this.columns);
// [{ product: 'M6 bolt', units: 1200, price: 0.12, total: 144 }, …]
```

A cell can also **open onto something** — a detail elsewhere, a panel, another page. The cell is
drawn by a template of yours, `hubSpreadsheetCell`, so the way in is drawn there too; the one thing
the template has to say out loud is that the cell opens, with `hubSpreadsheetCellAction`, which is
what keeps `Enter` for the cell:

```html
<hub-spreadsheet [rows]="products()" [columns]="columns" [rowKey]="rowKey" (opened)="onOpened($event)">
	<ng-template hubSpreadsheetCell="name" hubSpreadsheetCellAction="Open the product" let-value let-open="open">
		<a (click)="open()">{{ value }}</a>
	</ng-template>
</hub-spreadsheet>
```

`open()` is handed to the template and reports the intent through `opened`; the sheet opens nothing
itself. An editable cell keeps `Enter` for editing, and the clipboard still carries the value rather
than the drawing.

`hubSpreadsheetCellAction` may also be **a function of the row**, for a column where only some cells
open — a product whose folded row opens its variants while its own row is only read:

```html
<ng-template
	hubSpreadsheetCell="name"
	[hubSpreadsheetCellRows]="products()"
	[hubSpreadsheetCellAction]="opensItsVariants"
	let-row="row"
	let-open="open"
>
	@if (opensItsVariants(row)) {
		<a (click)="open()">{{ row.name }}</a>
	} @else {
		{{ row.name }}
	}
</ng-template>
```

Then `Enter` opens the rows the function answers for, and leaves every other cell the sheet's.

For a cell that opens the row's own detail, put the detail in an `expansion` template and let `expandedRow` name the open row:

```html
<hub-spreadsheet
	[rows]="rows()"
	[columns]="columns"
	[rowKey]="rowKey"
	[expansion]="rowDetail"
	[(expandedRow)]="openRow"
	(opened)="onOpened($event)"
/>

<ng-template #rowDetail let-row let-close="close">
	<!-- what the row holds behind its figures, drawn under the row itself -->
	<hub-button (click)="close()">Close</hub-button>
</ng-template>
```

`expandedRow` is two-way and names the row by its key; the template is handed the row, its index, its key and a way to close it. One row is open at a time.

## ⌨️ Keyboard

| Key                           | What it does                                         |
| ----------------------------- | ---------------------------------------------------- |
| Arrows                        | Move one cell                                        |
| Shift + arrows                | Extend the selection                                 |
| `Tab` / `Shift+Tab`           | Move sideways, falling onto the next row at the edge |
| `Home` / `End`                | First and last cell of the row                       |
| `Ctrl+Home` / `Ctrl+End`      | First and last cell of the sheet                     |
| `Page Up` / `Page Down`       | Move by `pageSize` rows                              |
| Any printable character       | Replace the cell and start editing                   |
| `F2`, `Enter`                 | Edit, keeping the value                              |
| `Alt` + `Down`                | Open a cell that holds a list or a date              |
| `Enter` / `Tab` while editing | Commit and move down / right                         |
| `Escape`                      | Revert the edit, then clear the selection            |
| `Delete` / `Backspace`        | Empty every editable cell of the selection           |
| `Ctrl+C` / `X` / `V`          | Copy, cut, paste                                     |
| `Ctrl+A`                      | Select the sheet                                     |
| `Ctrl+Space` / `Shift+Space`  | Select the column / the row                          |

## 📋 The Clipboard

Copying writes two flavours: tab-separated text, and HTML carrying each number raw. Pasting reads both and prefers the raw number, which is what makes a figure survive a journey between locales — `1.234,56` copied in Spain arrives as `1234.56` rather than as text.

`decimalMark` says which character this reader types decimals with; it is `','` by default and only matters when the source gave no raw value.

```html
<hub-spreadsheet [decimalMark]="'.'" ... />
```

Every paste reports what happened:

```typescript
protected onPaste(paste: HubSpreadsheetPaste<Line>): void {
	for (const change of paste.cells) { /* write it */ }

	// paste.skipped  — fell outside the sheet or on a read-only cell
	// paste.rejected — did not read as a number in a figure column
	// paste.range    — the rectangle it covered
}
```

## ❄️ Frozen Panes

```html
<hub-spreadsheet [frozenColumns]="1" [frozenRows]="2" style="--hub-spreadsheet-max-block-size: 60vh" />
```

Counted from the leading edge, as Excel freezes panes. Set a height, or the sheet never scrolls and a frozen header has nothing to stay still against.

## 💾 Save State

Hand over a map keyed by the row key and the column alias, joined by a tab:

```typescript
states = signal<Record<string, HubSpreadsheetCellState>>({
	'a\tprice': 'saving',
	'b\tunits': 'error'
});
```

`pending`, `saving`, `saved`, `error` and `conflict` each paint a bar down the cell's leading edge. `saving` also sets `aria-busy`. `conflict` is striped rather than merely red, so it is told apart from `error` without relying on colour.

## ➕ Adding and Removing Rows and Columns

The sheet asks; you decide. Nothing is offered until you allow it:

```html
<hub-spreadsheet
	[structure]="{ insertRows: true, deleteRows: (row, index) => index > 0 }"
	[retiredColumnKeys]="retired()"
	(insertRequested)="onInsert($event)"
	(deleteRequested)="onDelete($event)"
/>
```

An insert request for a column carries a `key` that has never belonged to another column in this sheet — pass every alias you have ever used, including deleted ones, through `retiredColumnKeys`. Reusing a dead alias makes everything that referenced the old column resolve silently to the new one, and the mistake shows up much later as wrong numbers.

Before agreeing to a deletion, check what it would orphan:

```typescript
import { danglingColumnKeys } from 'ng-hub-ui-spreadsheet';

danglingColumnKeys(Object.keys(this.savedState), this.columns); // ['discount']
```

## 📖 API Reference

### Inputs

| Input                | Type                                      | Default          | Description                                                                       |
| -------------------- | ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `rows`               | `readonly TRow[]`                         | —                | **Required.** The rows. Never written to.                                         |
| `columns`            | `readonly HubSpreadsheetColumn<TRow>[]`   | —                | **Required.** What each column shows and allows.                                  |
| `rowKey`             | `(row: TRow) => string`                   | —                | **Required.** A stable name per row.                                              |
| `states`             | `Record<string, HubSpreadsheetCellState>` | `{}`             | Save state per cell, keyed `` `${rowKey}\t${columnKey}` ``.                       |
| `errors`             | `Record<string, string>`                  | `{}`             | A validation message per cell, keyed the same way. Marks the cell, not the sheet. |
| `decimalMark`        | `',' \| '.'`                              | `','`            | How this reader types decimals.                                                   |
| `emptyText`          | `string`                                  | `''`             | What an empty sheet says.                                                         |
| `pageSize`           | `number`                                  | `10`             | Rows travelled by `Page Up` and `Page Down`.                                      |
| `readonly`           | `boolean`                                 | `false`          | Turns off every editor, whatever the cells say.                                   |
| `formulas`           | `boolean`                                 | `false`          | Reads a cell that starts with `=` as a formula. See below.                        |
| `editOn`             | `'click' \| 'double-click'`               | `'double-click'` | What opens the editor with the pointer. Typing opens it either way.               |
| `expansion`          | `TemplateRef<HubSpreadsheetExpansionContext<TRow>> \| null` | `null` | A template drawn under a row that is open. See below.       |
| `expandedRow`        | `string \| null`                          | `null`           | Two-way. Which row is open, by its key.                                           |
| `direction`          | `'auto' \| 'ltr' \| 'rtl'`                | `'auto'`         | Which way the sheet runs. `auto` follows the page; the other two force it.         |
| `frozenColumns`      | `number`                                  | `0`              | How many columns stay pinned to the leading edge.                                 |
| `frozenRows`         | `number`                                  | `0`              | How many rows stay pinned below the header.                                       |
| `virtual`            | `boolean`                                 | `false`          | Draws only the rows in view. Gives the sheet a height; see below.                 |
| `rowHeight`          | `number`                                  | `0`              | How tall a row is while virtualising. Nought measures the first one drawn.        |
| `spans`              | `readonly HubGridSpan[]`                  | `[]`             | Merged blocks, declared by their anchor.                                          |
| `structure`          | `HubSpreadsheetStructureOptions<TRow>`    | `{}`             | Which structural changes are offered. Everything refused by default.              |
| `retiredColumnKeys`  | `readonly string[]`                       | `[]`             | Aliases of deleted columns, so a new one never reuses them.                       |
| `contextMenu`        | `boolean`                                 | `false`          | Offers the structural changes on right-click.                                     |
| `mergeable`          | `boolean`                                 | `false`          | Offers putting cells together, and taking them apart, in that menu.               |
| `disjointSelection`  | `boolean`                                 | `true`           | Whether `Ctrl`-clicking adds a second block instead of starting a new selection.  |
| `fillHandle`         | `boolean`                                 | `false`          | Draws the grip at the corner of the selection.                                    |
| `canUndo`            | `boolean`                                 | `false`          | Whether `Ctrl+Z` has anything to ask for. The history belongs to the host.        |
| `canRedo`            | `boolean`                                 | `false`          | The same for `Ctrl+Shift+Z` and `Ctrl+Y`.                                         |
| `resizableColumns`   | `boolean`                                 | `false`          | Lets the reader drag a header's trailing edge.                                    |
| `reorderableColumns` | `boolean`                                 | `false`          | Lets the reader drag a header to move its column.                                 |
| `columnWidths`       | `Record<string, number>`                  | `{}`             | Two-way. Widths keyed by alias, so one survives its column being moved.           |
| `minColumnWidth`     | `number`                                  | `48`             | The floor a drag cannot go below, in pixels.                                      |

### Outputs

| Output                  | Payload                         | Fires when                                                                               |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `commit`                | `HubSpreadsheetCommit<TRow>`    | A cell took a new value, and it differs from the old one.                                |
| `pasted`                | `HubSpreadsheetPaste<TRow>`     | A block was pasted.                                                                      |
| `filled`                | `HubSpreadsheetPaste<TRow>`     | The fill handle was dragged and released.                                                |
| `cleared`               | `HubSpreadsheetCellRef<TRow>[]` | `Delete` was pressed over a selection.                                                   |
| `opened`                | `HubSpreadsheetCellRef<TRow>`   | A cell's template said the reader asked to open it — with the pointer, or with `Enter` where there is no field to edit. |
| `selectionChange`       | `HubGridRange \| null`          | The selected rectangle changed.                                                          |
| `selectionRangesChange` | `readonly HubGridRange[]`       | Every rectangle of the selection, whenever it changes. One entry unless blocks were held with `Ctrl`. |
| `insertRequested`       | `HubSpreadsheetInsertRequest`   | The reader asked to add rows or columns.                                                 |
| `deleteRequested`       | `HubSpreadsheetDeleteRequest`   | The reader asked to remove rows or columns.                                              |
| `undoRequested`         | `void`                          | `Ctrl+Z`. The sheet undoes nothing itself.                                               |
| `redoRequested`         | `void`                          | `Ctrl+Shift+Z` or `Ctrl+Y`.                                                              |
| `columnMoved`           | `{ from, to, key, keys }`       | A header was dropped. `keys` arrives already reordered.                                  |
| `mergeRequested`        | `HubSpreadsheetMergeRequest`    | The reader asked to put a selection together. Carries what it swallows.                  |
| `unmergeRequested`      | `readonly HubGridCoords[]`      | The reader asked to take apart the blocks their selection touches.                       |

### Helpers

| Function                             | What it gives you                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `spreadsheetRecords(rows, columns)`  | Every row as plain data keyed by alias.                                                 |
| `spreadsheetRecord(row, columns)`    | One row, likewise.                                                                      |
| `duplicateColumnKeys(columns)`       | Aliases declared more than once, which would silently overwrite.                        |
| `nextColumnKey(taken, prefix?)`      | An alias that has never been used.                                                      |
| `danglingColumnKeys(refs, columns)`  | References that no longer resolve to a column.                                          |
| `parseDecimal(text, mark)`           | A number, `null` for empty, `undefined` for unreadable.                                 |
| `parseClipboardTable(payload)`       | A pasted block, with raw numbers where the source declared them.                        |
| `serialiseClipboardTable(rows)`      | Both clipboard flavours of a block.                                                     |
| `isStructureAllowed(perm, subj, i)`  | Whether a permission lets one subject through; a throwing predicate reads as a refusal. |
| `resolveInsertIndex(ref, side, len)` | Where an insertion lands, clamped to the collection.                                    |
| `provideHubSpreadsheetControls(a)`   | Registers a control adapter, so every list column opens with it. See below.             |
| `mergeRequestFor(spans, range)`      | The block a selection would become, and what it swallows; null for one cell.            |
| `applySpanMerge(spans, request)`     | The list of blocks after that merge, with the swallowed ones dropped.                   |
| `applySpanUnmerge(spans, anchors)`   | The list after those blocks are taken apart.                                            |
| `spansWithin(spans, range)`          | The blocks a rectangle touches.                                                         |
| `sheetToXlsx(rows, cols, o?)`        | The sheet as a real `.xlsx`, as bytes.                                                  |
| `downloadXlsx(name, bytes)`          | Hands the reader that workbook to save.                                                 |
| `xlsxToTable(bytes, o?)`             | A workbook's first sheet as text, shared strings and date formats undone.               |
| `xlsxToRecords(bytes, cols, o?)`     | The same, keyed by column alias.                                                        |
| `sheetToCsv(rows, cols, o?)`         | The sheet as CSV, separator chosen from the decimal mark.                               |
| `downloadText(name, text)`           | Hands the reader that file, with the mark that makes it UTF-8.                          |
| `csvToTable(text, o?)`               | A CSV as text, its separator sniffed rather than assumed.                               |
| `csvToRecords(text, cols, o?)`       | The same, keyed by column alias.                                                        |
| `sheetValues(rows, cols, o?)`        | What every cell holds, with the formulas worked out.                                    |

## Formulas

`formulas` reads a cell whose value starts with `=` as one. A column can be named by the alias it
was declared with, which is what the aliases were for:

```ts
{ id: 'a', units: 400, price: 0.12, total: '=[units] * [price]' }
```

Reorder the columns, rewrite a header, and every formula still means what it said. Excel made the
other choice, and renaming a column there rewrites every formula in the workbook.

Coordinates work too, beside the aliases — `=ROUND(SUM(E1:E4), 2)`. A coordinate says _where_ a
column was rather than which one it is, so when the sheet changes shape the formulas have to change
with it: `rewriteRowFormulas()` moves every coordinate in the rows after a column is moved or rows
and columns are inserted or deleted, and a reference to something deleted becomes `#REF!` rather
than quietly reading its neighbour. The host calls it in its own handler, because the rows are the
host's.

| Written                     | Means                                                        |
| --------------------------- | ------------------------------------------------------------ |
| `[units]`                   | This row's value in the `units` column.                      |
| `B3`, `SUM(A1:B4)`          | A coordinate and a range, as a spreadsheet writes them.      |
| `[total:]`                  | Every **other** row's value in `total` — see the note below. |
| `+ - * / ^`                 | Arithmetic; `&` joins text.                                  |
| `= <> < <= > >=`            | Comparison, numbers as numbers and words as words.           |
| `IF(test, then, else)`      | Only the branch it takes is worked out.                      |
| `SUM AVERAGE MIN MAX COUNT` | Over values and whole columns, gaps left out.                |
| `ROUND ABS LEN CONCAT`      | The usual.                                                   |
| `AND OR NOT TRUE FALSE`     | Yes and no.                                                  |

**A whole column leaves out the cell asking for it.** `=SUM([total:])` written in the total row is
what everybody writes, and taken literally it is a sum that needs its own answer. Reading a
_different_ column is untouched: a total row that sums the prices sums every price.

Everything else that goes round in a circle is caught and shown, not chased. A cell that cannot be
worked out shows what a spreadsheet shows — `#DIV/0!`, `#NAME?`, `#VALUE!`, `#CYCLE!`, `#SYNTAX!` —
and is marked. The cell shows the answer; the editor shows the formula, so a mistake is corrected
rather than retyped; the clipboard carries the formula, which is what the cell holds.

**The sheet says what can go in one.** Typing `=` brings up the functions and the columns, narrowed
as you type, chosen with the arrows and `Enter`; inside brackets only columns are offered. At the
same time every header shows the alias a formula calls that column by, and clicking one writes it.
Without that, writing a formula means knowing a name the sheet never showed.

**A formula can also be fixed on the column**, declared in code rather than held by the data:

```ts
{ key: 'vat', header: 'VAT 21%', kind: 'currency', formula: '=ROUND([total] * 0.21, 2)', cell: () => ({ value: null }) }
```

The same formula in every row, and the cells cannot be typed into at all — replacing one would lose
the formula for that row alone, which nobody notices until the totals stop adding up.

The engine is the library's own: `parseFormula`, `evaluateFormula` and `evaluateSheet` are exported
for a host that wants to work a sheet out without drawing it.

## A sheet that is long

`virtual` draws what the viewport covers on both axes and reserves the size of the rest, so ten
thousand rows by fifty columns cost a couple of hundred cells rather than half a million.

```html
<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey" [virtual]="true" />
```

Three things are worth knowing before turning it on.

- **The rows out of view are not in the document.** The browser's own find and printing reach only
  what is drawn. For a sheet meant to be printed, leave it off.
- **The rows have to be of one height.** It is measured off the first row drawn, which is right
  whenever they are alike. Declare `rowHeight` for a sheet built while hidden — a row that has
  never been laid out measures nought, and a window worked out from nought is the whole sheet.
- **The columns are windowed from their measured widths.** The first render draws them all, since
  there is nothing to measure otherwise; one width that cannot be measured falls back to drawing
  them all for good.
- **The sheet becomes the thing that scrolls.** Left to grow it is as tall as its content, the page
  scrolls instead, and there is nothing to virtualise; so turning it on sets a height of `24rem`.
  Set `--hub-spreadsheet-max-block-size` to choose your own.

Frozen rows stay in the document wherever the reader has scrolled, and a merged block reaching into
the window brings its anchor with it — a block is drawn by its anchor, and one left outside the
window would not be drawn at all.

## A richer editor in a cell

A list column opens with a native `<select>`: nothing to install, and the behaviour a phone
already knows. Two ways to put something else there.

**Cells of your own, at rest.** `hubSpreadsheetCell` draws what a column shows while it is not
being edited — a badge, an avatar, a row of actions. The clipboard still carries the value rather
than the drawing.

```html
<ng-template hubSpreadsheetCell="state" let-value>
	<hub-badge variant="soft" [color]="colourOf(value)">{{ labelOf(value) }}</hub-badge>
</ng-template>
```

**One column, one template.** `hubSpreadsheetEditor` names the column by its alias and hands the
template the value, a `commit` / `cancel` pair and `seed` — the character the reader opened the
cell with, which belongs in a picker's search box.

```html
<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
	<ng-template hubSpreadsheetEditor="assignee" let-value let-seed="seed" let-commit="commit">
		<hub-select
			[items]="people"
			autoOpen
			[initialSearchTerm]="seed ?? null"
			[ngModel]="value"
			(ngModelChange)="commit($event)"
		/>
	</ng-template>
</hub-spreadsheet>
```

**Every list column, one provider.** Register an adapter and they all upgrade, with no template
written anywhere:

```ts
import { provideHubSpreadsheetControls } from 'ng-hub-ui-spreadsheet';
import { hubFormControlAdapter } from 'ng-hub-ui-forms';

providers: [provideHubSpreadsheetControls(hubFormControlAdapter)];
```

The adapter is declared by this library and satisfied structurally, so nothing here imports the
package that provides it — the same bargain `ng-hub-ui-paginable` strikes for its table controls.
Register none and the native list stays. A column that declares its own template still wins: a
rule for every column loses to one written for this one.

## Files

Out to a workbook, or to CSV, and back in again.

```ts
import { sheetToXlsx, downloadXlsx, sheetToCsv, downloadText, xlsxToRecords, csvToRecords } from 'ng-hub-ui-spreadsheet';

downloadXlsx('order-lines.xlsx', sheetToXlsx(this.rows(), this.columns, { sheetName: 'Order lines' }));
downloadText('order-lines.csv', sheetToCsv(this.rows(), this.columns, { decimalMark: ',' }));
```

The `.xlsx` keeps what a CSV loses: a figure is a figure and a date is a date, whatever the machine
that opens it thinks the decimal mark is. The CSV is for whoever wants to read it in something
older, and it chooses its separator from that mark — where the comma is the decimal mark a file
written with commas opens as a single column of text, so it writes semicolons instead.

Both write **what the cell shows**: a list column exports the label somebody chose, and a formula
exports the number it came to, because a column of `=[units] * [price]` is of no use to whoever
opens the file. `values: 'stored'` is the other way round, for the file that is meant to come back.

Coming in, both readers return the file's rows keyed by column alias:

```ts
const bytes = new Uint8Array(await file.arrayBuffer());

// A workbook is a zip, and a zip starts with PK. Read rather than taken from the file's name.
const records =
	bytes[0] === 0x50 && bytes[1] === 0x4b
		? await xlsxToRecords(bytes, this.columns)
		: csvToRecords(new TextDecoder().decode(bytes), this.columns);
```

The headings are matched to the columns by header first and alias second, both ignoring case and
surrounding space, so a file whose columns were reordered still lands in the right place and a
heading nothing recognises is left alone rather than written into whatever column came next. What
comes back is text; `parseForColumn(text, column, decimalMark)` turns it into a value, or returns
`undefined` for something the column cannot hold.

**Neither direction brings a dependency.** The zip is written here, with its entries stored rather
than deflated — which the format has always allowed and every reader accepts, at the cost of a file
a few times larger than Excel's. Reading uses the decompressor the platform already has
(`DecompressionStream`, in every browser since 2023), since a real workbook is deflated. What is not
there: several sheets, column widths, and editing a workbook that already exists.

## 🎨 Styling

The component ships its own styles. Nothing to import.

Theme it by setting tokens on any ancestor:

```scss
:root {
	--hub-spreadsheet-cursor-color: #6f42c1;
	--hub-spreadsheet-max-block-size: 60vh;
}
```

Each value falls through `--hub-table-*` before `--hub-sys-*`, so a project that has themed its tables with `ng-hub-ui-paginable` gets its sheets dressed to match without setting anything.

Or in one include, which is the same thing said in Sass:

```scss
@use 'ng-hub-ui-spreadsheet/styles' as sheet;

.invoice-lines {
	@include sheet.hub-spreadsheet-theme(
		$cursor-color: #6f42c1,
		$cell-padding-y: 0.125rem,
		$cell-line-height: 1.2,
		$max-block-size: 60vh
	);
}
```

Every parameter is optional and only what you pass is emitted, so the rest keep falling through the
chain. Reach for it for what a table theme does not already cover, rather than to restate it.

Full catalogue: [`docs/css-variables-reference.md`](./docs/css-variables-reference.md).

## ♿ Accessibility

The sheet is a real `role="grid"`: cells carry `aria-colindex` and their rows `aria-rowindex`, `aria-selected` follows the range, `aria-readonly` marks what cannot be typed into, `aria-invalid` marks an editor holding something unreadable, and `aria-busy` marks a cell being saved. Focus roves: one cell is in the tab order, the arrows do the rest.

One thing worth knowing about the implementation. Browsers dispatch `paste` only to editable elements, so the paste shortcut hands focus to an off-screen field for the length of the event and the cell takes it straight back. That is what keeps the clipboard working in Firefox and Safari, not only in Chrome.

## 🤝 Contributing

```bash
git clone https://github.com/hub-env/hub-ui.git
cd hub-ui
npm install
npm run build:libs
ng test spreadsheet
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Issues, roadmap and discussion live in [hub-env/hub-ui](https://github.com/hub-env/hub-ui).

## 📄 Support & License

- Issues: https://github.com/hub-env/hub-ui/issues
- Docs: https://hubui.dev/en/spreadsheet/overview/

MIT © Carlos Morcillo Fernández. See [LICENSE](./LICENSE).
