# Changelog

## [22.6.0] - 2026-09-30

### Added

- **A cell can say what it is empty *of*.** `HubSpreadsheetCell` gains `placeholder`: a hint
  shown in that cell while it is empty, on hover — the figure it would inherit from elsewhere, a
  default it falls back on. Where the column's own `placeholder` says the same thing in every row,
  this one says what a particular empty cell stands for; left out, the column's is used.

## [22.5.0] - 2026-09-29

### Changed

- **`hubSpreadsheetCellAction` answers per row.** It was a name for the whole column, so the cells
  of a column all opened or none did. It now also takes a **function of the row**, for a column
  where only some cells open — a product whose folded row opens its variants while its own row is
  only read, a figure that opens the tiers behind it while the cells beside it are edited. `Enter`
  opens the rows the function answers for and leaves every other cell the sheet's. A string still
  means the whole column, so nothing that already worked changes.

## [22.4.0] - 2026-09-28

### Added

- **A row opens in place, with `expansion` and `expandedRow`.** A template drawn under the row
  itself, for what a row holds behind its figures — a detail panel, the lines behind a total, a
  breakdown — where the row is rather than in a dialog over it, so the open row can still be read
  against the one above. `expandedRow` is two-way and names the row by its key, so the owner can
  open one from its own code and hear it when the reader does; one row at a time. The template is
  handed the row, its index, its key and a way to close it, and a row opened through a cell's own
  template is the owner's to open: the sheet reports the intent and the owner writes `expandedRow`.

- **A cell that opens onto something, said by its template.** A cell is drawn by the owner already —
  `hubSpreadsheetCell` — so what a cell opens is drawn there too; what the sheet has to be told is
  that it opens, with `hubSpreadsheetCellAction` on that template. Given, the sheet keeps `Enter`
  for the cell instead of opening an editor the cell has not got, and reports the press through
  `opened`; the template draws the way in — a link, a button — and calls `open()` from its context.
  The sheet draws nothing itself and adds no string to its dictionary: the accessible name is the
  owner's, as a header and a cell's text already are.

- **Columns and rows fold by outline, the way Excel's grouping works.** A column carries a `level`,
  and an accessor — `rowLevel`, like `rowKey` — reports one for a row; a run of neighbours at a
  level is a group, and the sheet draws the toggle that folds it: over the column headers, and at
  the leading edge of the row that folds what is under it. Which groups are folded is the owner's,
  through `collapsedColumns` and `collapsedRows`, both two-way, so a group can be folded from the
  owner's own code and the reader's fold heard. A group that is out is tinted, so the run reads as
  one thing; a group that is folded leaves a line where it was — vertical for a run of columns,
  horizontal for a run of rows — at the border it collapsed on. A folded group is simply not drawn,
  and the change is animated through the View Transition API where the browser has it. Nothing
  carries a string of its own: the toggles' names are the owner's (`columnToggleLabel`,
  `rowToggleLabel`).

## [22.2.0] - 2026-09-27

### Added

- **The cells that hold a formula say so.** A small rounded `fx` sits in the top corner of a formula
  cell, shown while the pointer is on it, so a reader can tell what is worked out from what was
  typed without opening the cell. Pressing it opens the cell on its formula, ready to be edited —
  and on a cell whose formula cannot be edited, a column that carries its own, the mark does not
  take the pointer at all. It takes two tokens of its own, `--hub-spreadsheet-formula-bg` and
  `--hub-spreadsheet-formula-color`, with their mixin parameters. Only when the sheet reads
  formulas: with that off, a leading `=` is just a character somebody typed.

### Fixed

- **The coordinates come out only for a formula.** They were drawn whenever a cell was open, which
  put a letters-and-numbers frame around a word somebody was only correcting. Now they wait for the
  first `=`: a plain edit has no reference to read off or point at.
- **The coordinates are drawn outside the frame.** They sat inside the sheet's frame, over the
  header and the first column. The whole frame shifts down and in a touch now, and the badges — a
  column's letter and alias, a row's number — float outside it, so the frame stays between them and
  the table, which is what makes them read as a ruler rather than as cells.
- **The list of what can go into a formula follows the frame.** Writing the first `=` moves the
  whole sheet, and the list was left where the cell had been. It is placed again once the frame has
  shifted, so it hangs off the cell where the cell now is.

## [22.1.0] - 2026-09-27

### Added

