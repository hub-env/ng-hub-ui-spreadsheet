# Functionalities of Spreadsheet Library

What `ng-hub-ui-spreadsheet` does today, and which parts have a worked example behind them. A row
marked ❌ under **Example Covered** works but has no example yet; a row marked ❌ under
**Implemented** is not there at all, and says when it is expected.

## Component (`hub-spreadsheet`)

| Category          | Functionality                                                           | Implemented | Example Covered |
| :---------------- | :---------------------------------------------------------------------- | :---------: | :-------------: |
| **Cells**         | Value and display text told apart (`value` / `text`)                    |     ✅      |       ❌        |
|                   | Secondary line under the value (`secondary`)                            |     ✅      |       ❌        |
|                   | A cell that opens onto something, said by its template (`opened`)      |     ✅      |       ❌        |
|                   | Which cells of a column open: all, or answered per row                  |     ✅      |       ✅        |
|                   | Per-cell editability (`editable`)                                       |     ✅      |       ❌        |
|                   | Muted rendering (`muted`)                                               |     ✅      |       ❌        |
|                   | Tooltip (`title`)                                                       |     ✅      |       ❌        |
| **Rows**          | A row opens in place, with its own content (`expansion` / `expandedRow`) |     ✅      |       ✅        |
|                   | A group of rows that folds under its heading (`rowLevel` / `collapsedRows`) |     ✅      |       ✅        |
| **Columns**       | Stable alias plus visible header (`key` / `header`)                     |     ✅      |       ❌        |
|                   | A group of columns that folds away (`level` / `collapsedColumns`)       |     ✅      |       ✅        |
|                   | Translated header (`translate`)                                         |     ✅      |       ❌        |
|                   | Value kinds: text, number, currency (`kind`)                            |     ✅      |       ❌        |
|                   | Alignment (`align`)                                                     |     ✅      |       ❌        |
|                   | Minimum width (`minWidth`)                                              |     ✅      |       ❌        |
|                   | Header hidden from sight but not from screen readers                    |     ✅      |       ❌        |
|                   | Column kinds: text, number, currency, date, boolean, select             |     ✅      |       ✅        |
|                   | A closed list in the cell, refusing what is not on it                   |     ✅      |       ✅        |
|                   | A retired option stays readable and choosable on rows holding it        |     ✅      |       ✅        |
|                   | A checkbox that turns over in one click                                 |     ✅      |       ✅        |
|                   | A hint in an empty cell, on hover (`placeholder`)                       |     ✅      |       ✅        |
|                   | A hint a cell carries of its own, over the column's                     |     ✅      |       ✅        |
| **Editing**       | Type to replace the cell                                                |     ✅      |       ❌        |
|                   | `F2` / `Enter` open the editor keeping the value                        |     ✅      |       ❌        |
|                   | Two clicks to edit, or one (`editOn`)                                   |     ✅      |       ✅        |
|                   | A list or a date field comes up already open                            |     ✅      |       ✅        |
|                   | The character that opened the cell lands in the editor                  |     ✅      |       ✅        |
|                   | A cell shows what it opens onto, in hand or under the pointer           |     ✅      |       ✅        |
|                   | One click on that mark opens the cell                                   |     ✅      |       ✅        |
|                   | `Alt` + `Down` opens a list or a date from the keyboard                 |     ✅      |       ✅        |
|                   | `Enter` commits and moves down, `Tab` commits and moves right           |     ✅      |       ❌        |
|                   | `Escape` reverts                                                        |     ✅      |       ❌        |
|                   | Editor stays open and marked when the value does not parse              |     ✅      |       ❌        |
|                   | Numbers read in the reader's own convention (`decimalMark`)             |     ✅      |       ❌        |
|                   | Input-method safe (composition and the legacy `229`)                    |     ✅      |       ❌        |
|                   | Replaceable editor per column (`hubSpreadsheetEditor`)                  |     ✅      |       ✅        |
|                   | Cells drawn by the host per column (`hubSpreadsheetCell`)               |     ✅      |       ✅        |
|                   | Control adapter for every list column (`provideHubSpreadsheetControls`) |     ✅      |       ✅        |
|                   | A `hub-select`, or any picker, inside a cell                            |     ✅      |       ✅        |
|                   | Per-cell validation (`errors`)                                          |     ✅      |       ✅        |
|                   | Formulas against the column aliases (`formulas`)                        |     ✅      |       ✅        |
|                   | Whole-column reads, circles caught and shown as `#CYCLE!`               |     ✅      |       ✅        |
|                   | Coordinates and ranges (`B3`, `SUM(A1:A4)`), moved with the sheet       |     ✅      |       ✅        |
|                   | Suggestions while writing one, and aliases on the headers               |     ✅      |       ✅        |
|                   | A formula fixed on the column (`columns[].formula`)                     |     ✅      |       ✅        |
| **Navigation**    | Arrows, `Home` / `End`, `Ctrl+Home` / `Ctrl+End`                        |     ✅      |       ❌        |
|                   | `Page Up` / `Page Down` (`pageSize`)                                    |     ✅      |       ❌        |
|                   | `Tab` falls onto the next row at the edge                               |     ✅      |       ❌        |
|                   | Only the rows in view, for a long sheet (`virtual`)                     |     ✅      |       ✅        |
|                   | Only the columns in view, for a wide one                                |     ✅      |       ✅        |
| **Selection**     | Rectangular range, extended with shift or by dragging                   |     ✅      |       ❌        |
|                   | `Ctrl+A`, `Ctrl+Space`, `Shift+Space`                                   |     ✅      |       ❌        |
|                   | `Delete` empties the selection (`cleared`)                              |     ✅      |       ❌        |
|                   | Disjoint selections (`Ctrl`-click a second block)                       |     ✅      |       ✅        |
|                   | `Delete` empties every block; the cursor stays in the last one          |     ✅      |       ✅        |
|                   | A copy only when the blocks make a table, refused otherwise             |     ✅      |       ❌        |
|                   | The fill handle dropped while more than one block is picked             |     ✅      |       ✅        |
| **Clipboard**     | Copy and cut as `text/plain` and `text/html`                            |     ✅      |       ❌        |
|                   | Paste from Excel and Google Sheets                                      |     ✅      |       ❌        |
|                   | Raw number recovered from the HTML flavour                              |     ✅      |       ❌        |
|                   | Quoting honoured both ways (tabs and newlines inside a cell)            |     ✅      |       ❌        |
|                   | Skipped and rejected values counted and reported                        |     ✅      |       ❌        |
| **Merged cells**  | Declared blocks drawn once, with `rowspan` / `colspan`                  |     ✅      |       ❌        |
|                   | Cursor lands on the block, never inside it                              |     ✅      |       ❌        |
|                   | A selection that would clip a block grows to contain it                 |     ✅      |       ❌        |
|                   | Merging and splitting from the sheet (`mergeable`)                      |     ✅      |       ✅        |
|                   | Its entries in the right-click menu, and only when they apply           |     ✅      |       ✅        |
| **Columns**       | Resizing by dragging (`resizableColumns`, `columnWidths`)               |     ✅      |       ✅        |
|                   | Reordering by dragging (`reorderableColumns`, `columnMoved`)            |     ✅      |       ✅        |
| **Menu**          | Right-click menu of structural changes (`contextMenu`)                  |     ✅      |       ✅        |
|                   | Only what the permissions allow, never opened empty                     |     ✅      |       ✅        |
|                   | Eight bundled locales for its own labels                                |     ✅      |       ❌        |
| **Fill**          | Fill handle at the corner of the selection (`fillHandle`)               |     ✅      |       ✅        |
|                   | Number and numbered-text series continued                               |     ✅      |       ✅        |
|                   | A drag reported as one gesture (`filled`)                               |     ✅      |       ✅        |
| **History**       | Undo and redo asked for (`undoRequested` / `redoRequested`)             |     ✅      |       ✅        |
|                   | Availability told to the sheet (`canUndo` / `canRedo`)                  |     ✅      |       ✅        |
|                   | A paste or a fill is one step                                           |     ✅      |       ✅        |
| **Panes**         | Frozen header                                                           |     ✅      |       ❌        |
|                   | Frozen columns (`frozenColumns`)                                        |     ✅      |       ❌        |
|                   | Frozen rows (`frozenRows`)                                              |     ✅      |       ❌        |
| **Save state**    | Five states, drawn as a bar (`states`)                                  |     ✅      |       ❌        |
|                   | `aria-busy` while saving                                                |     ✅      |       ❌        |
| **Structure**     | Insert and delete requests (`insertRequested` / `deleteRequested`)      |     ✅      |       ❌        |
|                   | Permissions, refused by default (`structure`)                           |     ✅      |       ❌        |
|                   | Alias allocation that never reuses (`nextColumnKey`)                    |     ✅      |       ❌        |
|                   | Dangling-reference report (`danglingColumnKeys`)                        |     ✅      |       ❌        |
| **Accessibility** | `role="grid"`, row and column indices, `aria-selected`                  |     ✅      |       ❌        |
|                   | Roving tab stop                                                         |     ✅      |       ❌        |
|                   | `aria-readonly` and `aria-invalid`                                      |     ✅      |       ❌        |
| **Styling**       | 69 CSS variables, inheriting from `--hub-table-*`                       |     ✅      |       ❌        |
|                   | Dark mode through the design system                                     |     ✅      |       ❌        |
|                   | Sass theming mixin (`hub-spreadsheet-theme`, 64 parameters)             |     ✅      |       ✅        |
|                   | Themeable from an ancestor: `:root`, a wrapper class, a route           |     ✅      |       ✅        |
| **Forms**         | Per-cell errors from any source (`errors`)                              |     ✅      |       ✅        |
|                   | Signal Forms field-tree mapping (`spreadsheetFieldErrors`)              |     ✅      |       ✅        |
|                   | The sheet as one form control (`<hub-spreadsheet-field>`)               |     ✅      |       ❌        |
| **Files**         | Export to a real `.xlsx`, written here (`sheetToXlsx`)                  |     ✅      |       ✅        |
|                   | Figures as figures and dates as dates in the workbook                   |     ✅      |       ✅        |
|                   | Export to CSV, separator chosen from the decimal mark                   |     ✅      |       ✅        |
|                   | What the cell shows, or what the row holds (`values`)                   |     ✅      |       ✅        |
|                   | Formulas worked out before writing, `#DIV/0!` and the rest kept         |     ✅      |       ✅        |
|                   | Read a workbook back, shared strings and date formats undone            |     ✅      |       ✅        |
|                   | Read a CSV back, separator sniffed rather than assumed                  |     ✅      |       ✅        |
|                   | Headings matched to the columns, by header or by alias                  |     ✅      |       ✅        |
|                   | No dependency for either: the zip and the XML are written here          |     ✅      |       ✅        |
|                   | Several sheets, column widths, or an existing workbook edited           |     ❌      |       ❌        |
| **Data**          | Structured read by alias (`spreadsheetRecords`)                         |     ✅      |       ❌        |
|                   | Repeated-alias detection (`duplicateColumnKeys`)                        |     ✅      |       ❌        |

