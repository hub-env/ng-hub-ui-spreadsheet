# Breaking Changes

This file documents breaking changes and migration steps for `ng-hub-ui-spreadsheet`.

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
