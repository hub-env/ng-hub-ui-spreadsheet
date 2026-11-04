import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HubSpreadsheetColumn } from 'ng-hub-ui-spreadsheet';
import { provideHubTranslation } from 'ng-hub-ui-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { HubSpreadsheetFieldComponent } from './spreadsheet-field.component';

interface Line {
	id: string;
	product: string;
	units: number | null;
}

@Component({
	standalone: true,
	imports: [ReactiveFormsModule, HubSpreadsheetFieldComponent],
	template: `<hub-spreadsheet-field [formControl]="lines" [columns]="columns" [rowKey]="rowKey" />`
})
class ReactiveHost {
	readonly lines = new FormControl<Line[]>(
		[
			{ id: 'a', product: 'Tornillo', units: 100 },
			{ id: 'b', product: 'Arandela', units: 200 }
		],
		{ nonNullable: true }
	);
	readonly rowKey = (row: Line) => row.id;
	readonly columns: HubSpreadsheetColumn<Line>[] = [
		{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product, editable: true }) },
		{ key: 'units', header: 'Unidades', kind: 'number', cell: (row) => ({ value: row.units, editable: true }) }
	];
}

describe('HubSpreadsheetFieldComponent in a reactive form', () => {
	let fixture: ComponentFixture<ReactiveHost>;

	const cell = (row: number, col: number): HTMLElement => fixture.nativeElement.querySelector(`[data-cell="${row}-${col}"]`);

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ReactiveHost],
			providers: [provideHubTranslation()]
		}).compileComponents();

		fixture = TestBed.createComponent(ReactiveHost);
		fixture.detectChanges();
	});

	it('shows the rows a FormControl holds, and what is written into it later', () => {
		expect(cell(1, 0).textContent).toContain('Arandela');

		fixture.componentInstance.lines.setValue([{ id: 'c', product: 'Tuerca', units: 50 }]);
		fixture.detectChanges();

		expect(cell(0, 0).textContent).toContain('Tuerca');
		expect(cell(1, 0)).toBeNull();
	});

	it('writes an edit back into the FormControl, with no code of the host', () => {
		const control = fixture.componentInstance.lines;

		cell(1, 1).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
		cell(1, 1).dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
		fixture.detectChanges();
		cell(1, 1).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		fixture.detectChanges();

		const editor: HTMLInputElement = fixture.nativeElement.querySelector('input.hub-spreadsheet__editor');

		editor.value = '250';
		editor.dispatchEvent(new Event('input'));
		editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		fixture.detectChanges();

		expect(control.value[1]).toEqual({ id: 'b', product: 'Arandela', units: 250 });
		expect(control.dirty).toBe(true);
	});

	it('turns read-only while the FormControl is disabled', () => {
		fixture.componentInstance.lines.disable();
		fixture.detectChanges();

		expect(cell(0, 0).getAttribute('aria-readonly')).toBe('true');
	});
});
