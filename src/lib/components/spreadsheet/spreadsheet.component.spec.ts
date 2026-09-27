import { Component, ViewContainerRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubGridCoords, HubGridSpan, provideHubTranslation } from 'ng-hub-ui-utils';
import { locale as enLocale } from '../../assets/i18n/en';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HubSpreadsheetColumn, HubSpreadsheetCommit, HubSpreadsheetPaste } from '../../models/spreadsheet.types';
import { HubSpreadsheetStructureOptions } from '../../models/spreadsheet-structure';
import { HubSpreadsheetMergeRequest } from '../../models/spreadsheet-spans';
import { HubSpreadsheetComponent } from './spreadsheet.component';
import { HubSpreadsheetEditorDirective } from './spreadsheet-editor.directive';
import { HubSpreadsheetCellDirective } from './spreadsheet-cell.directive';
import { provideHubSpreadsheetControls } from '../../editors/editor-adapter.provider';
import { HubSpreadsheetControlConfig, HubSpreadsheetControlsAdapter } from '../../editors/editor-adapter.types';

interface Line {
	id: string;
	product: string;
	units: number | null;
	price: number | null;
}

function lines(): Line[] {
	return [
		{ id: 'a', product: 'Tornillo', units: 100, price: 0.12 },
		{ id: 'b', product: 'Arandela', units: 200, price: 0.04 },
		{ id: 'c', product: 'Tuerca', units: 50, price: 0.09 }
	];
}

@Component({
	standalone: true,
	imports: [HubSpreadsheetComponent],
	template: `
		<hub-spreadsheet
			[rows]="rows()"
			[columns]="columns()"
			[rowKey]="rowKey"
			[states]="states()"
			[errors]="errors()"
			[readonly]="readonly()"
			[structure]="structure()"
			[frozenColumns]="frozenColumns()"
			[frozenRows]="frozenRows()"
			[spans]="spans()"
			[fillHandle]="fillHandle()"
			[contextMenu]="contextMenu()"
			[mergeable]="mergeable()"
			[formulas]="formulas()"
			[virtual]="virtual()"
			[rowHeight]="rowHeight()"
			[editOn]="editOn()"
			[resizableColumns]="resizableColumns()"
			[reorderableColumns]="reorderableColumns()"
			[(columnWidths)]="columnWidths"
			[canUndo]="canUndo()"
			[canRedo]="canRedo()"
			[emptyText]="'Sin líneas'"
			(commit)="commits.push($event)"
			(pasted)="pastes.push($event)"
			(cleared)="cleared.push($event)"
			(filled)="fills.push($event)"
			(columnMoved)="moves.push($event)"
			(undoRequested)="undos = undos + 1"
			(redoRequested)="redos = redos + 1"
			(insertRequested)="inserts.push($event)"
			(deleteRequested)="deletes.push($event)"
			(mergeRequested)="merges.push($event)"
			(unmergeRequested)="unmerges.push($event)"
		/>
	`
})
class HostComponent {
	readonly rows = signal<Line[]>(lines());
	readonly readonly = signal(false);
	readonly states = signal<Record<string, 'saving' | 'saved' | 'error'>>({});
	readonly errors = signal<Record<string, string>>({});
	readonly structure = signal<HubSpreadsheetStructureOptions<Line>>({});
	readonly frozenColumns = signal(0);
	readonly frozenRows = signal(0);
	readonly spans = signal<HubGridSpan[]>([]);
	readonly fillHandle = signal(false);
	readonly contextMenu = signal(false);
	readonly mergeable = signal(false);
	readonly formulas = signal(false);
	readonly virtual = signal(false);
	readonly rowHeight = signal(0);
	readonly editOn = signal<'click' | 'double-click'>('double-click');
	readonly resizableColumns = signal(false);
	readonly reorderableColumns = signal(false);
	readonly columnWidths = signal<Record<string, number>>({});
	readonly canUndo = signal(false);
	readonly canRedo = signal(false);
	readonly rowKey = (row: Line) => row.id;

	readonly columns = signal<HubSpreadsheetColumn<Line>[]>([
		{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product, editable: true }) },
		{ key: 'units', header: 'Unidades', kind: 'number', cell: (row) => ({ value: row.units, editable: true }) },
		{
			key: 'total',
			header: 'Total',
			kind: 'number',
			cell: (row) => ({ value: (row.units ?? 0) * (row.price ?? 0) })
		}
	]);

	commits: HubSpreadsheetCommit<Line>[] = [];
	fills: HubSpreadsheetPaste<Line>[] = [];
	moves: Array<{ from: number; to: number; key: string; keys: string[] }> = [];
	undos = 0;
	redos = 0;
	pastes: HubSpreadsheetPaste<Line>[] = [];
	cleared: unknown[] = [];
	inserts: unknown[] = [];
	deletes: unknown[] = [];
	merges: HubSpreadsheetMergeRequest[] = [];
	unmerges: Array<readonly HubGridCoords[]> = [];
}