- **More than one block at a time.** `Ctrl`-clicking (`Cmd` on a Mac) keeps the rectangle that was
  being drawn and starts another, so a reader can pick blocks that have nothing to do with each
  other — which is what everybody does in a spreadsheet to empty four scattered patches in one go.
  Every rectangle is marked, `Delete` empties all of them, and the cursor stays in the last one. Any
  ordinary click or arrow key starts the selection again, as a spreadsheet does. `selectionChange`
  keeps reporting the rectangle the cursor is in; the new `selectionRangesChange` reports them all,
  for a host showing the sum of what is selected. `disjointSelection` turns the gesture off for a
  host that wants the modifier for something of its own.
    - **A copy only happens when the blocks make a table**: all on the same columns, so they stack,
      or all on the same rows, so they sit side by side. Anything else is refused and the clipboard
      is left as it was, rather than squashing blocks together into a shape nobody chose — the same
      rule behind Excel's "that command cannot be used on multiple selections".
    - **The fill handle is dropped** while more than one block is picked. A fill continues one
      rectangle, and which of several it would continue has no answer.
- **`hub-spreadsheet-theme`, one include for the sheet's 65 themeable tokens.**
  `@use 'ng-hub-ui-spreadsheet/styles' as sheet;` and every parameter is optional, so only what is
  passed is emitted and the rest keep falling through `--hub-table-*` to the design system. Reach
  for it for what a table theme does not already cover.
- **A formula is written in colour.** While one is being written, the sheet draws the draft twice:
  the field holds the text, and a copy behind it — the one the reader sees — colours each piece by
  what it is, the way a spreadsheet does. A function, a column alias, a cell reference and a quoted
  string each get their own colour _and a faint wash of it_, so where one piece ends and the next
  begins is visible even when two of them are the same; numbers, booleans and operators keep the
  sheet's text colour and the punctuation steps back. Four new tokens,
  `--hub-spreadsheet-token-{function,column,coordinate,text}-color`, with the mixin parameters to
  match.
- **The coordinates come out while a cell is open.** The table shifts down and in a touch leaving
  room, and into it float badges: a column's letter and the alias a formula calls it by over the
  header, the row's number down the leading edge — so a reference can be read off the sheet instead
  of counted, and the alias is somewhere on screen at last. They arrive with a short animation and
  the shift is animated too, so opening a cell does not move it out from under the caret. Nothing is
  added to the grid: the badges are decoration (the grid already names every cell by its indices),
  and both the shift and the badges are laid out with logical properties, so they mirror with the
  sheet's direction.
- **A `direction` input, and right-to-left sheets.** `'auto'` follows the page — `dir` is inherited,
  so a sheet inside a right-to-left article reads the way the article does — while `'ltr'` and
  `'rtl'` force it. The menu and the list of suggestions are placed by their logical start, so they
  hang off the correct edge; the letters run A… from the right and the row numbers move to the right
  edge, as a spreadsheet does in Arabic or Hebrew.
- **Pointing at cells to write their reference.** While a formula is being written, pressing — or
  dragging across — other cells no longer commits the text: it puts what was pointed at into the
  formula at the caret, a single cell as `B3` and a rectangle as `B3:D7`. The pointed cells are
  ringed so the reader sees what is about to go in, `Escape` gives the gesture up, and coordinates
  are used because that is what pointing is: an alias names a whole column, and there is none for one
  cell or for a patch of them.

### Fixed

- **Theming the sheet from outside it now works at all.** The tokens were _declared_ on the host
  element, and a custom property declared on an element beats the same property inherited from an
  ancestor — so `:root`, a wrapper class and a route-level theme were all silently ignored, and the
  only thing that worked was an inline style on the element itself. What the reference document
  promised was therefore false. The chains now live in one place in the stylesheet and every rule
  reads through them, which is what `ng-hub-ui-paginable` has always done, so an ancestor's value is
  the first thing the chain finds. The defaults are unchanged: an untouched sheet renders exactly as
  it did.
- **The list of what can go into a formula is now actually seen.** It existed and was tested, but it
  was drawn inside the cell, and both the sheet's own scroll area and any `overflow: hidden` between
  the cell and the page cut it off: on the last row — the row a total is written in — it fell below
  the viewport and never appeared at all, so the assistant looked absent from the outside. It is
  fixed to the window now, which nothing between the cell and the page can clip, and it opens above
  the cell when the window has no room below. Verified in a browser, not only in the suite.

## [22.0.0] - 2026-09-27

First release. An editable sheet of cells for Angular, built on primitives that live in
`ng-hub-ui-utils` rather than on `@angular/cdk`, so installing it adds nothing outside Angular
itself.

### Added

