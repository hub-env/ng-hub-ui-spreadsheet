import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHubTranslation } from 'ng-hub-ui-utils';
import { compile } from 'sass';
import { locale as enLocale } from '../../assets/i18n/en';
import { HubSpreadsheetColumn } from '../../models/spreadsheet.types';
import { HubSpreadsheetComponent } from './spreadsheet.component';

interface Line {
	id: string;
	name: string;
}

@Component({
	standalone: true,
	imports: [HubSpreadsheetComponent],
	template: `<hub-spreadsheet
		[rows]="rows"
		[columns]="columns"
		[rowKey]="rowKey"
		[contextMenu]="true"
		[structure]="{ insertRows: true }"
	/>`
})
class HostComponent {
	rows: Line[] = [{ id: 'a', name: 'Tornillo' }];
	columns: HubSpreadsheetColumn<Line>[] = [
		{ key: 'name', header: 'Name', cell: (row) => ({ value: row.name, editable: true }) }
	];
	rowKey = (row: Line) => row.id;
}

/**
 * Only the context menu follows the ds glass layer. It floats over the grid, so it blurs; opaque
 * fallbacks keep it unchanged when the layer is off. The grid itself is left alone.
 */
describe('spreadsheet floating panels glass layer', () => {
	function rule(css: string, selector: string): string {
		return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
			.filter(([, sel]) =>
				sel
					.split(';')
					.pop()!
					.split(',')
					.some((s) => s.trim() === selector)
			)
			.map(([, , body]) => body)
			.join('\n');
	}

	const css = compile('projects/spreadsheet/src/lib/components/spreadsheet/spreadsheet.component.scss').css;

	it('marks the menu as a glass surface', async () => {
		await TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [
				provideHubTranslation({ language: 'en', dictionaries: { en: { HUBUI: { SPREADSHEET: enLocale.data } } } })
			]
		}).compileComponents();
		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();

		const cell: HTMLElement = fixture.nativeElement.querySelector('[data-cell="0-0"]');
		cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
		fixture.detectChanges();
		cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.hub-spreadsheet__menu').classList).toContain('hub-glass-surface');
	});

	it('tints and blurs the menu with neutral fallbacks', () => {
		const declarations = rule(css, '.hub-spreadsheet__menu');

		expect(declarations).toContain('var(--hub-sys-glass-opacity, 100%)');
		expect(declarations).toContain('var(--hub-sys-glass-sheen, none)');
		expect(declarations).toContain('var(--hub-sys-glass-filter, none)');
		expect(declarations).toContain('var(--hub-sys-glass-rim');
	});

	it('tints and blurs the formula suggestions, which float like the menu', () => {
		const declarations = rule(css, '.hub-spreadsheet__suggestions');

		expect(declarations).toContain('var(--hub-sys-glass-opacity, 100%)');
		expect(declarations).toContain('var(--hub-sys-glass-sheen, none)');
		expect(declarations).toContain('var(--hub-sys-glass-filter, none)');
		expect(declarations).toContain('var(--hub-sys-glass-rim');
	});

	it('leaves the grid unblurred', () => {
		expect(rule(css, '.hub-spreadsheet__table')).not.toContain('backdrop-filter');
	});
});
