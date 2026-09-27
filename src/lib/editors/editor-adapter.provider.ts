import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { HUB_SPREADSHEET_CONTROLS } from './editor-adapter.token';
import { HubSpreadsheetControlsAdapter } from './editor-adapter.types';

/**
 * Registers the control adapter a sheet opens its list cells with.
 *
 * ```ts
 * import { provideHubSpreadsheetControls } from 'ng-hub-ui-spreadsheet';
 * import { hubFormControlAdapter } from 'ng-hub-ui-forms';
 *
 * providers: [provideHubSpreadsheetControls(hubFormControlAdapter)];
 * ```
 *
 * Every list column then opens with that control, with no template written per sheet. A single
 * column that needs something else still overrides it with `hubSpreadsheetEditor`, which wins.
 *
 * @param adapter - The implementation to use, e.g. `hubFormControlAdapter` from `ng-hub-ui-forms`.
 * @returns Providers to add to the application, or to one component.
 */
export function provideHubSpreadsheetControls(adapter: HubSpreadsheetControlsAdapter): EnvironmentProviders {
	return makeEnvironmentProviders([
		{
			provide: HUB_SPREADSHEET_CONTROLS,
			useValue: adapter
		}
	]);
}
