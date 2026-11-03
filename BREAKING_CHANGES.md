# Breaking Changes

This file documents breaking changes and migration steps for `ng-hub-ui-spreadsheet`.

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
