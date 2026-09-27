import { InjectionToken } from '@angular/core';
import { HubSpreadsheetControlsAdapter } from './editor-adapter.types';

/**
 * The optional adapter a sheet renders its list cells through.
 *
 * Injected with `{ optional: true }`: absent means "draw the native list", which is what the
 * library does on its own. Register it with {@link provideHubSpreadsheetControls}.
 */
export const HUB_SPREADSHEET_CONTROLS = new InjectionToken<HubSpreadsheetControlsAdapter>('HUB_SPREADSHEET_CONTROLS');