## Not here yet

| Functionality                                           | Expected in |
| :------------------------------------------------------ | :---------- |
| Writing several sheets, or editing an existing workbook | Unscheduled |
| A copy of blocks that do not line up                    | Never       |

The last one is a decision rather than a gap: blocks that line up copy as one table, and blocks that
do not have no table to write. Excel refuses the same command for the same reason.

## Examples

Fifteen, all on the [documentation page](https://hubui.dev/en/spreadsheet/examples):

| Example                       | What it is for                                                            |
| :---------------------------- | :------------------------------------------------------------------------ |
| An editable sheet             | The keyboard, the selection and a commit that the host writes             |
| The clipboard                 | Copy out to Excel and paste back in, with the raw figures recovered       |
| Column kinds and editors      | Text, number, currency, date, boolean and a closed list                   |
| Formulas                      | Aliases and coordinates, the suggestions, and a formula fixed on a column |
| Cells drawn by the host       | A column of the sheet's own, with what it opens said by the template      |
| A registered control library  | `provideHubSpreadsheetControls`, so a picker needs no template            |
| Frozen panes                  | Pinned header, columns and rows                                           |
| Merged cells                  | Declared blocks, and merging or splitting from the menu                   |
| Only what is in view          | Ten thousand rows and fifty-two columns                                   |
| Fill and undo                 | The handle, the series it continues, and one step per gesture             |
| Columns resized and reordered | Dragging an edge, dragging a header                                       |
| Save state per cell           | The five states, drawn as a bar                                           |
| Structural changes            | Insert and delete, and the permissions that refuse them                   |
| Signal Forms                  | The sheet as a field tree, with the errors it reports                     |
| Files                         | Out to `.xlsx` or CSV, and either one read back in                        |
