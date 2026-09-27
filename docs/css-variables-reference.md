# ng-hub-ui-spreadsheet — CSS Variables Reference

Every CSS custom property the `ng-hub-ui-spreadsheet` library exposes, what it does, and what it
falls back to. Set any of them to restyle the sheet without touching the source.

---

## Table of Contents

- [How it works](#how-it-works)
- [Importing styles](#importing-styles)
- [Surface and structure](#surface-and-structure)
- [Header](#header)
- [Cursor and selection](#cursor-and-selection)
- [Read-only and muted cells](#read-only-and-muted-cells)
- [The editor](#the-editor)
- [Save state](#save-state)
- [Frozen panes](#frozen-panes)
- [Customisation examples](#customisation-examples)
- [Token architecture](#token-architecture)
- [Best practices](#best-practices)

---

## How it works

Each value travels through up to four steps before it reaches a colour:

```
--hub-spreadsheet-*  →  --hub-table-*  →  --hub-sys-*  →  literal
```

The middle step is what makes a sheet look like it belongs next to the tables already on the
page. `ng-hub-ui-paginable` publishes a full set of `--hub-table-*` tokens; a project that has
themed its tables gets the sheet dressed to match without setting anything, because the sheet
asks the table first and the design system second.

Two consequences worth knowing:

- **Restyling tables restyles sheets.** That is usually what you want. Where it is not, set the
  `--hub-spreadsheet-*` token directly and it wins.
- **Neither library is required.** With `ng-hub-ui-paginable` absent and the design system
  unloaded, every chain still ends at a literal and the sheet renders correctly.

Only what a sheet adds on top of a table is declared here. Background, text colour, borders and
cell padding are inherited rather than restated, so there is one place to change them.

---

## Importing styles

The component carries its own styles. Nothing needs importing for it to render.

To theme it, set the tokens on any ancestor — `:root` for the whole application, a wrapper class
for one screen, or the element itself for one sheet:

```scss
:root {
	--hub-spreadsheet-cursor-color: #6f42c1;
}
```

```html
<hub-spreadsheet style="--hub-spreadsheet-max-block-size: 60vh" [rows]="rows()" ... />
```

---

## Surface and structure

| Variable                           | Falls back to                                                             | What it does                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `--hub-spreadsheet-bg`             | `--hub-table-bg` → `--hub-sys-color-surface` → `#fff`                     | Background of the sheet and of every cell.                     |
| `--hub-spreadsheet-color`          | `--hub-table-color` → `--hub-sys-color-text` → `#212529`                  | Text colour of the values.                                     |
| `--hub-spreadsheet-border-color`   | `--hub-table-border-color` → `--hub-sys-border-color-default` → `#dee2e6` | Grid lines and the outer frame.                                |
| `--hub-spreadsheet-border-width`   | `--hub-table-border-width` → `1px`                                        | Thickness of those lines.                                      |
| `--hub-spreadsheet-border-radius`  | `--hub-table-border-radius` → `--hub-sys-radius-lg` → `0.5rem`            | Rounding of the outer frame.                                   |
| `--hub-spreadsheet-cell-padding-x` | `--hub-table-cell-padding-x` → `0.6rem`                                   | Horizontal padding inside a cell.                              |
| `--hub-spreadsheet-cell-padding-y` | `--hub-table-cell-padding-y` → `0.4rem`                                   | Vertical padding inside a cell.                                |
| `--hub-spreadsheet-max-block-size` | `--hub-table-container-max-block-size` → `none`                           | Height at which the sheet starts scrolling instead of growing. |

Set `--hub-spreadsheet-max-block-size` if you want a sheet that scrolls: without it the element
grows to fit its rows, and the frozen header has nothing to stay still against.

---

## Header

| Variable                               | Falls back to                                                             | What it does                  |
| -------------------------------------- | ------------------------------------------------------------------------- | ----------------------------- |
| `--hub-spreadsheet-header-bg`          | `--hub-table-container-bg` → `--hub-sys-color-surface-subtle` → `#f8f9fa` | Background of the header row. |
| `--hub-spreadsheet-header-color`       | `--hub-sys-text-muted` → `#6a737b`                                        | Header text.                  |
| `--hub-spreadsheet-header-font-size`   | `0.8125rem`                                                               | Header text size.             |
| `--hub-spreadsheet-header-font-weight` | `600`                                                                     | Header text weight.           |

---

## Cursor and selection

A table has no cursor, so these are the sheet's own and fall back to the design system's accent
rather than to a table token.

| Variable                         | Falls back to                         | What it does                                         |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `--hub-spreadsheet-cell-line-height` | `1.5em` | The line a row of text stands on; holds a cell's height while its content is away in an editor. |
| `--hub-spreadsheet-cell-edge-inline` | `var(--hub-spreadsheet-border-width)` | Thickness of a cell's trailing border, re-declared per cell so an editor laid over it covers the border exactly. Plumbing, not a theming hook. |
| `--hub-spreadsheet-cell-edge-block` | `var(--hub-spreadsheet-border-width)` | The same for the bottom border. |
| `--hub-spreadsheet-cursor-color` | `--hub-sys-color-primary` → `#0d6efd` | Outline of the active cell, and the editor's border. |
| `--hub-spreadsheet-cursor-width` | `2px`                                 | Thickness of that outline.                           |
| `--hub-spreadsheet-selection-bg` | the cursor colour at 12 %             | Tint over every cell of the selected range.          |

The cursor is drawn as an overlay rather than as a border, so moving it never shifts the cells
around it by the width of a line.

---

## The structural menu

| Variable                                | Falls back to                      | What it does                        |
| --------------------------------------- | ---------------------------------- | ----------------------------------- |
| `--hub-spreadsheet-suggestions-bg` | `var(--hub-spreadsheet-menu-bg)` | Background of the formula suggestions. |
| `--hub-spreadsheet-suggestions-border-color` | `var(--hub-spreadsheet-menu-border-color)` | Their border. |
| `--hub-spreadsheet-suggestion-on-bg` | `var(--hub-spreadsheet-selection-bg)` | The suggestion the keyboard is on. |
| `--hub-spreadsheet-alias-bg` | the cursor colour at 12 % | Background of the alias chip on a header while a formula is being written. |
| `--hub-spreadsheet-alias-color` | `var(--hub-spreadsheet-cursor-color)` | Its text. |
| `--hub-spreadsheet-menu-bg`             | `--hub-sys-color-surface` → `#fff` | Background of the menu.             |
| `--hub-spreadsheet-menu-color`          | the sheet's text colour            | Its text.                           |
| `--hub-spreadsheet-menu-border-color`   | the sheet's border colour          | Its outline.                        |
| `--hub-spreadsheet-menu-radius`         | `--hub-sys-radius-sm` → `0.25rem`  | Its rounding.                       |
| `--hub-spreadsheet-menu-shadow`         | `0 6px 20px rgb(0 0 0 / 18%)`      | Shadow that lifts it off the sheet. |
| `--hub-spreadsheet-menu-item-padding-x` | `0.85rem`                          | Horizontal padding of an entry.     |
| `--hub-spreadsheet-menu-item-padding-y` | `0.4rem`                           | Vertical padding of an entry.       |
| `--hub-spreadsheet-menu-item-bg-hover`  | the selection tint                 | The entry under the pointer.        |

The menu appears on right-click when `contextMenu` is set, and only ever lists what `structure`
allows. It is never opened empty.

## Dragging columns

| Variable                              | Falls back to     | What it does                                       |
| ------------------------------------- | ----------------- | -------------------------------------------------- |
| `--hub-spreadsheet-resize-grip-width` | `5px`             | Width of the target on a header's trailing edge.   |
| `--hub-spreadsheet-resize-grip-color` | the cursor colour | Colour it takes while the pointer is on it.        |
| `--hub-spreadsheet-moving-opacity`    | `0.5`             | How faint a header goes while it is being dragged. |

The grip is invisible until reached for. A line down every header is noise; a target that is
there when you go for it is not. Both need `resizableColumns` or `reorderableColumns` to be set.

## The fill handle

| Variable                              | Falls back to            | What it does                                            |
| ------------------------------------- | ------------------------ | ------------------------------------------------------- |
| `--hub-spreadsheet-fill-handle-size`  | `7px`                    | Side of the square grip at the corner of the selection. |
| `--hub-spreadsheet-fill-handle-color` | the cursor colour        | Colour of that grip, so the two read as one thing.      |
| `--hub-spreadsheet-fill-preview-bg`   | the cursor colour at 6 % | Tint over the area a released drag would write to.      |

The grip only appears when `fillHandle` is set and the sheet is not read-only.

## Column hints

| Variable                                | Falls back to                      | What it does                             |
| --------------------------------------- | ---------------------------------- | ---------------------------------------- |
| `--hub-spreadsheet-affordance-color` | `--hub-select-arrow-color` → `--hub-sys-text-muted` | Colour of the caret or calendar mark on a cell that opens onto a list or a date. |
| `--hub-spreadsheet-affordance-size` | `--hub-select-arrow-size` → `5px` | How big that mark is. |
| `--hub-spreadsheet-affordance-gap` | `--hub-select-arrow-gap` → `0.5rem` | How far it is held off the cell's trailing edge, and the width of its hit area. |
| `--hub-spreadsheet-affordance-field-border` | `--hub-input-border-width` → `1px` | The frame of the field that opens over the cell; the mark lines up with its content edge. |
| `--hub-spreadsheet-placeholder-color`   | `--hub-sys-text-muted` → `#6a737b` | Colour of a column's `placeholder` hint. |
| `--hub-spreadsheet-placeholder-opacity` | `0.65`                             | How strongly it shows on hover.          |
| `--hub-spreadsheet-placeholder-transition` | `--hub-sys-transition-fast` → `all 0.15s ease-in-out` | How the hint fades in and out. |

A hint appears only in an empty cell and only while the pointer rests on it. Shown always, a
column of hints reads as a column of content, and a reader scanning for what is filled in would
have to look twice at every row.

## Read-only and muted cells

| Variable                           | Falls back to                                           | What it does                                                         |
| ---------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| `--hub-spreadsheet-readonly-bg`    | the header background at 55 % over the sheet background | Background of a cell that cannot be typed into.                      |
| `--hub-spreadsheet-readonly-color` | `--hub-sys-text-muted` → `#6a737b`                      | Text of a read-only cell, of a muted cell, and of the empty message. |

---

## The editor

| Variable                          | Falls back to                        | What it does                                          |
| --------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `--hub-spreadsheet-editor-bg`     | `var(--hub-spreadsheet-bg)`          | Background of the field that replaces a cell.         |
| `--hub-spreadsheet-editor-color`  | `var(--hub-spreadsheet-color)`       | Its text colour.                                      |
| `--hub-spreadsheet-editor-field-bg` | `transparent` | Background of a control supplied by the host, inside the cell. |
| `--hub-spreadsheet-editor-field-border-color` | `transparent` | Its border colour; transparent keeps the box's geometry, so nothing shifts. |
| `--hub-spreadsheet-editor-field-border-radius` | `0` | Its corners, square so the cell's mark is the only frame. |
| `--hub-spreadsheet-editor-field-focus-shadow` | `none` | Its focus ring, dropped for the same reason. |
| `--hub-spreadsheet-invalid-color` | `--hub-sys-color-danger` → `#b3261e` | Border and text when what was typed is not a value.   |
| `--hub-spreadsheet-invalid-border-width` | `1px` | Thickness of the ring that marks an invalid cell, drawn inside it so nothing shifts. |
| `--hub-spreadsheet-invalid-bg`    | the invalid colour at 10 %           | Tint of the cell while it holds something unreadable. |

An editor holding text that does not parse stays open and turns red rather than closing and
discarding what the reader wrote.

---

## Save state

Each state paints a bar down the leading edge of the cell instead of adding a badge, so a column
of them reads as a column.

| Variable                                 | Falls back to                         | State       |
| ---------------------------------------- | ------------------------------------- | ----------- |
| `--hub-spreadsheet-state-pending-color`  | `--hub-sys-color-warning` → `#cc8a00` | `pending`   |
| `--hub-spreadsheet-state-saving-color`   | `--hub-sys-color-info` → `#0a7ea4`    | `saving`    |
| `--hub-spreadsheet-state-saved-color`    | `--hub-sys-color-success` → `#1a7f37` | `saved`     |
| `--hub-spreadsheet-state-error-color`    | `--hub-sys-color-danger` → `#b3261e`  | `error`     |
| `--hub-spreadsheet-state-conflict-color` | `--hub-sys-color-danger` → `#b3261e`  | `conflict`  |
| `--hub-spreadsheet-state-bar-width`      | `3px`                                 | All of them |

`conflict` is drawn as diagonal stripes in its colour, so it is told apart from `error` without
relying on colour alone.

---

## Frozen panes

| Variable                                 | Falls back to                                                                       | What it does                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| `--hub-spreadsheet-frozen-divider-color` | `var(--hub-spreadsheet-border-color, var(--hub-sys-border-color-default, #dee2e6))` | The seam between a frozen pane and the rest. |
| `--hub-spreadsheet-frozen-divider-width` | `2px`                                                                               | Its thickness.                               |

The seam is heavier than a grid line on purpose: what it separates is not two cells but two
things that scroll independently.

---

## Customisation examples

### One sheet, not all of them

```html
<hub-spreadsheet
	style="--hub-spreadsheet-cursor-color: #198754; --hub-spreadsheet-max-block-size: 24rem"
	[rows]="rows()"
	[columns]="columns"
	[rowKey]="rowKey"
/>
```

### Inheriting a table theme

Nothing to do. If `--hub-table-*` is already set for the screen, the sheet picks it up.

```scss
.invoice {
	--hub-table-bg: #fffdf7;
	--hub-table-border-color: #e6ddc7;
	// The sheet below now matches the invoice table above it.
}
```

### A denser sheet

```scss
.compact-sheet {
	--hub-spreadsheet-cell-padding-x: 0.35rem;
	--hub-spreadsheet-cell-padding-y: 0.15rem;
	--hub-spreadsheet-header-font-size: 0.75rem;
}
```

### Dark mode

Nothing specific to do when the design system is loaded: `--hub-sys-*` already switches, and the
sheet follows. Without it, redefine the surface tokens under your own dark selector.

```scss
[data-theme='dark'] {
	--hub-spreadsheet-bg: #1c2025;
	--hub-spreadsheet-color: #e8eaed;
	--hub-spreadsheet-border-color: #2c3138;
	--hub-spreadsheet-header-bg: #15181c;
}
```

### A colour-blind-safe selection

```scss
:root {
	--hub-spreadsheet-cursor-color: #0072b2;
	--hub-spreadsheet-selection-bg: rgba(0, 114, 178, 0.14);
}
```

---

## Token architecture

Three layers, as everywhere else in the family:

- **`ref`** — raw values. Never consumed by a component directly.
- **`sys`** — semantic values: `--hub-sys-color-primary`, `--hub-sys-text-muted`. What a
  component reaches for when it has no opinion.
- **component** — `--hub-spreadsheet-*` and `--hub-table-*`. What a consumer overrides.

The sheet adds one hop to the usual chain by asking `--hub-table-*` before `--hub-sys-*`. Every
declaration still ends at a literal, so the stylesheet is self-contained and renders correctly on
its own.

---

## Best practices

- **Set tokens, do not write selectors.** Reaching into `.hub-spreadsheet__cell` couples you to
  markup that will change; the tokens will not.
- **Theme the table when you want both to match**, and the sheet only when you want them to
  differ. Setting both to the same value is a value that has to be changed twice.
- **Keep the cursor colour distinct from the state colours.** The cursor says where you are, the
  bars say what the server is doing, and a reader should not have to work out which is which.
- **Check contrast after changing `--hub-spreadsheet-selection-bg`.** It sits behind cell text,
  and a tint that looks subtle on white can drop the text below 4.5:1 on a coloured surface.
- **Set a height if you want frozen panes.** With no `--hub-spreadsheet-max-block-size` the sheet
  never scrolls, and a pinned header has nothing to stay still against.
