/*
 * Public API Surface of ng-hub-ui-spreadsheet/signals
 *
 * Opt-in Angular Signal Forms (`@angular/forms/signals`) integration. Importing this entry
 * point is the only place that pulls in that API; the core `ng-hub-ui-spreadsheet` package
 * never touches it, so a project that uses neither forms system pays nothing for it.
 *
 * Worth knowing before you choose a shape: a control whose value is a collection receives only
 * that field's own errors, never its descendants'. `<hub-spreadsheet-field>` is therefore the
 * convenience, not the whole story — for per-cell validation, keep the sheet bound to your own
 * rows and feed its `errors` input from the field tree. `spreadsheetFieldErrors()` does that
 * mapping for you.
 */

export { HubSpreadsheetFieldComponent } from './lib/spreadsheet-field.component';
export { spreadsheetFieldErrors, touchSpreadsheetField } from './lib/spreadsheet-field-errors';