- **`<hub-spreadsheet>`.** Cells typed into, moved through with the keyboard and pasted into from
  a spreadsheet. The component never writes to the rows it is given: it reports what the reader
  did and the owner decides what to do about it, which is what lets the same component serve an
  invoice, a price list and a timesheet.
- **Formulas, written against the aliases.** `formulas` reads a cell whose value starts with `=`
  as one: `=[units] * [price] * (1 - [discount])`, `=ROUND(SUM([total:]), 2)`. Columns are named by
  the alias they were declared with, which is what the aliases were for — reorder the columns or
  rewrite a header and every formula still means what it said. Arithmetic,
  comparison, text joining, `IF`, `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `ROUND`, `ABS`, `AND`,
  `OR`, `NOT`, `CONCAT` and `LEN`; an engine of the house's own, so there is no licence to inherit
  and nothing to install. A colon reads a whole column, and leaves out the cell that is asking for
  it: `=SUM([total:])` in the total row is what everybody writes, and taken literally it is a sum
  that needs its own answer. Everything else that goes round in a circle is caught and shown as
  `#CYCLE!` rather than chased. The cell shows the answer, the editor shows the formula so a
  mistake is corrected rather than retyped, and a formula that cannot be worked out shows what a
  spreadsheet shows — `#DIV/0!`, `#NAME?`, `#VALUE!` — with the cell marked.
- **Coordinates too, and they move with the sheet.** `B3` and `SUM(A1:A4)` work as they do in a
  spreadsheet, beside the aliases. A coordinate says _where_ a column was rather than which one it
  is, so when the sheet changes shape the formulas have to change with it: `rewriteRowFormulas()`
  moves every coordinate in the rows after a column is moved, or rows and columns are inserted or
  deleted, and a reference to something that has been deleted becomes `#REF!` rather than quietly
  reading its neighbour. Written by the host in its own handler, because the rows are the host's.
- **The sheet says what can go in a formula.** Typing `=` brings up the functions and the columns,
  narrowed as the reader types and put in with the arrows and Enter; inside brackets only columns
  are offered, since a function cannot go there. At the same time every header shows the alias a
  formula calls that column by, and a click on one writes it. Without that, writing a formula means
  knowing a name the sheet never showed — the header carries a title meant for people, not the key
  the formula needs, and that, not the language, is what makes a formula hard to write.
- **A formula fixed on the column.** `columns[].formula` is the same formula in every row, declared
  in code rather than held by the data: a line total, a tax, a running balance. Those cells cannot
  be typed into at all, which is the point — a reader replacing one would lose the formula for that
  row alone, and nobody notices until the totals stop adding up.
- **Two identities per column.** `key` is what everything stored points at; `header` is what the
  reader sees and may be rewritten at any time without touching a stored reference. Reading a
  sheet back with `spreadsheetRecords()` yields plain objects keyed by `key`, so a consumer works
  with `{ price: 12, units: 3 }` instead of mapping coordinates onto its own fields by position.
- **Excel's editing keyboard.** Typing replaces the cell, `F2` and `Enter` open the editor keeping
  the value, `Enter` and `Tab` commit and move on, `Escape` reverts, `Delete` empties the
  selection. `Tab` walks sideways and falls onto the next row at the edge.
- **Rectangular selection**, extended with shift and arrows, with shift-click, or by dragging.
  `Ctrl+A`, `Ctrl+Space` and `Shift+Space` select the sheet, the column and the row.
- **A clipboard that round-trips with Excel.** Copy writes both `text/plain` and `text/html`;
  paste reads both and prefers the raw number the HTML carries, so a figure copied in a locale
  that writes `1.234,56` arrives as 1234.56 rather than as text. Quoting is honoured in both
  directions, so a cell holding a tab or a newline survives the journey.
- **Only the rows in view, for a sheet that is long.** `virtual` draws the rows the viewport
  covers and reserves the height of the rest, so the scrollbar still says how long the sheet is; a
  merged block reaching into the window brings its anchor with it, or it would simply not be drawn
  where a reader scrolled to. The keyboard keeps working across the boundary: the cursor moving to
  a row that is not in the document moves the scroller first and lands on the row the next render
  puts there. Off by default, and honest about the cost — the rows out of view are not in the
  document, so the browser's own find and printing reach only what is drawn, and the rows have to
  be of one height, measured unless `rowHeight` says otherwise. Turning it on also gives the sheet
  a height, because a sheet left to grow is as tall as its content and then there is nothing to
  virtualise at all. The columns are windowed the same way, from their measured widths: the first
  render draws them all, since there is nothing to measure otherwise, and every render after that
  draws the ones in view. One unknown width is enough to fall back to drawing the lot — a window is
  only as honest as the sizes it is built from. A sheet of ten thousand rows and fifty-two columns
  holds around two hundred cells instead of half a million.
