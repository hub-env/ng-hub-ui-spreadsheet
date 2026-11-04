# Breaking Changes

This file documents breaking changes and migration steps for `ng-hub-ui-spreadsheet`.

## [22.12.1] - 2026-11-04

No breaking changes. An end-aligned list column now keeps a lane for its caret; a project that
reserved that room itself can drop its own rule.

## [22.12.0] - 2026-11-04

No breaking changes. One method is new (`editCell`) and `Alt+Enter` opens a cell that is also typed
into; nothing was renamed or removed.

## [22.11.0] - 2026-11-04

No breaking changes. `append` on a column and the `HubSpreadsheetAppend` type are new; nothing was
renamed or removed.

## [22.10.0] - 2026-11-04

No breaking changes. One method is new (`focusCell`); nothing was renamed or removed. Four behaviours
change, and a sheet of yours may have leaned on the old ones:

- **A cell's `title` is no longer a native `title` attribute.** It opens the sheet's tooltip instead.
  A test or a stylesheet that read `[title]` on a cell finds nothing; read the tooltip, or
  `aria-describedby`, which points at it while it is open.
- **A cell template on a yes/no column is now drawn**, beside the box; it used to be ignored. One left
  on such a column will appear. A template on a list or date column now has the column's arrow drawn
  over its end, so leave it a little room on that side.
- **An empty row is as tall as a filled one.** A layout that counted on blank rows being thin gets
  taller.
- **Where `structure` allows inserting rows, a paste longer than the sheet emits `insertRequested`**
  with a `count` that can be more than one. A handler that adds a single row whatever the count gets
  one row, and the paste fills what fits, as before; handle `count` to get the whole block.

## [22.9.0] - 2026-11-03

No breaking changes. The public surface only grows: an `invalidDrafts` model, a `draft` function in
the editor context and two dictionary labels. Nothing was renamed or removed.

Three behaviours change, all of them fixes, and worth knowing if a sheet of yours relied on the old
ones:

- **A supplied editor no longer stays open until it calls `commit` or `cancel`.** `Escape`, `Tab`
  and focus leaving it now close it. A picker keeps it open while the focus is inside it or inside a
  popup one of its controls names through `aria-controls` or `aria-owns`; `hub-select` does both. A
  picker of your own whose panel takes the focus outside the cell without naming it that way would
  now close: name the panel from the control, or keep the focus in the field. A template that already
  calls `cancel` on `Escape` keeps working, and the sheet does not close it a second time.
- **Leaving a cell with text it cannot store keeps the text** in `invalidDrafts` and on screen,
  where it used to be dropped. If you do nothing, the cell shows the text ringed as invalid until the
  reader corrects it; your data is untouched either way, as before.
- **With `reorderableRows`, `Alt+Shift` with the down arrow moves the row** instead of opening the
  cell, which it did only because `Alt` with the down arrow does. Without `reorderableRows` nothing
  changes.

## [22.7.0] - 2026-10-27

### `Backspace` and `Delete` on a single cell open its editor instead of emitting `cleared`

**What changed.** Pressing `Backspace` or `Delete` with one text, number, currency or date cell
selected used to emit `cleared` with that cell. It now opens the cell's editor empty, and the new
value arrives through `commit` when the reader confirms it. `Escape` leaves the cell untouched.

**Still emitted through `cleared`:** a selection of several cells, and a single list (`select`) or
yes/no (`boolean`) cell.

**What to do.** Nothing, if your sheet already handles `commit`: emptying one cell and confirming
it reaches you as a `commit` with a `null` value. If you only emptied cells inside a `cleared`
handler and never handle `commit`, handle it too.

**If you do nothing.** With no `commit` handler, a single cell emptied with `Backspace` or
`Delete` keeps its value in your data. A multi-cell clear works as before.

---

## [22.0.0] - 2026-09-27

First release. Nothing to migrate from.

---

**A note on how this library is versioned.** The major tracks the Angular major it targets, so
`22.x` means "for Angular 22" and says nothing about compatibility between releases. A breaking
change therefore ships as a **minor**, and is described here. This file is the warning that
semantic versioning cannot give under that scheme, so it carries the weight: what changed, what a
consumer has to do, and what happens if they do nothing.