describe('HubSpreadsheetComponent', () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	/** The cell at a position, by the marker the template stamps on it. */
	function cell(row: number, col: number): HTMLTableCellElement {
		return fixture.nativeElement.querySelector(`[data-cell="${row}-${col}"]`);
	}

	function press(key: string, init: Partial<KeyboardEventInit> = {}): void {
		const table: HTMLElement = fixture.nativeElement.querySelector('.hub-spreadsheet__table');

		table.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
		fixture.detectChanges();
	}

	function click(row: number, col: number, init: Partial<MouseEventInit> = {}): void {
		cell(row, col).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, ...init }));
		fixture.detectChanges();
	}

	/**
	 * jsdom ships no `ClipboardEvent`, so the event is built by hand with the one field the
	 * component reads. The shape is what matters here, not the constructor.
	 */
	function clipboardEvent(type: string, data: Record<string, string>): Event {
		const event = new Event(type, { bubbles: true, cancelable: true });
		const transfer = {
			getData: (key: string) => data[key] ?? '',
			setData: vi.fn()
		};

		Object.defineProperty(event, 'clipboardData', { value: transfer });

		return event;
	}

	/** The `setData` spy of an event built above. */
	function written(event: Event): ReturnType<typeof vi.fn> {
		return (event as unknown as ClipboardEvent).clipboardData!.setData as unknown as ReturnType<typeof vi.fn>;
	}

	/**
	 * Opens a cell for writing the way the sheet ships: a click picks it, a second one opens it.
	 * Kept as a helper because that is two gestures, and the tests below are about what happens
	 * afterwards rather than about how the editor was reached.
	 */
	function openCell(row: number, col: number): void {
		fullClick(row, col);
		cell(row, col).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		fixture.detectChanges();
	}

	/** A whole click: press and release on the same cell, with nothing in between. */
	function fullClick(row: number, col: number, init: Partial<MouseEventInit> = {}): void {
		click(row, col, init);
		cell(row, col).dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, ...init }));
		fixture.detectChanges();
	}

	function editor(): HTMLInputElement | null {
		return fixture.nativeElement.querySelector('.hub-spreadsheet__editor');
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HostComponent],
			// The sheet's own labels go through the house translation service. The bundled English
			// dictionary is registered here too, so what the menu renders is the real copy rather
			// than a key — which also proves the bundle is wired under the right namespace.
			providers: [
				provideHubTranslation({
					language: 'en',
					dictionaries: { en: { HUBUI: { SPREADSHEET: enLocale.data } } }
				})
			]
		}).compileComponents();
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		fixture.detectChanges();
	});

	describe('what it renders', () => {
		it('draws a cell per row and column, with grid semantics', () => {
			const table: HTMLElement = fixture.nativeElement.querySelector('.hub-spreadsheet__table');

			expect(table.getAttribute('role')).toBe('grid');
			expect(table.getAttribute('aria-rowcount')).toBe('3');
			expect(table.getAttribute('aria-colcount')).toBe('3');
			expect(fixture.nativeElement.querySelectorAll('[role="gridcell"]')).toHaveLength(9);
		});

		it('numbers the rows and columns for assistive technology, counting from one', () => {
			expect(cell(0, 0).getAttribute('aria-colindex')).toBe('1');
			expect(cell(2, 2).getAttribute('aria-colindex')).toBe('3');
			expect(cell(2, 0).closest('tr')?.getAttribute('aria-rowindex')).toBe('3');
		});

		it('shows the value each column reports', () => {
			expect(cell(0, 0).textContent?.trim()).toBe('Tornillo');
			expect(cell(1, 1).textContent?.trim()).toBe('200');
		});

		it('marks the cells that cannot be typed into', () => {
			expect(cell(0, 2).getAttribute('aria-readonly')).toBe('true');
			expect(cell(0, 0).getAttribute('aria-readonly')).toBeNull();
		});

		it('says so when there are no rows', () => {
			host.rows.set([]);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelector('.hub-spreadsheet__empty').textContent).toContain('Sin líneas');
		});

		it('exposes the save state of a cell', () => {
			host.states.set({ 'a\tunits': 'saving' });
			fixture.detectChanges();

			expect(cell(0, 1).getAttribute('data-state')).toBe('saving');
			expect(cell(0, 1).getAttribute('aria-busy')).toBe('true');
		});
	});

	describe('the cursor never spills out of its cell', () => {
		/**
		 * It used to be an overlay stretched past the cell edges, which the next cell painted over
		 * and the scroll area clipped — so it came out broken exactly on the edges where it is
		 * needed most. It is an inward outline now, which cannot overflow.
		 *
		 * Asserted against the stylesheet rather than against computed style: jsdom does not
		 * resolve a shorthand containing `var()`, so `getComputedStyle().outlineStyle` reports
		 * `none` here whatever the rule says, and a test built on that would pass for the wrong
		 * reason or fail for one.
		 */
		it('is styled as an inward outline, with nothing suppressing it on focus', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.join('\n');
			const active = css.slice(css.indexOf('.hub-spreadsheet__cell--active'));

			expect(active).toContain('outline-offset');
			expect(css).not.toMatch(/focus-visible[^{]*\{[^}]*outline:\s*none/);
		});

		/**
		 * A supplied control arrives wearing what it wears in a form: a border, rounded corners and
		 * a focus ring. Inside a cell that is a second mark within the first, and the inner one is
		 * the one the reader believes — it says "this field" where the sheet has to say "this
		 * cell". The frame is taken off through the design system's own variables, so the sheet
		 * depends on no other library to do it.
		 */
		it('takes the frame off a control supplied for a cell, so only the cell is marked', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.join('\n');
			const start = css.indexOf('.hub-spreadsheet__custom-editor');
			const rule = css.slice(start, css.indexOf('}', start));

			expect(start).toBeGreaterThan(-1);
			expect(rule).toContain('--hub-select-border-color');
			expect(rule).toContain('--hub-select-border-radius');
			expect(rule).toContain('--hub-select-focus-box-shadow');
			// The select resolves its own tokens against the input's at `:root`, so it inherits
			// the answer rather than the question and has to be told separately. If these ever go,
			// the frame comes back for a plain input in a cell.
			expect(rule).toContain('--hub-input-border-color');
			expect(rule).toContain('--hub-input-focus-box-shadow');
			// And the editor fills the cell through the layout rather than through a rule aimed at
			// it: built from the host's template, it carries the host's encapsulation, so `> *`
			// written here matches nothing. A one-cell grid stretches it in both directions.
			expect(rule).toContain('display: grid');
		});

		/**
		 * An absolutely positioned child is laid out against the padding box, which stops short of
		 * the cell's own trailing border. The editor then left a pixel uncovered and the cell's
		 * mark showed through it as a second line, so the edge read two pixels thick at the bottom
		 * and one everywhere else. Each cell now says how thick its own edges are — they differ:
		 * none at the edge of the sheet, the divider's width on a frozen seam.
		 */
		it('lays the editor over the cell borders, so the mark is the same thickness all round', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.join('\n');

			for (const editor of ['.hub-spreadsheet__editor', '.hub-spreadsheet__custom-editor']) {
				// The emitted selector carries the encapsulation attribute, so the class is
				// followed by `[_ngcontent-…]` rather than by the brace.
				const start = css.indexOf(`${editor}[`);
				const rule = css.slice(start, css.indexOf('}', start));

				expect(start).toBeGreaterThan(-1);
				expect(rule).toContain('--hub-spreadsheet-cell-edge-block');
				expect(rule).toContain('--hub-spreadsheet-cell-edge-inline');
				// An explicit size is measured against the padding box and quietly beats the
				// insets, which is how the edge came out uneven in the first place.
				expect(rule).not.toMatch(/inline-size:\s*100%/);
			}
		});

		/**
		 * Two hazards in one rule, both found in the browser rather than here.
		 *
		 * A bare `0` for the edge of the last column travels into `calc(… * -1)` as a number
		 * rather than a length, which throws the whole declaration away and leaves the editor
		 * shrinking around its own content. And a cell whose content has gone into an editor holds
		 * nothing in flow, so the row collapses unless the cell is given a height — a minimum will
		 * not do it, because a table cell ignores one.
		 */
		it('keeps the last column and the open row from collapsing', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.join('\n');

			expect(css).toMatch(/--hub-spreadsheet-cell-edge-inline:\s*0px/);
			expect(css).not.toMatch(/--hub-spreadsheet-cell-edge-inline:\s*0\s*[;}]/);

			const start = css.indexOf('.hub-spreadsheet__cell--editing');
			const rule = css.slice(start, css.indexOf('}', start));

			expect(start).toBeGreaterThan(-1);
			expect(rule).toMatch(/[^-]block-size:/);
			expect(rule).not.toContain('min-block-size');
		});

		it('keeps the cell out of the layout conversation, so neighbours never shift', () => {
			click(1, 1);

			// A border would have widened the cell; an outline does not take part in layout.
			expect(getComputedStyle(cell(1, 1)).borderWidth).not.toBe('2px');
		});
	});

	describe('the keyboard', () => {
		it('puts the only tab stop on the first cell before anything is picked', () => {
			expect(cell(0, 0).getAttribute('tabindex')).toBe('0');
			expect(cell(1, 1).getAttribute('tabindex')).toBe('-1');
		});

		it('moves the tab stop with the cursor', () => {
			click(0, 0);
			press('ArrowDown');

			expect(cell(1, 0).getAttribute('tabindex')).toBe('0');
			expect(cell(0, 0).getAttribute('tabindex')).toBe('-1');
		});

		it('extends the selection with shift', () => {
			click(0, 0);
			press('ArrowDown', { shiftKey: true });

			expect(cell(0, 0).getAttribute('aria-selected')).toBe('true');
			expect(cell(1, 0).getAttribute('aria-selected')).toBe('true');
			expect(cell(2, 0).getAttribute('aria-selected')).toBe('false');
		});

		it('jumps to the ends of the sheet with the modifier', () => {
			click(0, 0);
			press('End', { ctrlKey: true });

			expect(cell(2, 2).getAttribute('tabindex')).toBe('0');
		});

		it('selects the whole sheet', () => {
			click(1, 1);
			press('a', { ctrlKey: true });

			expect(fixture.nativeElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(9);
		});
	});

	describe('editing', () => {
		it('opens an editor on F2, keeping what the cell held', () => {
			click(0, 0);
			press('F2');

			expect(editor()?.value).toBe('Tornillo');
		});

		it('types over the cell when a character arrives', () => {
			click(0, 0);
			press('x');

			expect(editor()?.value).toBe('x');
		});

		it('refuses to open on a cell that is not editable', () => {
			click(0, 2);
			press('F2');

			expect(editor()).toBeNull();
		});

		it('refuses to open anywhere on a read-only sheet', () => {
			host.readonly.set(true);
			fixture.detectChanges();
			click(0, 0);
			press('F2');

			expect(editor()).toBeNull();
		});

		it('reports the new value on Enter and moves down', () => {
			click(0, 0);
			press('F2');
			editor()!.value = 'Tirafondo';
			editor()!.dispatchEvent(new Event('input'));
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(host.commits).toHaveLength(1);
			expect(host.commits[0].value).toBe('Tirafondo');
			expect(host.commits[0].column.key).toBe('product');
			expect(cell(1, 0).getAttribute('tabindex')).toBe('0');
		});

		it('moves down on Enter without opening the cell it lands on', () => {
			click(0, 0);
			press('F2');
			editor()!.value = 'Tirafondo';
			editor()!.dispatchEvent(new Event('input'));
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			// The same keystroke reaches the grid a moment later; unstopped, it reads there as a
			// fresh Enter on the cell below and opens an editor nobody asked for.
			expect(editor()).toBeNull();
			expect(cell(1, 0).getAttribute('tabindex')).toBe('0');
		});

		it('keeps the characters typed before the field has the focus', async () => {
			click(0, 1);
			press('8');
			// Two more inside the same frame, as a quick typist sends them: the field is not there
			// yet, so they arrive at the grid.
			press('0');
			press('0');
			await fixture.whenStable();

			expect(editor()?.value).toBe('800');
		});

		it('says nothing when the value did not change', () => {
			click(0, 0);
			press('F2');
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(host.commits).toHaveLength(0);
		});

		it('reads a number in the reader own convention', () => {
			click(0, 1);
			press('F2');
			editor()!.value = '1.234,5';
			editor()!.dispatchEvent(new Event('input'));
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(host.commits[0].value).toBe(1234.5);
		});

		it('keeps the editor open and marked when the text is not a number', () => {
			click(0, 1);
			press('F2');
			editor()!.value = 'muchas';
			editor()!.dispatchEvent(new Event('input'));
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(editor()).not.toBeNull();
			expect(editor()?.getAttribute('aria-invalid')).toBe('true');
			expect(host.commits).toHaveLength(0);
		});

		it('throws away the edit on Escape', () => {
			click(0, 0);
			press('F2');
			editor()!.value = 'otra cosa';
			editor()!.dispatchEvent(new Event('input'));
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(editor()).toBeNull();
			expect(host.commits).toHaveLength(0);
		});

		it('leaves a composition alone, so the Enter that picks a character does not commit', () => {
			click(0, 0);
			press('F2');
			editor()!.value = 'に';
			editor()!.dispatchEvent(new Event('input'));
			editor()!.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })
			);
			fixture.detectChanges();

			expect(editor()).not.toBeNull();
			expect(host.commits).toHaveLength(0);
		});
	});

	describe('opening the editor with the pointer', () => {
		it('picks the cell and leaves its value alone', () => {
			fullClick(0, 0);

			expect(editor()).toBeNull();
			expect(cell(0, 0).getAttribute('tabindex')).toBe('0');
		});

		it('opens on the first character typed into the cell it just picked', () => {
			fullClick(0, 0);
			press('x');

			expect(editor()?.value).toBe('x');
		});

		it('opens on the second click when the sheet asks for it', () => {
			host.editOn.set('click');
			fixture.detectChanges();
			fullClick(0, 0);

			expect(editor()?.value).toBe('Tornillo');
		});

		it('waits for the release, so a press that becomes a drag selects instead', () => {
			click(0, 0);
			cell(1, 0).dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
			fixture.detectChanges();
			cell(1, 0).dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
			fixture.detectChanges();

			expect(editor()).toBeNull();
			expect(fixture.nativeElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(2);
		});

		it('extends the selection on a shifted click rather than editing', () => {
			fullClick(0, 0);
			press('Escape');
			fullClick(2, 0, { shiftKey: true });

			expect(editor()).toBeNull();
			expect(fixture.nativeElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(3);
		});

		it('leaves a cell that cannot be typed into alone', () => {
			fullClick(0, 2);

			expect(editor()).toBeNull();
		});

		it('opens on a double click, which is the convention it ships with', () => {
			fullClick(0, 0);

			expect(editor()).toBeNull();

			cell(0, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			fixture.detectChanges();

			expect(editor()).not.toBeNull();
		});
	});

	describe('column kinds and their editors', () => {
		const STATUSES = [
			{ value: 'new', label: 'New' },
			{ value: 'done', label: 'Done' },
			{ value: 'held', label: 'On hold', disabled: true }
		];

		function withStatus(): void {
			host.columns.update((columns) => [
				...columns,
				{
					key: 'status',
					header: 'Estado',
					kind: 'select' as const,
					options: STATUSES,
					cell: () => ({ value: 'done', editable: true })
				},
				{ key: 'done', header: 'Listo', kind: 'boolean' as const, cell: () => ({ value: 1, editable: true }) }
			]);
			fixture.detectChanges();
		}

		it('shows a chosen option by its label, not by what is stored', () => {
			withStatus();

			expect(cell(0, 3).textContent?.trim()).toBe('Done');
		});

		it('opens a list for a column with options, holding every one of them', () => {
			withStatus();
			openCell(0, 3);

			const list: HTMLSelectElement = fixture.nativeElement.querySelector('select.hub-spreadsheet__editor');

			expect(list).not.toBeNull();
			// Three options plus the empty one that clears the cell.
			expect(list.options).toHaveLength(4);
			expect(list.value).toBe('done');
		});

		it('keeps a retired option choosable on the row that already holds it', () => {
			host.columns.update((columns) => [
				...columns,
				{
					key: 'status',
					header: 'Estado',
					kind: 'select' as const,
					options: STATUSES,
					cell: () => ({ value: 'held', editable: true })
				}
			]);
			fixture.detectChanges();
			openCell(0, 3);

			const list: HTMLSelectElement = fixture.nativeElement.querySelector('select.hub-spreadsheet__editor');

			expect(Array.from(list.options).find((option) => option.value === 'held')?.disabled).toBe(false);
		});

		it('reports the value the list reported, and moves on', () => {
			withStatus();
			openCell(0, 3);

			const list: HTMLSelectElement = fixture.nativeElement.querySelector('select.hub-spreadsheet__editor');

			list.value = 'new';
			list.dispatchEvent(new Event('change'));
			fixture.detectChanges();

			expect(host.commits.at(-1)?.value).toBe('new');
			expect(cell(1, 3).getAttribute('tabindex')).toBe('0');
		});

		it('brings the list up with the editor, so opening the cell is the whole gesture', async () => {
			const showPicker = vi.fn();

			// jsdom has no `showPicker`, so it is lent to the prototype for the length of the test.
			Object.defineProperty(HTMLSelectElement.prototype, 'showPicker', {
				configurable: true,
				writable: true,
				value: showPicker
			});

			withStatus();
			openCell(0, 3);
			await fixture.whenStable();

			expect(showPicker).toHaveBeenCalledOnce();

			delete (HTMLSelectElement.prototype as unknown as Record<string, unknown>)['showPicker'];
		});

		it('leaves the list shut when the cell was opened by typing into it', async () => {
			const showPicker = vi.fn();

			Object.defineProperty(HTMLSelectElement.prototype, 'showPicker', {
				configurable: true,
				writable: true,
				value: showPicker
			});

			withStatus();
			click(0, 3);
			press('n');
			await fixture.whenStable();

			expect(showPicker).not.toHaveBeenCalled();

			delete (HTMLSelectElement.prototype as unknown as Record<string, unknown>)['showPicker'];
		});

		it("leaves a text cell alone, so opening one never raises the browser's own suggestions", async () => {
			const showPicker = vi.fn();

			Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
				configurable: true,
				writable: true,
				value: showPicker
			});

			openCell(0, 0);
			await fixture.whenStable();

			expect(showPicker).not.toHaveBeenCalled();

			delete (HTMLInputElement.prototype as unknown as Record<string, unknown>)['showPicker'];
		});

		it('takes the character that opened the cell to the answer it reaches', () => {
			// The cell holds 'done'; the list also offers 'New'.
			withStatus();
			click(0, 3);
			press('n');

			const list: HTMLSelectElement = fixture.nativeElement.querySelector('select.hub-spreadsheet__editor');

			// Typed at a closed list, a character picks the first answer that starts with it, which
			// is what a native list does. Otherwise the keystroke is simply lost.
			expect(list.value).toBe('new');
		});

		it('leaves the cell as it was when nothing on the list starts with it', () => {
			withStatus();
			click(0, 3);
			press('z');

			const list: HTMLSelectElement = fixture.nativeElement.querySelector('select.hub-spreadsheet__editor');

			expect(list.value).toBe('done');
		});

		it('skips an answer the reader is not allowed to choose', () => {
			host.columns.update((columns) => [
				...columns,
				{
					key: 'status',
					header: 'Estado',
					kind: 'select' as const,
					options: [
						{ value: 'held', label: 'Held', disabled: true },
						{ value: 'here', label: 'Here' }
					],
					cell: () => ({ value: 'here', editable: true })
				}
			]);
			fixture.detectChanges();
			click(0, 3);
			press('h');

			const list: HTMLSelectElement = fixture.nativeElement.querySelector('select.hub-spreadsheet__editor');

			expect(list.value).toBe('here');
		});

		it('never keeps a letter as a date, which would be committed on the way out', () => {
			host.columns.update((columns) => [
				...columns,
				{ key: 'due', header: 'Fecha', kind: 'date' as const, cell: () => ({ value: '2026-10-02', editable: true }) }
			]);
			fixture.detectChanges();
			click(0, 3);
			press('a');

			const field: HTMLInputElement = fixture.nativeElement.querySelector('input.hub-spreadsheet__editor');

			expect(field.type).toBe('date');
			expect(field.value).toBe('');

			field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			// Empty is empty; the letter reaches nothing that could store it.
			expect(host.commits.at(-1)?.value ?? null).toBe(null);
		});

		it('marks a cell that opens onto a list or a date, and leaves a plain one unmarked', () => {
			withStatus();
			host.columns.update((columns) => [
				...columns,
				{ key: 'due', header: 'Fecha', kind: 'date' as const, cell: () => ({ value: null, editable: true }) }
			]);
			fixture.detectChanges();

			const mark = (row: number, col: number) => cell(row, col).querySelector('.hub-spreadsheet__affordance');

			expect(mark(0, 3)).not.toBeNull();
			expect(mark(0, 3)?.classList.contains('hub-spreadsheet__affordance--date')).toBe(false);
			expect(mark(0, 5)?.classList.contains('hub-spreadsheet__affordance--date')).toBe(true);
			expect(mark(0, 0)).toBeNull();
		});

		/**
		 * Asserted against the stylesheet: jsdom has no pointer, so `:hover` never matches and a
		 * test built on computed style would pass for the wrong reason.
		 */
		it('shows that mark only on the cell in hand or under the pointer', () => {
			const css = Array.from(document.querySelectorAll('style'))
				.map((style) => style.textContent ?? '')
				.join('\n');
			const start = css.indexOf('.hub-spreadsheet__affordance[');
			const rule = css.slice(start, css.indexOf('}', start));

			expect(rule).toContain('opacity: 0');
			// The emitted selector carries the encapsulation attribute between the class and the
			// state, so the two are never written next to each other.
			expect(css).toMatch(/hub-spreadsheet__cell[^{]*:hover[^{]*hub-spreadsheet__affordance/);
			expect(css).toMatch(/hub-spreadsheet__cell--active[^{]*hub-spreadsheet__affordance/);
		});

		it('opens the cell from that mark on the first click, without waiting for a second', () => {
			withStatus();

			const mark: HTMLElement = cell(0, 3).querySelector('.hub-spreadsheet__affordance')!;

			mark.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, cancelable: true }));
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelector('select.hub-spreadsheet__editor')).not.toBeNull();
			expect(cell(0, 3).getAttribute('tabindex')).toBe('0');
		});

		it('opens the cell on Alt with the down arrow, the way a spreadsheet drops a list', () => {
			withStatus();
			click(0, 3);
			press('ArrowDown', { altKey: true });

			expect(fixture.nativeElement.querySelector('select.hub-spreadsheet__editor')).not.toBeNull();
			// And it did not travel while opening.
			expect(cell(0, 3).getAttribute('tabindex')).toBe('0');
		});

		it('refuses a pasted value that is not on the list', () => {
			withStatus();
			click(0, 3);

			const event = clipboardEvent('paste', { 'text/plain': 'archived' });

			fixture.nativeElement.querySelector('.hub-spreadsheet__sink').dispatchEvent(event);
			fixture.detectChanges();

			expect(host.pastes.at(-1)?.cells).toHaveLength(0);
			expect(host.pastes.at(-1)?.rejected).toBe(1);
		});

		it('accepts a pasted label, which is what a copy from a spreadsheet carries', () => {
			withStatus();
			click(0, 3);

			const event = clipboardEvent('paste', { 'text/plain': 'New' });

			fixture.nativeElement.querySelector('.hub-spreadsheet__sink').dispatchEvent(event);
			fixture.detectChanges();

			expect(host.pastes.at(-1)?.cells[0].value).toBe('new');
		});

		/**
		 * A yes/no cell used to open a text field showing the stored 0 or 1 — asking the reader to
		 * edit a number that is not what the column means.
		 */
		it('never opens a text editor over a yes/no cell: it turns it over', () => {
			withStatus();
			openCell(0, 4);

			expect(editor()).toBeNull();
			expect(host.commits.at(-1)?.value).toBe(0);
		});

		it('turns it over from the keyboard too, rather than opening a field', () => {
			withStatus();
			click(0, 4);
			press('F2');

			expect(editor()).toBeNull();
			expect(host.commits.at(-1)?.value).toBe(0);
		});

		it('shows a column hint in an empty cell, and never over a value', () => {
			host.columns.update((columns) => [
				...columns,
				{
					key: 'note',
					header: 'Nota',
					placeholder: 'yyyy-mm-dd',
					cell: (row: Line) => ({ value: row.id === 'a' ? null : 'written', editable: true })
				}
			]);
			fixture.detectChanges();

			expect(cell(0, 3).querySelector('.hub-spreadsheet__placeholder')).not.toBeNull();
			expect(cell(1, 3).querySelector('.hub-spreadsheet__placeholder')).toBeNull();
		});

		it('draws a boolean column as a checkbox and turns it over in one gesture', () => {
			withStatus();

			const check: HTMLInputElement = cell(0, 4).querySelector('input[type="checkbox"]')!;

			expect(check).not.toBeNull();
			expect(check.checked).toBe(true);

			check.dispatchEvent(new Event('change'));
			fixture.detectChanges();

			expect(host.commits.at(-1)?.value).toBe(0);
		});
	});

	describe('formulas', () => {
		function withFormulas(): void {
			host.formulas.set(true);
			host.columns.update((columns) => [
				...columns,
				{
					key: 'calc',
					header: 'Cálculo',
					kind: 'number' as const,
					cell: (row: Line) => ({ value: (row as never)['calc'] ?? null, editable: true })
				}
			]);
			host.rows.update((rows) =>
				rows.map((row, index) => ({
					...row,
					// The last one reads itself, which is the case a sheet has to refuse rather
					// than chase.
					calc: index === 0 ? '=[units] * 2' : index === 1 ? '=SUM([units:])' : '=[calc]'
				}))
			);
			fixture.detectChanges();
		}

		it('shows the answer, and keeps the formula for the editor', () => {
			withFormulas();

			// A hundred units, twice.
			expect(cell(0, 3).textContent?.trim()).toBe('200');

			click(0, 3);
			press('F2');

			expect(editor()?.value).toBe('=[units] * 2');
		});

		it('adds a whole column up', () => {
			withFormulas();

			expect(cell(1, 3).textContent?.trim()).toBe('350');
		});

		it('marks a cell whose formula eats itself, rather than hanging', () => {
			withFormulas();

			expect(cell(2, 3).textContent?.trim()).toBe('#CYCLE!');
			expect(cell(2, 3).className).toContain('hub-spreadsheet__cell--invalid');
		});

		it('works a column out from a formula the column itself carries', () => {
			host.formulas.set(true);
			host.columns.update((columns) => [
				...columns,
				{
					key: 'line',
					header: 'Línea',
					kind: 'number' as const,
					formula: '=[units] * 3',
					// The row holds nothing: the column is what says what the cell is.
					cell: () => ({ value: null, editable: true })
				}
			]);
			fixture.detectChanges();

			expect(cell(0, 3).textContent?.trim()).toBe('300');
			expect(cell(1, 3).textContent?.trim()).toBe('600');
		});

		it('refuses to open a cell whose formula belongs to the column', () => {
			host.formulas.set(true);
			host.columns.update((columns) => [
				...columns,
				{ key: 'line', header: 'Línea', formula: '=[units] * 3', cell: () => ({ value: null, editable: true }) }
			]);
			fixture.detectChanges();
			click(0, 3);
			press('F2');

			// Typing over it would lose the formula for that row alone, which nobody notices until
			// the totals stop adding up.
			expect(editor()).toBeNull();
			expect(cell(0, 3).getAttribute('aria-readonly')).toBe('true');
		});

		it('takes a formula typed into a column of figures, which is where they are written', () => {
			withFormulas();
			click(0, 1);
			press('=');
			editor()!.value = '=2*4';
			editor()!.dispatchEvent(new Event('input'));
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			// Read as a figure it is not one, and the cell used to refuse it and stay open.
			expect(host.commits.at(-1)?.value).toBe('=2*4');
			expect(editor()).toBeNull();
		});

		it('offers what can go in a formula the moment an equals sign is typed', () => {
			host.formulas.set(true);
			fixture.detectChanges();
			click(0, 0);
			press('=');

			const offered = Array.from(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__suggestion-name')).map(
				(node) => (node as HTMLElement).textContent!.trim()
			);

			// Functions first outside brackets, and the columns are there too — their aliases are
			// nowhere else on screen, which is the whole reason for the list.
			expect(offered).toContain('SUM');
			expect(offered).toContain('units');
		});

		it('shows every column its alias while a formula is being written, and not otherwise', () => {
			host.formulas.set(true);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__alias')).toHaveLength(0);

			click(0, 0);
			press('=');

			const chips = Array.from(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__alias')).map((node) =>
				(node as HTMLElement).textContent!.trim()
			);

			// The letter and the alias, because both can be typed and a reader coming from a
			// spreadsheet looks for the letter. The bar between them is drawn by the stylesheet,
			// which is why it is not in the text.
			expect(chips).toEqual(['A product', 'B units', 'C total']);
		});

		it('takes the first suggestion as chosen the moment there is a word being typed', () => {
			host.formulas.set(true);
			fixture.detectChanges();
			click(0, 0);
			press('=');

			// A bare equals sign is a list to look at, so Enter still means commit.
			expect(fixture.nativeElement.querySelector('.hub-spreadsheet__suggestion--on')).toBeNull();

			press('S');

			expect(
				fixture.nativeElement
					.querySelector('.hub-spreadsheet__suggestion--on .hub-spreadsheet__suggestion-name')
					?.textContent?.trim()
			).toBe('SUM');

			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(editor()?.value).toBe('=SUM(');
		});

		it('puts a suggestion in when the reader has moved onto it, and commits when they have not', () => {
			host.formulas.set(true);
			fixture.detectChanges();
			click(0, 0);
			press('=');

			const field = editor()!;

			// Enter with nobody chosen is a commit, which is what somebody who typed a whole
			// formula means by it.
			field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(editor()).toBeNull();

			click(0, 0);
			press('=');
			press('S');
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
			fixture.detectChanges();
			editor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			fixture.detectChanges();

			expect(editor()?.value).toBe('=SUM(');
		});

		it('leaves the text alone when the sheet was not asked to read formulas', () => {
			host.columns.update((columns) => [
				...columns,
				{ key: 'calc', header: 'Cálculo', cell: (row: Line) => ({ value: (row as never)['calc'] ?? null }) }
			]);
			host.rows.update((rows) => rows.map((row) => ({ ...row, calc: '=[units] * 2' })));
			fixture.detectChanges();

			// A column of text may hold an equals sign as the thing somebody wrote.
			expect(cell(0, 3).textContent?.trim()).toBe('=[units] * 2');
		});
	});

	describe('a column that draws its own cells', () => {
		it('draws the template instead of the value, and still copies the value', async () => {
			@Component({
				standalone: true,
				imports: [HubSpreadsheetComponent, HubSpreadsheetCellDirective],
				template: `
					<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
						<ng-template hubSpreadsheetCell="product" let-value let-active="active">
							<span class="badge" [class.badge--active]="active">{{ value }} ✱</span>
						</ng-template>
					</hub-spreadsheet>
				`
			})
			class DrawnHost {
				readonly rows = signal<Line[]>(lines());
				readonly rowKey = (row: Line) => row.id;
				readonly columns: HubSpreadsheetColumn<Line>[] = [
					{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product, editable: true }) },
					{ key: 'units', header: 'Unidades', kind: 'number' as const, cell: (row) => ({ value: row.units }) }
				];
			}

			await TestBed.resetTestingModule()
				.configureTestingModule({ imports: [DrawnHost], providers: [provideHubTranslation()] })
				.compileComponents();

			const drawn = TestBed.createComponent(DrawnHost);

			drawn.detectChanges();

			const badge: HTMLElement = drawn.nativeElement.querySelector('[data-cell="0-0"] .badge');

			expect(badge.textContent?.trim()).toBe('Tornillo ✱');
			// The plain value is not drawn twice, and the column beside it is untouched.
			expect(drawn.nativeElement.querySelector('[data-cell="0-0"] .hub-spreadsheet__value')).toBeNull();
			expect(drawn.nativeElement.querySelector('[data-cell="0-1"] .hub-spreadsheet__value')).not.toBeNull();
		});

		it('tells the template whether it is the cell the reader is on', async () => {
			@Component({
				standalone: true,
				imports: [HubSpreadsheetComponent, HubSpreadsheetCellDirective],
				template: `
					<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
						<ng-template hubSpreadsheetCell="product" let-active="active">
							<span class="mark" [attr.data-active]="active"></span>
						</ng-template>
					</hub-spreadsheet>
				`
			})
			class ActiveHost {
				readonly rows = signal<Line[]>(lines());
				readonly rowKey = (row: Line) => row.id;
				readonly columns: HubSpreadsheetColumn<Line>[] = [
					{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product, editable: true }) }
				];
			}

			await TestBed.resetTestingModule()
				.configureTestingModule({ imports: [ActiveHost], providers: [provideHubTranslation()] })
				.compileComponents();

			const drawn = TestBed.createComponent(ActiveHost);

			drawn.detectChanges();

			const target: HTMLElement = drawn.nativeElement.querySelector('[data-cell="1-0"]');

			target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			drawn.detectChanges();

			expect(drawn.nativeElement.querySelector('[data-cell="1-0"] .mark').getAttribute('data-active')).toBe('true');
			expect(drawn.nativeElement.querySelector('[data-cell="0-0"] .mark').getAttribute('data-active')).toBe('false');
		});
	});

	describe('a control adapter the project wired', () => {
		/** A stand-in for whatever a project registers, so the sheet is tested and not the library. */
		function recordingAdapter() {
			const calls: HubSpreadsheetControlConfig[] = [];

			return {
				calls,
				adapter: {
					create(container: ViewContainerRef, config: HubSpreadsheetControlConfig) {
						calls.push(config);

						const element = document.createElement('button');

						element.className = 'wired';
						element.addEventListener('click', () => config.onValueChange('new'));
						container.element.nativeElement.parentElement?.appendChild(element);

						return { setValue: () => undefined, destroy: () => element.remove() };
					}
				}
			};
		}

		async function sheetWith(adapter: HubSpreadsheetControlsAdapter | null) {
			await TestBed.resetTestingModule()
				.configureTestingModule({
					imports: [HostComponent],
					providers: [provideHubTranslation(), ...(adapter ? [provideHubSpreadsheetControls(adapter)] : [])]
				})
				.compileComponents();

			const wired = TestBed.createComponent(HostComponent);

			wired.componentInstance.columns.update((columns) => [
				...columns,
				{
					key: 'status',
					header: 'Estado',
					kind: 'select' as const,
					options: [
						{ value: 'new', label: 'New' },
						{ value: 'done', label: 'Done' }
					],
					cell: () => ({ value: 'done', editable: true })
				}
			]);
			wired.detectChanges();

			return wired;
		}

		function openStatus(wired: ComponentFixture<HostComponent>): void {
			const target: HTMLElement = wired.nativeElement.querySelector('[data-cell="0-3"]');

			target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			wired.detectChanges();
			target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
			wired.detectChanges();
			target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			wired.detectChanges();
		}

		it('opens a list column through the adapter, and asks it for what a cell needs', async () => {
			const { calls, adapter } = recordingAdapter();
			const wired = await sheetWith(adapter);

			openStatus(wired);
			await wired.whenStable();

			expect(wired.nativeElement.querySelector('select.hub-spreadsheet__editor')).toBeNull();
			expect(calls).toHaveLength(1);
			expect(calls[0].value).toBe('done');
			expect(calls[0].options?.map((option) => option.label)).toEqual(['New', 'Done']);
			expect(calls[0].label).toBe('Estado');
			// A cell is the case a search box is wired for, it empties with Delete, and the gesture
			// that opened it has been spent.
			expect(calls[0].searchable).toBe(true);
			expect(calls[0].clearable).toBe(false);
			expect(calls[0].autoOpen).toBe(true);
		});

		it('commits what the hosted control reported, as the native list does', async () => {
			const { adapter } = recordingAdapter();
			const wired = await sheetWith(adapter);

			openStatus(wired);
			await wired.whenStable();

			wired.nativeElement.querySelector('button.wired').click();
			wired.detectChanges();

			expect(wired.componentInstance.commits.at(-1)?.value).toBe('new');
		});

		it('hands the character that opened the cell to the control', async () => {
			const { calls, adapter } = recordingAdapter();
			const wired = await sheetWith(adapter);

			const target: HTMLElement = wired.nativeElement.querySelector('[data-cell="0-3"]');

			target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			wired.detectChanges();
			wired.nativeElement
				.querySelector('.hub-spreadsheet__table')
				.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true }));
			wired.detectChanges();
			await wired.whenStable();

			expect(calls[0].searchTerm).toBe('n');
		});

		it('draws its own list when no adapter is registered, so the library stands alone', async () => {
			const wired = await sheetWith(null);

			openStatus(wired);
			await wired.whenStable();

			expect(wired.nativeElement.querySelector('select.hub-spreadsheet__editor')).not.toBeNull();
		});
	});

	describe('an editor supplied by the host', () => {
		it('replaces the built-in one for its column, and reports through commit', async () => {
			@Component({
				standalone: true,
				imports: [HubSpreadsheetComponent, HubSpreadsheetEditorDirective],
				template: `
					<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey" (commit)="commits.push($event)">
						<ng-template hubSpreadsheetEditor="product" let-value let-commit="commit">
							<button class="mine" type="button" (click)="commit(value + ' (chosen)')">pick</button>
						</ng-template>
					</hub-spreadsheet>
				`
			})
			class CustomHost {
				readonly rows = signal<Line[]>(lines());
				readonly rowKey = (row: Line) => row.id;
				readonly columns: HubSpreadsheetColumn<Line>[] = [
					{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product, editable: true }) }
				];
				commits: HubSpreadsheetCommit<Line>[] = [];
			}

			await TestBed.resetTestingModule()
				.configureTestingModule({ imports: [CustomHost], providers: [provideHubTranslation()] })
				.compileComponents();

			const custom = TestBed.createComponent(CustomHost);

			custom.detectChanges();

			const target: HTMLElement = custom.nativeElement.querySelector('[data-cell="0-0"]');

			target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			custom.detectChanges();
			target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
			custom.detectChanges();
			target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			custom.detectChanges();

			const mine: HTMLButtonElement = custom.nativeElement.querySelector('button.mine');

			expect(mine).not.toBeNull();
			expect(custom.nativeElement.querySelector('input.hub-spreadsheet__editor')).toBeNull();

			mine.click();
			custom.detectChanges();

			expect(custom.componentInstance.commits.at(-1)?.value).toBe('Tornillo (chosen)');
		});

		it('puts the keyboard inside it, so the reader is not left typing into the grid', async () => {
			@Component({
				standalone: true,
				imports: [HubSpreadsheetComponent, HubSpreadsheetEditorDirective],
				template: `
					<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
						<ng-template hubSpreadsheetEditor="product">
							<input class="mine" />
						</ng-template>
					</hub-spreadsheet>
				`
			})
			class FocusHost {
				readonly rows = signal<Line[]>(lines());
				readonly rowKey = (row: Line) => row.id;
				readonly columns: HubSpreadsheetColumn<Line>[] = [
					{ key: 'product', header: 'Producto', cell: (row) => ({ value: row.product, editable: true }) }
				];
			}

			await TestBed.resetTestingModule()
				.configureTestingModule({ imports: [FocusHost], providers: [provideHubTranslation()] })
				.compileComponents();

			const custom = TestBed.createComponent(FocusHost);

			// Attached to the document, or nothing can hold focus.
			document.body.appendChild(custom.nativeElement);
			custom.detectChanges();

			const target: HTMLElement = custom.nativeElement.querySelector('[data-cell="0-0"]');

			target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			custom.detectChanges();
			target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
			custom.detectChanges();
			target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			custom.detectChanges();
			await custom.whenStable();

			expect(document.activeElement?.classList.contains('mine')).toBe(true);

			custom.nativeElement.remove();
		});
	});

	describe('clearing', () => {
		it('reports the editable cells of the selection, skipping the calculated one', () => {
			click(0, 0);
			press('ArrowRight', { shiftKey: true });
			press('ArrowRight', { shiftKey: true });
			press('Delete');

			expect(host.cleared).toHaveLength(1);
			expect((host.cleared[0] as unknown[]).length).toBe(2);
		});

		it('clears nothing on a read-only sheet', () => {
			host.readonly.set(true);
			fixture.detectChanges();
			click(0, 0);
			press('Delete');

			expect(host.cleared).toHaveLength(0);
		});
	});

	describe('the clipboard', () => {
		it('writes the selection as both flavours', () => {
			click(0, 0);
			press('ArrowDown', { shiftKey: true });

			const event = clipboardEvent('copy', {});

			fixture.nativeElement.querySelector('.hub-spreadsheet__table').dispatchEvent(event);

			expect(written(event)).toHaveBeenCalledWith('text/plain', 'Tornillo\nArandela');
			expect(written(event)).toHaveBeenCalledWith('text/html', expect.stringContaining('<td>Tornillo</td>'));
		});

		it('takes a pasted block in, reading numbers in the reader convention', () => {
			click(0, 0);

			const event = clipboardEvent('paste', { 'text/plain': 'Varilla\t1.500\nAbrazadera\t2.750' });

			fixture.nativeElement.querySelector('.hub-spreadsheet__sink').dispatchEvent(event);
			fixture.detectChanges();

			expect(host.pastes).toHaveLength(1);
			expect(host.pastes[0].cells.map((c) => c.value)).toEqual(['Varilla', 1500, 'Abrazadera', 2750]);
		});

		it('prefers the raw number the HTML carries over the formatted text', () => {
			click(0, 1);

			const event = clipboardEvent('paste', {
				'text/plain': '1.234,56',
				'text/html': '<table><tr><td x:num="1234.56">1.234,56</td></tr></table>'
			});

			fixture.nativeElement.querySelector('.hub-spreadsheet__sink').dispatchEvent(event);
			fixture.detectChanges();

			expect(host.pastes[0].cells[0].value).toBe(1234.56);
		});

		it('counts what fell on a calculated column instead of writing it', () => {
			click(0, 1);

			const event = clipboardEvent('paste', { 'text/plain': '10\t20' });

			fixture.nativeElement.querySelector('.hub-spreadsheet__sink').dispatchEvent(event);
			fixture.detectChanges();

			expect(host.pastes[0].cells).toHaveLength(1);
			expect(host.pastes[0].skipped).toBe(1);
		});

		it('counts what was not a number rather than writing rubbish', () => {
			click(0, 1);

			const event = clipboardEvent('paste', { 'text/plain': 'bastantes' });

			fixture.nativeElement.querySelector('.hub-spreadsheet__sink').dispatchEvent(event);
			fixture.detectChanges();

			expect(host.pastes[0].cells).toHaveLength(0);
			expect(host.pastes[0].rejected).toBe(1);
		});
	});

	describe('frozen panes', () => {
		/**
		 * jsdom lays nothing out, so every measurement comes back as zero and the offsets are all
		 * zero with it. What can be checked here is which cells were taken out of the flow and
		 * where the seam was drawn; the pixel arithmetic has its own unit tests.
		 */
		it('freezes nothing by default', () => {
			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__cell--frozen-col')).toHaveLength(0);
			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__cell--frozen-row')).toHaveLength(0);
		});

		it('pins the first columns when asked, one class per cell of them', () => {
			host.frozenColumns.set(2);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__cell--frozen-col')).toHaveLength(6);
			expect(cell(0, 0).classList.contains('hub-spreadsheet__cell--frozen-col')).toBe(true);
			expect(cell(0, 2).classList.contains('hub-spreadsheet__cell--frozen-col')).toBe(false);
		});

		it('draws the seam on the last frozen column only', () => {
			host.frozenColumns.set(2);
			fixture.detectChanges();

			expect(cell(0, 0).classList.contains('hub-spreadsheet__cell--frozen-col-edge')).toBe(false);
			expect(cell(0, 1).classList.contains('hub-spreadsheet__cell--frozen-col-edge')).toBe(true);
		});

		it('pins the first rows when asked', () => {
			host.frozenRows.set(1);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__cell--frozen-row')).toHaveLength(3);
			expect(cell(1, 0).classList.contains('hub-spreadsheet__cell--frozen-row')).toBe(false);
		});

		it('never freezes more tracks than the sheet has', () => {
			host.frozenColumns.set(99);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__cell--frozen-col')).toHaveLength(9);
			expect(cell(0, 2).classList.contains('hub-spreadsheet__cell--frozen-col-edge')).toBe(true);
		});

		it('lets go of the frozen tracks when the count goes back to zero', () => {
			host.frozenColumns.set(2);
			fixture.detectChanges();
			host.frozenColumns.set(0);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__cell--frozen-col')).toHaveLength(0);
		});
	});

	describe('undo and redo', () => {
		it('stays quiet while the owner says there is nothing to undo', () => {
			click(0, 0);
			press('z', { ctrlKey: true });

			expect(host.undos).toBe(0);
		});

		it('asks to undo, without doing anything itself', () => {
			host.canUndo.set(true);
			fixture.detectChanges();
			click(0, 0);
			press('z', { ctrlKey: true });

			expect(host.undos).toBe(1);
			expect(host.rows().length).toBe(3);
		});

		it('asks to redo on the shifted shortcut and on the other one', () => {
			host.canRedo.set(true);
			fixture.detectChanges();
			click(0, 0);
			press('z', { ctrlKey: true, shiftKey: true });
			press('y', { ctrlKey: true });

			expect(host.redos).toBe(2);
		});
	});

	describe('the fill handle', () => {
		function grip(): HTMLElement | null {
			return fixture.nativeElement.querySelector('.hub-spreadsheet__fill-handle');
		}

		function drag(toRow: number, toCol: number): void {
			grip()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			fixture.detectChanges();
			cell(toRow, toCol).dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
			fixture.detectChanges();
			document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			fixture.detectChanges();
		}

		beforeEach(() => {
			host.fillHandle.set(true);
			fixture.detectChanges();
		});

		it('is not offered until it is asked for', () => {
			host.fillHandle.set(false);
			fixture.detectChanges();
			click(0, 0);

			expect(grip()).toBeNull();
		});

		it('sits at the far corner of the selection and nowhere else', () => {
			click(0, 0);
			press('ArrowDown', { shiftKey: true });

			expect(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__fill-handle')).toHaveLength(1);
			expect(cell(1, 0).querySelector('.hub-spreadsheet__fill-handle')).not.toBeNull();
		});

		it('is not offered on a read-only sheet', () => {
			host.readonly.set(true);
			fixture.detectChanges();
			click(0, 0);

			expect(grip()).toBeNull();
		});

		it('continues a run downwards and reports it as one gesture', () => {
			click(0, 1);
			press('ArrowDown', { shiftKey: true });
			drag(2, 1);

			expect(host.fills).toHaveLength(1);
			// 100 then 200 continues as 300.
			expect(host.fills[0].cells.map((c) => c.value)).toEqual([300]);
		});

		it('repeats a single value rather than inventing a pattern for text', () => {
			click(0, 0);
			drag(2, 0);

			expect(host.fills[0].cells.map((c) => c.value)).toEqual(['Tornillo', 'Tornillo']);
		});

		it('counts what fell on a column that cannot be written', () => {
			click(0, 1);
			drag(0, 2);

			expect(host.fills[0].cells).toHaveLength(0);
			expect(host.fills[0].skipped).toBe(1);
		});

		it('leaves the selection covering what it wrote', () => {
			click(0, 0);
			drag(2, 0);

			expect(fixture.nativeElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(3);
		});
	});

	describe('dragging columns', () => {
		function header(index: number): HTMLElement {
			return fixture.nativeElement.querySelector(`[data-header="${index}"]`);
		}

		function grips(): NodeListOf<HTMLElement> {
			return fixture.nativeElement.querySelectorAll('.hub-spreadsheet__resize-grip');
		}

		it('offers no grip until resizing is asked for', () => {
			expect(grips()).toHaveLength(0);

			host.resizableColumns.set(true);
			fixture.detectChanges();

			expect(grips()).toHaveLength(3);
		});

		it('writes the dragged width back, keyed by the column alias', () => {
			host.resizableColumns.set(true);
			fixture.detectChanges();

			grips()[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100 }));
			document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 160 }));
			document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			fixture.detectChanges();

			// jsdom lays nothing out, so every element measures zero wide. Zero is not a width, it
			// is "not laid out yet", and the helper refuses it. What this pins down is that a
			// refusal leaves the map untouched rather than writing a width out of thin air.
			expect(host.columnWidths()['units']).toBeUndefined();
		});

		it('sizes a column from the map when the owner supplies one', () => {
			host.columnWidths.set({ units: 220 });
			fixture.detectChanges();

			expect(header(1).style.width).toBe('220px');
			expect(header(0).style.width).toBe('');
		});

		it('says nothing when a column is dropped where it already was', () => {
			host.reorderableColumns.set(true);
			fixture.detectChanges();

			header(1).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			fixture.detectChanges();

			expect(host.moves).toHaveLength(0);
		});

		it('reports the drop with the reordered aliases, and changes nothing itself', () => {
			host.reorderableColumns.set(true);
			fixture.detectChanges();

			header(0).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			header(2).dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
			document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			fixture.detectChanges();

			expect(host.moves).toHaveLength(1);
			expect(host.moves[0]).toMatchObject({ from: 0, to: 2, key: 'product' });
			expect(host.moves[0].keys).toEqual(['units', 'total', 'product']);
			// The sheet never reorders on its own: the columns it renders are unchanged.
			expect(header(0).textContent).toContain('Producto');
		});

		it('does not start a move when reordering was not asked for', () => {
			header(0).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
			header(2).dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
			document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			fixture.detectChanges();

			expect(host.moves).toHaveLength(0);
		});
	});

	describe('the structural menu', () => {
		function menu(): HTMLElement | null {
			return fixture.nativeElement.querySelector('.hub-spreadsheet__menu');
		}

		function items(): string[] {
			return Array.from(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__menu-item')).map((item) =>
				(item as HTMLElement).textContent!.trim()
			);
		}

		function rightClick(row: number, col: number): void {
			cell(row, col).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			fixture.detectChanges();
		}

		it('stays shut until it is asked for', () => {
			click(0, 0);
			rightClick(0, 0);

			expect(menu()).toBeNull();
		});

		it('never opens empty: with nothing permitted there is no menu', () => {
			host.contextMenu.set(true);
			fixture.detectChanges();
			click(0, 0);
			rightClick(0, 0);

			expect(menu()).toBeNull();
		});

		it('offers only what the permissions allow', () => {
			host.contextMenu.set(true);
			host.structure.set({ insertRows: true });
			fixture.detectChanges();
			click(0, 0);
			rightClick(0, 0);

			expect(items()).toEqual(['Insert row above', 'Insert row below']);
		});

		it('withholds a deletion the guard refuses for any row of the selection', () => {
			host.contextMenu.set(true);
			host.structure.set({ deleteRows: (_row, index) => index > 0 });
			fixture.detectChanges();
			click(0, 0);
			press('ArrowDown', { shiftKey: true });
			rightClick(1, 0);

			// Row 0 is in the selection and may not go, so the whole entry is withheld.
			expect(items().join(' ')).not.toContain('Delete');
		});

		it('moves the cursor to a cell right-clicked outside the selection', () => {
			host.contextMenu.set(true);
			host.structure.set({ insertRows: true });
			fixture.detectChanges();
			click(0, 0);
			rightClick(2, 1);

			expect(cell(2, 1).getAttribute('tabindex')).toBe('0');
		});

		it('leaves a selection alone when the right-click lands inside it', () => {
			host.contextMenu.set(true);
			host.structure.set({ insertRows: true });
			fixture.detectChanges();
			click(0, 0);
			press('ArrowDown', { shiftKey: true });
			rightClick(1, 0);

			expect(fixture.nativeElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(2);
		});

		it('asks the owner and changes nothing itself', () => {
			host.contextMenu.set(true);
			host.structure.set({ insertRows: true });
			fixture.detectChanges();
			click(1, 0);
			rightClick(1, 0);
			(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__menu-item')[1] as HTMLElement).click();
			fixture.detectChanges();

			expect(host.inserts).toHaveLength(1);
			expect(host.inserts[0]).toMatchObject({ axis: 'row', at: 2, count: 1 });
			expect(host.rows().length).toBe(3);
			expect(menu()).toBeNull();
		});

		it('shuts on Escape', () => {
			host.contextMenu.set(true);
			host.structure.set({ insertRows: true });
			fixture.detectChanges();
			click(0, 0);
			rightClick(0, 0);
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			fixture.detectChanges();

			expect(menu()).toBeNull();
		});
	});

	describe('validation from the host', () => {
		it('marks a cell the host says is wrong, and says so to assistive technology', () => {
			host.errors.set({ 'a\tunits': 'Must be at least 1' });
			fixture.detectChanges();

			expect(cell(0, 1).classList.contains('hub-spreadsheet__cell--invalid')).toBe(true);
			expect(cell(0, 1).getAttribute('aria-invalid')).toBe('true');
		});

		it('shows the message on the cell rather than hiding it in a console', () => {
			host.errors.set({ 'a\tunits': 'Must be at least 1' });
			fixture.detectChanges();

			expect(cell(0, 1).getAttribute('title')).toBe('Must be at least 1');
		});

		it('draws the outline inside the cell, so a neighbour never shifts', () => {
			host.errors.set({ 'a\tunits': 'Must be at least 1' });
			fixture.detectChanges();

			const style = getComputedStyle(cell(0, 1));

			// jsdom resolves no custom properties, so what can be asserted here is that the rule
			// paints with an inset shadow rather than with a border. The value itself is a token.
			expect(style.boxShadow).toContain('inset');
			expect(style.borderStyle === 'solid' && style.borderWidth === '2px').toBe(false);
		});

		it('leaves every other cell alone', () => {
			host.errors.set({ 'a\tunits': 'Must be at least 1' });
			fixture.detectChanges();

			expect(cell(1, 1).classList.contains('hub-spreadsheet__cell--invalid')).toBe(false);
			expect(cell(1, 1).getAttribute('aria-invalid')).toBeNull();
		});

		it('clears the mark when the host withdraws the error', () => {
			host.errors.set({ 'a\tunits': 'Must be at least 1' });
			fixture.detectChanges();
			host.errors.set({});
			fixture.detectChanges();

			expect(cell(0, 1).classList.contains('hub-spreadsheet__cell--invalid')).toBe(false);
		});

		it('follows the row rather than the position, so a reorder keeps the error on its cell', () => {
			host.errors.set({ 'c\tunits': 'Must be at least 1' });
			fixture.detectChanges();
			host.rows.set([lines()[2], lines()[0], lines()[1]]);
			fixture.detectChanges();

			expect(cell(0, 1).classList.contains('hub-spreadsheet__cell--invalid')).toBe(true);
			expect(cell(2, 1).classList.contains('hub-spreadsheet__cell--invalid')).toBe(false);
		});
	});

	describe('merged blocks', () => {
		/** Row 0 merged across the first two columns. */
		function mergeTopLeft(): void {
			host.spans.set([{ row: 0, col: 0, rowSpan: 1, colSpan: 2 }]);
			fixture.detectChanges();
		}

		it('draws the anchor once and not the cell it swallows', () => {
			mergeTopLeft();

			expect(cell(0, 0)).not.toBeNull();
			expect(cell(0, 1)).toBeNull();
			expect(fixture.nativeElement.querySelectorAll('[role="gridcell"]')).toHaveLength(8);
		});

		it('tells assistive technology how far the block reaches', () => {
			mergeTopLeft();

			expect(cell(0, 0).getAttribute('colspan')).toBe('2');
			expect(cell(0, 0).getAttribute('aria-colspan')).toBe('2');
			expect(cell(0, 0).getAttribute('rowspan')).toBeNull();
		});

		it('lands the cursor on the block rather than inside it', () => {
			mergeTopLeft();
			click(1, 1);
			press('ArrowUp');

			// (0,1) is swallowed, so the cursor resolves to the anchor at (0,0).
			expect(cell(0, 0).getAttribute('tabindex')).toBe('0');
		});

		it('grows a selection that would cut the block in half', () => {
			mergeTopLeft();
			click(0, 0);

			// Selecting only the anchor still selects everything the block covers.
			expect(cell(0, 0).getAttribute('aria-selected')).toBe('true');
			expect(cell(0, 2).getAttribute('aria-selected')).toBe('false');
		});

		it('copies a block once, not once per cell it covers', () => {
			mergeTopLeft();
			click(0, 0);

			const event = clipboardEvent('copy', {});

			fixture.nativeElement.querySelector('.hub-spreadsheet__table').dispatchEvent(event);

			expect(written(event)).toHaveBeenCalledWith('text/plain', expect.stringContaining('Tornillo'));
		});

		it('ignores a merge that describes no rectangle', () => {
			host.spans.set([{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }]);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('[role="gridcell"]')).toHaveLength(9);
			expect(cell(0, 0).getAttribute('colspan')).toBeNull();
		});

		/**
		 * The trailing border used to be dropped with `:last-child`, which is a guess about
		 * position. In a row whose rightmost block is covered, the last cell drawn is the one
		 * before it, and that one lost a border it shares with a neighbour — a line missing from
		 * the middle of the sheet.
		 */
		it('drops the trailing border only on a cell that reaches the edge of the sheet', () => {
			// Row 1 column 2 spans two rows, so in row 1 the last cell drawn is column 2 of 3.
			host.spans.set([{ row: 1, col: 2, rowSpan: 2, colSpan: 1 }]);
			fixture.detectChanges();

			expect(cell(1, 1).classList.contains('hub-spreadsheet__cell--end-of-sheet')).toBe(false);
			expect(cell(1, 2).classList.contains('hub-spreadsheet__cell--end-of-sheet')).toBe(true);
		});

		it('counts the columns a block spans when deciding whether it reaches the edge', () => {
			host.spans.set([{ row: 0, col: 1, rowSpan: 1, colSpan: 2 }]);
			fixture.detectChanges();

			// Anchored at column 1 but two wide, so it ends at the last column.
			expect(cell(0, 1).classList.contains('hub-spreadsheet__cell--end-of-sheet')).toBe(true);
			expect(cell(1, 1).classList.contains('hub-spreadsheet__cell--end-of-sheet')).toBe(false);
		});

		it('puts every cell back when the merges are taken away', () => {
			mergeTopLeft();
			host.spans.set([]);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('[role="gridcell"]')).toHaveLength(9);
			expect(cell(0, 1)).not.toBeNull();
		});
	});

	describe('drawing only what the reader can see', () => {
		/** A sheet long enough that drawing it whole is the thing being avoided. */
		function longSheet(count: number): void {
			host.rows.set(
				Array.from({ length: count }, (_, index) => ({
					id: `r${index}`,
					product: `Item ${index}`,
					units: index,
					price: 1
				}))
			);
			// Declared rather than measured: jsdom lays nothing out, so every row measures nought
			// and a window worked out from nought is the whole sheet.
			host.rowHeight.set(20);
			host.virtual.set(true);
			fixture.detectChanges();
		}

		function drawnRows(): number[] {
			return Array.from(fixture.nativeElement.querySelectorAll('[data-cell$="-0"]')).map((cell) =>
				Number((cell as HTMLElement).getAttribute('data-cell')!.split('-')[0])
			);
		}

		it('draws a screenful instead of the whole sheet', () => {
			longSheet(1000);

			expect(drawnRows().length).toBeLessThan(60);
			expect(drawnRows()[0]).toBe(0);
		});

		it('holds the height of what it did not draw, so the scrollbar still tells the truth', () => {
			longSheet(1000);

			const spacer: HTMLElement = fixture.nativeElement.querySelector('.hub-spreadsheet__spacer td');

			// A thousand rows of twenty, less the ones drawn.
			expect(spacer.style.blockSize).toMatch(/px$/);
			expect(parseFloat(spacer.style.blockSize)).toBeGreaterThan(15000);
		});

		it('draws the whole sheet when it was not asked to virtualise', () => {
			host.rows.set(Array.from({ length: 200 }, (_, index) => ({ id: `r${index}`, product: 'x', units: 1, price: 1 })));
			fixture.detectChanges();

			expect(drawnRows()).toHaveLength(200);
			expect(fixture.nativeElement.querySelector('.hub-spreadsheet__spacer')).toBeNull();
		});

		it('keeps the frozen rows in the document wherever the reader has scrolled', () => {
			longSheet(1000);
			host.frozenRows.set(2);
			fixture.detectChanges();

			expect(drawnRows().slice(0, 2)).toEqual([0, 1]);
		});

		it('windows the columns too, once their widths are known', () => {
			longSheet(50);
			host.columns.set([
				...host.columns(),
				...Array.from({ length: 60 }, (_, index) => ({
					key: `extra${index}`,
					header: `C${index}`,
					cell: () => ({ value: index, editable: true })
				}))
			]);
			fixture.detectChanges();

			// jsdom measures every width as nought, and one unknown width is enough to draw them
			// all: a window is only as honest as the sizes it is built from.
			expect(fixture.nativeElement.querySelectorAll('[data-header]').length).toBe(host.columns().length);
		});

		it('spans a spacer row across the cells a row actually holds, not the columns the sheet has', () => {
			longSheet(1000);

			// The row carries the class; the colspan is on the cell inside it.
			const spacer: HTMLElement = fixture.nativeElement.querySelector('tr.hub-spreadsheet__spacer td');
			const cellsInARow = fixture.nativeElement.querySelectorAll('[data-cell^="0-"]').length;

			// A colspan that overshoots stretches the table wider than its own header.
			expect(Number(spacer.getAttribute('colspan'))).toBe(cellsInARow);
		});

		it('draws a merged block whole, anchor and all, rather than losing it at the edge', () => {
			longSheet(1000);
			// A block anchored well above the window, reaching into it.
			host.spans.set([{ row: 0, col: 0, rowSpan: 400, colSpan: 1 }]);
			fixture.detectChanges();

			const anchor: HTMLElement = fixture.nativeElement.querySelector('[data-cell="0-0"]');

			expect(anchor).not.toBeNull();
			expect(anchor.getAttribute('rowspan')).toBe('400');
		});
	});

	describe('putting cells together from the sheet itself', () => {
		/** Selects a rectangle by pressing on one corner and releasing on the other. */
		function dragOver(from: [number, number], to: [number, number]): void {
			click(from[0], from[1]);
			cell(to[0], to[1]).dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
			fixture.detectChanges();
			cell(to[0], to[1]).dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
			fixture.detectChanges();
		}

		function openMenu(row: number, col: number): string[] {
			cell(row, col).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			fixture.detectChanges();

			return Array.from(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__menu-item')).map((item) =>
				(item as HTMLElement).textContent!.trim()
			);
		}

		function clickEntry(text: string): void {
			const entry = Array.from(fixture.nativeElement.querySelectorAll('.hub-spreadsheet__menu-item')).find((item) =>
				(item as HTMLElement).textContent!.includes(text)
			) as HTMLElement;

			entry.click();
			fixture.detectChanges();
		}

		beforeEach(() => {
			host.contextMenu.set(true);
			host.mergeable.set(true);
			fixture.detectChanges();
		});

		it('offers nothing to merge on a single cell, which would do nothing', () => {
			fullClick(0, 0);

			expect(openMenu(0, 0).join(' | ')).not.toContain('Merge');
		});

		it('reports the block a selection would become', () => {
			dragOver([0, 0], [1, 1]);
			openMenu(0, 0);
			clickEntry('Merge');

			expect(host.merges.at(-1)?.span).toEqual({ row: 0, col: 0, rowSpan: 2, colSpan: 2 });
			expect(host.merges.at(-1)?.replaced).toEqual([]);
		});

		it('names the blocks the new one swallows, so the host never keeps two claiming a cell', () => {
			host.spans.set([{ row: 0, col: 0, rowSpan: 2, colSpan: 1 }]);
			fixture.detectChanges();
			dragOver([0, 0], [2, 1]);
			openMenu(0, 0);
			clickEntry('Merge');

			expect(host.merges.at(-1)?.replaced).toEqual([{ row: 0, col: 0 }]);
		});

		it('takes apart the blocks the selection touches, by their anchors', () => {
			host.spans.set([{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }]);
			fixture.detectChanges();
			fullClick(0, 0);
			openMenu(0, 0);
			clickEntry('Split');

			expect(host.unmerges.at(-1)).toEqual([{ row: 0, col: 0 }]);
		});

		it('offers neither unless the sheet was asked to', () => {
			host.mergeable.set(false);
			fixture.detectChanges();
			dragOver([0, 0], [1, 1]);

			const entries = openMenu(0, 0).join(' | ');

			expect(entries).not.toContain('Merge');
			expect(entries).not.toContain('Split');
		});
	});

	describe('rows and columns that come and go', () => {
		it('lets go of the cursor when the sheet shrinks under it', () => {
			click(2, 2);
			host.rows.set([lines()[0]]);
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
		});

		it('keeps the cursor when the rows are replaced by equivalent ones after a save', () => {
			click(1, 1);
			host.rows.set(lines());
			fixture.detectChanges();

			expect(cell(1, 1).getAttribute('tabindex')).toBe('0');
		});
	});
});
