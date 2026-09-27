/** Public API surface of ng-hub-ui-spreadsheet. */
export type {
	HubSpreadsheetCell,
	HubSpreadsheetCellRef,
	HubSpreadsheetCellState,
	HubSpreadsheetColumn,
	HubSpreadsheetCommit,
	HubSpreadsheetPaste,
	HubSpreadsheetRecord,
	HubSpreadsheetValue,
	HubSpreadsheetValueKind
} from './lib/models/spreadsheet.types';

export { duplicateColumnKeys, spreadsheetRecord, spreadsheetRecords } from './lib/models/spreadsheet-records';

export type { HubClipboardCell, HubClipboardPayload, HubClipboardWrite } from './lib/clipboard/clipboard-table';
export { parseClipboardTable, parseDecimal, serialiseClipboardTable } from './lib/clipboard/clipboard-table';

export type {
	HubSpreadsheetAxis,
	HubSpreadsheetDeleteRequest,
	HubSpreadsheetInsertRequest,
	HubSpreadsheetInsertSide,
	HubSpreadsheetPermission,
	HubSpreadsheetStructureOptions
} from './lib/models/spreadsheet-structure';
export { danglingColumnKeys, isStructureAllowed, nextColumnKey, resolveInsertIndex } from './lib/models/spreadsheet-structure';

export { HubSpreadsheetComponent } from './lib/components/spreadsheet/spreadsheet.component';
export { HubSpreadsheetEditorDirective } from './lib/components/spreadsheet/spreadsheet-editor.directive';
export { HubSpreadsheetCellDirective } from './lib/components/spreadsheet/spreadsheet-cell.directive';
export type { HubSpreadsheetCellContext } from './lib/components/spreadsheet/spreadsheet-cell.directive';
export type { HubSpreadsheetEditorContext } from './lib/components/spreadsheet/spreadsheet-editor.directive';
export { displayValue, isTruthy, optionFor, parseForColumn } from './lib/columns/cell-values';

// Formulas: the parser, the evaluator, and running a whole sheet of them in dependency order.
export { isFormula, parseFormula } from './lib/formulas/formula-parser';
export { evaluateFormula } from './lib/formulas/formula-evaluator';
export { evaluateSheet } from './lib/formulas/formula-sheet';
export { HUB_FORMULA_FUNCTIONS, applySuggestion, formulaFragment, suggestFormula } from './lib/formulas/formula-suggest';
export {
	columnIndexOf,
	columnLabel,
	formatCoordinate,
	moveCoordinate,
	parseCoordinate,
	rewriteCoordinates,
	rewriteRowFormulas
} from './lib/formulas/formula-coordinates';
export type { HubFormulaCoordinate, HubFormulaShapeChange } from './lib/formulas/formula-coordinates';
export type { HubFormulaFragment, HubFormulaSuggestion, HubFormulaVocabulary } from './lib/formulas/formula-suggest';
export type { HubFormulaCellResult, HubFormulaSheet, HubFormulaSheetInput } from './lib/formulas/formula-sheet';
export type {
	HubFormula,
	HubFormulaContext,
	HubFormulaErrorCode,
	HubFormulaFailure,
	HubFormulaNode,
	HubFormulaOutcome,
	HubFormulaSuccess,
	HubFormulaValue
} from './lib/formulas/formula.types';

// Files: a sheet out as CSV or as a real workbook, and a file somebody sends back in.
export { csvToRecords, csvToTable, downloadText, sheetToCsv, sniffDelimiter } from './lib/exchange/csv';
export type { HubCsvOptions } from './lib/exchange/csv';
export { XLSX_MEDIA_TYPE, downloadXlsx, sheetToXlsx } from './lib/exchange/xlsx';
export type { HubXlsxOptions } from './lib/exchange/xlsx';
export { xlsxToRecords, xlsxToTable } from './lib/exchange/xlsx-read';
export type { HubXlsxReadOptions } from './lib/exchange/xlsx-read';
export { tableToRecords } from './lib/exchange/table-records';
export type { HubSheetTable } from './lib/exchange/table-records';
export { sheetValues } from './lib/exchange/sheet-values';
export type { HubSheetValuesOptions } from './lib/exchange/sheet-values';

// What a cell shows for a formula that could not be worked out, for a host that writes its own.
export { FORMULA_ERRORS, FORMULA_ERROR_TEXT, formulaErrorText } from './lib/formulas/formula-errors';

// Putting cells together and taking them apart, for a host that owns the list of blocks.
export { applySpanMerge, applySpanUnmerge, mergeRequestFor, spansWithin } from './lib/models/spreadsheet-spans';
export type { HubSpreadsheetMergeRequest } from './lib/models/spreadsheet-spans';

// Hosting a richer editor in a cell, without the library depending on where it comes from.
export { provideHubSpreadsheetControls } from './lib/editors/editor-adapter.provider';
export { HUB_SPREADSHEET_CONTROLS } from './lib/editors/editor-adapter.token';
export { HubSpreadsheetControlDirective } from './lib/editors/editor-adapter.directive';
export type {
	HubSpreadsheetControlConfig,
	HubSpreadsheetControlHandle,
	HubSpreadsheetControlLabelType,
	HubSpreadsheetControlOption,
	HubSpreadsheetControlsAdapter
} from './lib/editors/editor-adapter.types';
export type { HubSpreadsheetOption } from './lib/models/spreadsheet.types';

export { locale as enSpreadsheetLocale } from './lib/assets/i18n/en';
export { locale as esSpreadsheetLocale } from './lib/assets/i18n/es';
export { locale as frSpreadsheetLocale } from './lib/assets/i18n/fr';
export { locale as deSpreadsheetLocale } from './lib/assets/i18n/de';
export { locale as ruSpreadsheetLocale } from './lib/assets/i18n/ru';
export { locale as jaSpreadsheetLocale } from './lib/assets/i18n/ja';
export { locale as zhSpreadsheetLocale } from './lib/assets/i18n/zh';
export { locale as arSpreadsheetLocale } from './lib/assets/i18n/ar';