- **Out to a file, and back in.** `sheetToXlsx()` writes a real `.xlsx` — figures as figures, dates
  as dates, the header row in bold — and `sheetToCsv()` writes the flat file for whoever wants to
  read it in something older, choosing its separator from the decimal mark, because a file written
  with commas where the comma is the decimal mark opens as a single column of text. Both write what
  the cell shows rather than what the row holds, so a list column exports the label somebody chose
  and a formula exports the number it came to; `values: 'stored'` is the other way round, for the
  file that is meant to come back. Coming in, `xlsxToRecords()` and `csvToRecords()` return the
  file's rows keyed by column alias, matched on the headings by header or by alias and ignoring
  case, so a file whose columns were reordered still lands in the right place and a heading nothing
  recognises is left alone rather than written into whatever column came next.
    - Reading a workbook means undoing two things a CSV never does: a **shared string** is written
      once and pointed at from every cell that holds it, and a **date** is a count of days wearing a
      number format. Without either, a column of the same word arrives as a column of numbers and
      15 January 2024 arrives as `45306`.
    - **Neither direction brings a dependency.** The zip is written here, with its entries stored
      rather than deflated — which the format has always allowed, which every reader accepts, and
      which costs a file a few times larger than what Excel writes. Reading cannot do the same, since
      a real workbook is deflated, so it uses the decompressor the platform already has
      (`DecompressionStream`). Against that, a compression library every consumer of the sheet would
      pay for whether they export anything or not.
- **Frozen panes.** `frozenColumns` and `frozenRows` pin the first tracks, Excel's way, with the
  offsets measured and a seam drawn on the last frozen one.
- **A click picks the cell; typing opens it.** Selecting is the gesture a reader makes most — to
  copy, to look, to drag out a range — so it leaves the value where it is, and the editor waits for
  a double click, `F2`, `Enter`, or simply the first character typed, which opens the editor and
  lands in it. `editOn: 'click'` opens on the first click instead, for a sheet that exists to be
  typed into. Each kind then brings the editor it needs: a list for a column with options, a date
  field, a checkbox that turns over in one go with no editor at all — and the list and the date
  field come up already open, so choosing is the same gesture that opened the cell. The character
  that opened it is never dropped: in a list it picks the first answer that starts with it, as a
  native list does, and a supplied editor is handed it as `seed` so a picker can put it in its
  search box. A date field is the exception, and deliberately: a letter is not a date, and keeping
  it would commit rubbish on the way out. The cell the reader is on also says what it opens onto —
  a caret for a list, a calendar for a date — shown on the cell in hand and on the one under the
  pointer, never down the whole column, where it would read as content. That mark is the way in:
  one click on it opens the cell, without the second the rest of the cell asks for, which is what a
  spreadsheet does with a cell that holds a list. From the keyboard it is `Alt` and the down
  arrow. The mark is the select's own caret — same geometry, same colour, same place, read from
  `--hub-select-arrow-*` where the design system has them and falling through to the sheet's own
  values where it does not — so nothing moves as the field opens over it, and the library still
  depends on nothing but Angular and `ng-hub-ui-utils`. A column may also declare a `placeholder`, shown in an empty cell while
  the pointer rests on it and never in place of a value.
- **A control library wired once, instead of a template per column.**
  `provideHubSpreadsheetControls(adapter)` registers a control adapter, and every list column opens
  with it — searchable, already open, with the character that opened the cell in its search box.
  The contract is declared here and satisfied structurally, so the library imports nothing and
  installs on its own: with no adapter the sheet draws its native list, which is also what a phone
  handles best. `ng-hub-ui-forms` ships an implementation that fits, `hubFormControlAdapter`, the
  same one `ng-hub-ui-paginable` uses for its table controls. A column that needs something else
  still declares `hubSpreadsheetEditor`, which is read first: a template written for one column
  beats a rule for all of them.
- **Cells of your own per column.** `hubSpreadsheetCell` draws what a column shows while it is not
  being edited — a badge for a state, an avatar beside a name, a row of actions — and is the
  sibling of `hubSpreadsheetEditor`, which covers the other half of a cell's life. Two things stay
  the sheet's: the clipboard carries the value and not the drawing, so a copy round-trips as data,
  and the cell is still what the keyboard is on, because the template is drawn inside it rather
  than instead of it. Both directives take the rows through a `…Rows` input that nothing reads, so
  the compiler knows what `row` is inside the template instead of handing it over as `unknown`.
- **An editor of your own per column.** `hubSpreadsheetEditor="<alias>"` replaces the built-in one
  with a template — a searchable `<hub-select>`, a picker of the house, anything that can report a
  value. The template says when it has finished by calling `commit` or `cancel`, so a picker may
  take as many clicks as it needs, and the sheet stays clear of any dependency on it. The keyboard
  lands inside the supplied editor rather than staying on the grid; a `<hub-select>` shows its list
  at once with its own `autoOpen`, which `ng-hub-ui-forms` 22.41 adds for exactly this. A control
  put in a cell wears the cell: its border, its rounded corners and its focus ring are taken off
  through the design system's variables, so the mark the reader sees is the cell's and not the
  field's, and its text sits where the column's text sat a moment earlier. The mark is the same
  thickness on all four sides while a cell is open, which took each cell declaring how thick its
  own trailing borders are: an editor is laid out against the padding box, so it stopped short of
  the border and the cell's mark showed underneath it as a second line a pixel lower. The row holds
  its height while a cell of it is open, too: an editor is positioned out of the flow, so the cell
  stood only as tall as its padding and a row whose other cells happened to be empty collapsed
  under the hand that opened it.
- **Five save states per cell** — `pending`, `saving`, `saved`, `error`, `conflict` — drawn as a
  bar down the leading edge and reported to assistive technology through `aria-busy`.
- **Structural change requests.** `insertRequested` and `deleteRequested` report what the reader
  asked for, gated by `structure`, which refuses everything until told otherwise. `nextColumnKey()`
  allocates an alias that has never belonged to another column, and `danglingColumnKeys()` reports
  what a deletion would leave pointing at nothing.
- **Cells put together and taken apart from the sheet.** `mergeable` offers both in the context
  menu; the sheet reports and writes nothing, as it does with rows and columns, because the list of
  blocks is usually saved with the document. `mergeRequested` carries the block to create _and_ the
  anchors it swallows, which is the case a host gets wrong on its own: append without dropping them
  and two blocks claim the same cell, with the one that wins depending on the order they were
  declared in. `applySpanMerge()` and `applySpanUnmerge()` do it in a line.
- **Real grid semantics.** `role="grid"`, per-cell row and column indices, `aria-selected`,
  `aria-readonly` and a roving tab stop, so the sheet is navigable with a screen reader rather
  than merely styled to look like a grid.
- **Forms, in the shape Angular 22 actually offers.** `errors` takes a validation message per
  cell from whatever source the host has, so the red lands on the cell that is wrong rather than
  on the sheet. The optional `ng-hub-ui-spreadsheet/signals` entry point adds
  `spreadsheetFieldErrors()`, which maps a Signal Forms field tree onto that map, and
  `<hub-spreadsheet-field>`, a `FormValueControl<TRow[]>` for the simple case. Angular forbids
  implementing `ControlValueAccessor` alongside that contract, and does not need it to: on
  Angular 22 one `FormValueControl` serves signal, reactive and template-driven forms alike.
- **63 CSS variables**, documented in [`docs/css-variables-reference.md`](docs/css-variables-reference.md).
  Each one falls through `--hub-table-*` before `--hub-sys-*`, so a project that has themed its
  tables gets its sheets dressed to match without setting anything.

### Fixed

- **A quick typist no longer loses characters.** The field a cell opens into cannot exist until the
  view has been drawn, so `8`, `0`, `0` typed inside one frame had the first character open the
  cell and the other two arrive at the grid with nowhere to go — the cell opened on `8` and
  committed `8`. They are kept now and are in the field the moment it appears.
- **`Enter` no longer opens the cell it lands on.** The keystroke that commits an edit reaches the
  grid a moment later, where it read as a fresh `Enter` on the cell below and opened an editor
  nobody asked for. Every commit did it; `Tab` and `Escape` did the same.

### Notes

- The sheet is not hydrated; it is re-created. A virtualised sheet draws what it measures, and a
  server has no viewport to measure, so what it writes and what a browser then wants are two
  different documents — which is exactly what hydration exists to refuse. The server's copy still
  ships in the page, which is what a crawler reads.
- Input methods are handled: a key arriving mid-composition is ignored, including the legacy `229`
  Safari reports instead of flagging it. Without that, the `Enter` that confirms a Chinese,
  Japanese or Korean character also commits the cell.
- Pasted HTML is parsed, never injected. The clipboard is attacker-controlled input.
