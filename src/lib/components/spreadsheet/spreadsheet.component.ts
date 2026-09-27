import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	Injector,
	afterNextRender,
	afterRenderEffect,
	booleanAttribute,
	computed,
	effect,
	inject,
	contentChildren,
	input,
	model,
	output,
	signal,
	untracked,
	viewChild
} from '@angular/core';
import {
	HubGridCoords,
	HubGridRange,
	HubGridSpan,
	HubGridWindow,
	addGridRange,
	anchorOf,
	buildSpanMap,
	clampGridRange,
	clampGridSelection,
	coversRange,
	gridCellTabIndex,
	gridRangeBetween,
	gridRangeCells,
	gridSelectionCells,
	gridSelectionTable,
	gridWindow,
	growWindowToSpans,
	isCovered,
	isWithinGridRange,
	isWithinGridSelection,
	moveGridFocus,
	resolveGridEdge,
	resolveGridIntent,
	spanAt
} from 'ng-hub-ui-utils';
import { HUB_TRANSLATION_PREFIX, TranslatePipe } from 'ng-hub-ui-utils';
import { displayValue, isTruthy, parseForColumn } from '../../columns/cell-values';
import { HubSpreadsheetEditorContext, HubSpreadsheetEditorDirective } from './spreadsheet-editor.directive';
import { HubSpreadsheetCellContext, HubSpreadsheetCellDirective } from './spreadsheet-cell.directive';
import { moveColumn, resolveColumnWidth } from '../../columns/column-sizing';
import { fillValues } from '../../fill/fill-series';
import { frozenOffsets, isFrozenEdge } from './frozen-panes';
import { revealPicker } from './reveal-picker';
import { evaluateSheet } from '../../formulas/formula-sheet';
import { isFormula } from '../../formulas/formula-parser';
import { FORMULA_ERRORS, formulaErrorText } from '../../formulas/formula-errors';
import { HubFormulaSuggestion, applySuggestion, formulaFragment, suggestFormula } from '../../formulas/formula-suggest';
import { HubFormulaToken, tokenizeFormula } from '../../formulas/formula-tokens';
import { columnLabel, formatCoordinate } from '../../formulas/formula-coordinates';
import { HubSpreadsheetControlDirective } from '../../editors/editor-adapter.directive';
import { HUB_SPREADSHEET_CONTROLS } from '../../editors/editor-adapter.token';
import { HubSpreadsheetControlConfig } from '../../editors/editor-adapter.types';
import { HubClipboardCell, parseClipboardTable, parseDecimal, serialiseClipboardTable } from '../../clipboard/clipboard-table';
import { HubSpreadsheetMergeRequest, mergeRequestFor, spansWithin } from '../../models/spreadsheet-spans';
import {
	HubSpreadsheetDeleteRequest,
	HubSpreadsheetInsertRequest,
	HubSpreadsheetStructureOptions,
	isStructureAllowed,
	nextColumnKey,
	resolveInsertIndex
} from '../../models/spreadsheet-structure';
import {
	HubSpreadsheetCell,
	HubSpreadsheetCellRef,
	HubSpreadsheetCellState,
	HubSpreadsheetColumn,
	HubSpreadsheetCommit,
	HubSpreadsheetOption,
	HubSpreadsheetPaste,
	HubSpreadsheetValue,
	HubSpreadsheetValueKind
} from '../../models/spreadsheet.types';

/**
 * The height a row is assumed to have on the very first frame of a virtualised sheet, in pixels.
 *
 * Only ever used once: there is nothing to measure until something is drawn, and what is drawn
 * depends on the height. A rough number breaks that circle, and the measurement that follows
 * replaces it on the next frame. Being wrong costs a few rows too many or too few for one frame;
 * waiting for certainty costs drawing every row there is.
 */
const FIRST_PASS_ROW_HEIGHT = 32;

/**
 * An editable sheet of cells: typed into, moved through with the keyboard, and pasted into from
 * a spreadsheet.
 *
 * It knows nothing about what the cells mean. The owner describes each column, keeps the save
 * state it cares about, and does the writing when the sheet reports a change. The sheet never
 * mutates the rows it is given, which is what lets the same component serve an invoice, a price
 * list and a timesheet without learning about any of them.
 *
 * Focus lives on the cells themselves, with one tab stop that travels — the arrangement screen
 * readers expect from a grid. Pasting is the exception: a browser only dispatches `paste` to an
 * editable element, so the paste shortcut hands focus to an off-screen field for the length of
 * the event and takes it straight back.
 */
@Component({
	selector: 'hub-spreadsheet',
	standalone: true,
	imports: [NgTemplateOutlet, TranslatePipe, HubSpreadsheetControlDirective],
	providers: [{ provide: HUB_TRANSLATION_PREFIX, useValue: 'HUBUI.SPREADSHEET' }],
	templateUrl: './spreadsheet.component.html',
	styleUrl: './spreadsheet.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		/*
		 * The sheet draws itself from what it measures, so what a server writes and what a browser
		 * then wants are two different documents — and hydration's job is to insist they are one.
		 *
		 * A virtualised sheet measures a viewport that does not exist on a server and draws every
		 * row; the browser measures a real one and draws fifteen. A column that draws its own cells
		 * needs its template, which a content query has not resolved on the first server pass. Both
		 * come out as NG0500, and neither is a mistake to be fixed — it is what this component is.
		 *
		 * So the markup is re-created rather than adopted. The server's copy still ships in the
		 * page, which is what a crawler reads; the browser simply builds its own.
		 */
		ngSkipHydration: 'true',
		class: 'hub-spreadsheet',
		'[attr.dir]': 'forcedDirection()',
		'[class.hub-spreadsheet--readonly]': 'readonly()',
		'[class.hub-spreadsheet--editing]': 'editing()',
		'[class.hub-spreadsheet--virtual]': 'virtual()',
		'[class.hub-spreadsheet--rtl]': 'rtl()',
		'(document:mouseup)': 'endDrag()',
		'(document:mousemove)': 'onPointerMove($event)',
		'(document:mousedown)': 'closeMenu()',
		'(document:keydown.escape)': 'closeMenu()'
	}
})
export class HubSpreadsheetComponent<TRow> {
	readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
	readonly #injector = inject(Injector);
	readonly #destroyRef = inject(DestroyRef);

	constructor() {
		afterNextRender(
			() => {
				// The list of suggestions hangs in the window rather than in the sheet, which is how
				// it escapes every scroll area and every `overflow: hidden` between the cell and the
				// page. The price is that it no longer travels with the sheet, so anything that
				// scrolls — or a resized window — puts it back on its cell. Scroll is caught in the
				// capture phase, because the thing that scrolls the page is rarely the window.
				const replace = () => {
					if (this.editing()) {
						this.placeSuggestions();
					}
				};
				const options: AddEventListenerOptions = { capture: true, passive: true };

				document.addEventListener('scroll', replace, options);
				window.addEventListener('resize', replace, options);

				this.#destroyRef.onDestroy(() => {
					document.removeEventListener('scroll', replace, options);
					window.removeEventListener('resize', replace, options);
				});
			},
			{ injector: this.#injector }
		);
	}

	/** The `dir` to put on the host: nothing when the page is left to decide, which is `'auto'`. */
	protected readonly forcedDirection = computed(() => (this.direction() === 'auto' ? null : this.direction()));

	/**
	 * Which way the sheet actually runs, once the page has had its say.
	 *
	 * `'auto'` is answered by the element itself, because `dir` is inherited and only the element
	 * knows what it inherited. Read after render: before it, the attribute this very binding sets is
	 * not on the element yet, so the answer would be the page's and not the sheet's.
	 */
	private readonly resolvedDirection = signal<'ltr' | 'rtl'>('ltr');

	private readonly readDirection = afterRenderEffect({
		read: () => {
			const preference = this.direction();
			const computed = getComputedStyle(this.#host.nativeElement).direction === 'rtl' ? 'rtl' : 'ltr';

			this.resolvedDirection.set(preference === 'auto' ? computed : preference);
		}
	});

	/** Whether the sheet runs right to left, which is what the menu and the list have to know. */
	protected readonly rtl = computed(() => this.resolvedDirection() === 'rtl');

	/** The rows, as the owner holds them. Never written to. */
	readonly rows = input.required<readonly TRow[]>();
	/** What each column shows and allows. */
	readonly columns = input.required<readonly HubSpreadsheetColumn<TRow>[]>();
	/** A stable name per row, so a save state follows its row across a reload. */
	readonly rowKey = input.required<(row: TRow) => string>();
	/** The save state of each cell, keyed by `rowKey` and column alias joined by a tab. */
	readonly states = input<Record<string, HubSpreadsheetCellState>>({});
	/**
	 * A validation message per cell, keyed the same way as {@link states}.
	 *
	 * Owned by the host, because validation belongs to whoever knows what the data means. Keeping
	 * it a plain map rather than tying it to one forms API is what lets the same sheet be driven
	 * by Signal Forms, by reactive forms, or by nothing at all.
	 */
	readonly errors = input<Record<string, string>>({});
	/** The character this reader types decimals with. */
	readonly decimalMark = input<',' | '.'>(',');
	/** What an empty sheet says. */
	readonly emptyText = input('');
	/** How many rows Page Up and Page Down travel. */
	readonly pageSize = input(10);
	/** Turns off every editor, whatever the individual cells say. */
	readonly readonly = input(false, { transform: booleanAttribute });
	/**
	 * How many columns stay pinned against the leading edge while the sheet scrolls sideways.
	 *
	 * Counted from the start, the way a spreadsheet freezes panes, rather than marked one by one:
	 * a set of frozen columns with a gap in it cannot be laid out, so the shape of the input rules
	 * the mistake out instead of validating against it.
	 */
	readonly frozenColumns = input(0);
	/** How many rows stay pinned below the header while the sheet scrolls down. */
	readonly frozenRows = input(0);
	/**
	 * Cells merged into blocks, each named by its top-left corner.
	 *
	 * Owned by the host, which is why they come in as an input and why the reader's merging goes
	 * back out as a request rather than being done here — see {@link mergeable}. A declared block
	 * is treated as one cell everywhere it matters: the cursor lands on the block rather than
	 * inside it, a selection that would clip one grows to contain it, and the covered cells are
	 * not drawn at all.
	 */
	readonly spans = input<readonly HubGridSpan[]>([]);
	/** Which structural changes the reader may ask for. Everything is refused by default. */
	readonly structure = input<HubSpreadsheetStructureOptions<TRow>>({});
	/** Editors supplied by the host, one per column alias. */
	protected readonly customEditors = contentChildren<HubSpreadsheetEditorDirective<TRow>>(HubSpreadsheetEditorDirective);
	/** Cell templates supplied by the host, for what a column shows while it is not being edited. */
	protected readonly customCells = contentChildren<HubSpreadsheetCellDirective<TRow>>(HubSpreadsheetCellDirective);

	/** Aliases retired by earlier deletions, so a new column never reuses one. */
	readonly retiredColumnKeys = input<readonly string[]>([]);
	/**
	 * Which way the sheet runs.
	 *
	 * `'auto'` follows whatever the page says, which is the only honest default: a sheet dropped
	 * into a right-to-left article on a left-to-right page has to read the way the article does,
	 * and a `dir` is inherited. `'ltr'` and `'rtl'` force it for a host that needs the sheet to run
	 * against the page around it.
	 */
	readonly direction = input<'auto' | 'ltr' | 'rtl'>('auto');
	/**
	 * Whether `Ctrl`-clicking (`Cmd` on a Mac) adds a second rectangle to the selection instead of
	 * starting a new one.
	 *
	 * On, because it is what a spreadsheet does and because the gesture is otherwise spent: a plain
	 * click already selects, so `Ctrl` had nothing to say. Off for a host that wants the modifier
	 * for something of its own.
	 */
	readonly disjointSelection = input(true, { transform: booleanAttribute });
	/** Whether the sheet offers the fill handle at the corner of the selection. */
	readonly fillHandle = input(false, { transform: booleanAttribute });
	/** Whether undo is available; the sheet only asks, the owner keeps the history. */
	readonly canUndo = input(false, { transform: booleanAttribute });
	/** Whether redo is available. */
	readonly canRedo = input(false, { transform: booleanAttribute });
	/** Whether a reader may drag a column's trailing edge to widen or narrow it. */
	readonly resizableColumns = input(false, { transform: booleanAttribute });
	/** Whether a reader may drag a header to put the column somewhere else. */
	readonly reorderableColumns = input(false, { transform: booleanAttribute });
	/**
	 * The width of each column in pixels, keyed by alias.
	 *
	 * Two-way, and view state rather than data: the sheet writes it as the reader drags, and the
	 * owner may persist it so a layout survives a reload. A column with no entry keeps whatever
	 * width its content asks for.
	 */
	readonly columnWidths = model<Record<string, number>>({});
	/** The narrowest a column may be dragged. */
	readonly minColumnWidth = input(48);
	/**
	 * Whether a right-click offers the menu of structural changes.
	 *
	 * Off unless asked for, and each entry still has to pass `structure`. A menu that lists what
	 * the reader is not allowed to do is worse than no menu.
	 */
	readonly contextMenu = input(false, { transform: booleanAttribute });
	/**
	 * Whether the reader may put cells together and take them apart again.
	 *
	 * Off unless asked for, like every other structural change: a sheet whose shape is part of the
	 * document it belongs to should not be reshaped by a stray right-click. The blocks stay the
	 * host's — the sheet reports what was asked for through {@link mergeRequested} and
	 * {@link unmergeRequested} and writes nothing itself. Offered through the context menu, so it
	 * needs {@link contextMenu} to be reachable with the pointer.
	 */
	readonly mergeable = input(false, { transform: booleanAttribute });
	/**
	 * Whether a cell whose value starts with `=` is a formula.
	 *
	 * Off unless asked for, and not as caution for its own sake: a column of text may perfectly
	 * well hold `=1+1` as the thing somebody wrote, and a sheet that decides to do arithmetic on
	 * it has lost the reader's data.
	 *
	 * Formulas read columns by their alias — `=[price] * [units]`, `=SUM([total:])` — never by a
	 * coordinate, which is what the aliases were for: move a column, rename its header, and every
	 * formula still means what it said.
	 *
	 * The cell shows the answer; the editor shows the formula, so it can be corrected rather than
	 * retyped; and the clipboard carries what the cell holds, which is the formula.
	 */
	readonly formulas = input(false, { transform: booleanAttribute });
	/**
	 * Whether to draw only the rows the reader can see.
	 *
	 * Off unless asked for. A sheet of a few hundred rows is better off whole — every row is in the
	 * document, so the browser's own find works, printing works, and nothing depends on a
	 * measurement. Past a few thousand it stops being a choice: the first paint arrives late and
	 * every keystroke pays for cells nobody is looking at.
	 *
	 * What it costs: the rows out of view are not in the document, so `Ctrl+F` and printing only
	 * reach what is drawn, and the rows have to be of one height — see {@link rowHeight}.
	 */
	readonly virtual = input(false, { transform: booleanAttribute });
	/**
	 * How tall a row is, in pixels, when {@link virtual} is on.
	 *
	 * Nought means "measure the first one drawn", which is right whenever the rows are alike. Say
	 * it outright for a sheet whose first row is not typical, or one that is built while hidden —
	 * a tab that is not open measures every row as nought, and a window worked out from nought is
	 * the whole sheet.
	 */
	readonly rowHeight = input(0);
	/**
	 * What opens the editor with the pointer.
	 *
	 * `double-click` by default, the spreadsheet convention: a click picks the cell and leaves its
	 * value where it is. Selecting is the gesture a reader makes most — to copy, to look, to drag
	 * out a range — and turning every one of them into an open field puts the value at the mercy
	 * of the next keystroke. Typing is still the short way in: with the cell picked, the first
	 * character opens the editor and lands in it, so nothing is lost by not opening on the click.
	 *
	 * `click` opens on the first one, for a sheet that exists to be typed into and where the two
	 * gestures per cell are the tax.
	 *
	 * Either way the editor opens on release and only when the pointer did not travel, so
	 * dragging out a range still works — and Shift-clicking still extends rather than edits.
	 */
	readonly editOn = input<'click' | 'double-click'>('double-click');

	/** A cell took a new value. */
	readonly commit = output<HubSpreadsheetCommit<TRow>>();
	/** A block was pasted. */
	readonly pasted = output<HubSpreadsheetPaste<TRow>>();
	/** Delete was pressed over these cells, the editable ones of the selection. */
	readonly cleared = output<HubSpreadsheetCellRef<TRow>[]>();
	/** The selected rectangle changed; null when nothing is selected. */
	readonly selectionChange = output<HubGridRange | null>();
	/** The reader asked to add rows or columns. */
	readonly insertRequested = output<HubSpreadsheetInsertRequest>();
	/** The reader asked to remove rows or columns. */
	readonly deleteRequested = output<HubSpreadsheetDeleteRequest>();
	/**
	 * A drag of the fill handle finished.
	 *
	 * Reported as one event for the whole gesture, so an owner keeping a history can make it one
	 * undo step. Filling cell by cell and undoing cell by cell is experienced as a bug.
	 */
	readonly filled = output<HubSpreadsheetPaste<TRow>>();
	/** The reader asked to undo. The owner holds the history and decides what that means. */
	readonly undoRequested = output<void>();
	/** The reader asked to redo. */
	readonly redoRequested = output<void>();
	/**
	 * The reader dropped a column somewhere else.
	 *
	 * Reported rather than applied: the column list belongs to the owner, as the rows do. The
	 * payload carries the reordered aliases so acting on it is a single assignment.
	 */
	readonly columnMoved = output<{ from: number; to: number; key: string; keys: string[] }>();
	/**
	 * The reader asked to put a selection together into one block.
	 *
	 * The payload carries the block to create and the anchors of the blocks it swallows, because a
	 * host that merely appends the new one ends up with two claiming the same cell — and which of
	 * them is drawn depends on the order they were declared in. `applySpanMerge()` does the whole
	 * thing in a line.
	 */
	readonly mergeRequested = output<HubSpreadsheetMergeRequest>();
	/**
	 * Every rectangle of the selection, whenever it changes.
	 *
	 * Beside {@link selectionChange}, which keeps reporting the one the cursor is in: a host that
	 * shows "sum of the selection" needs all of them, and one that shows "you are in B4" does not.
	 */
	readonly selectionRangesChange = output<readonly HubGridRange[]>();
	/** The reader asked to take apart the blocks their selection touches, named by their anchors. */
	readonly unmergeRequested = output<readonly HubGridCoords[]>();

	/** The cell the cursor is on. */
	protected readonly active = signal<HubGridCoords | null>(null);
	/** The other corner of the selection; null when only the active cell is selected. */
	protected readonly anchor = signal<HubGridCoords | null>(null);
	/**
	 * The rectangles picked before the one being drawn.
	 *
	 * Held apart from the anchor and the cursor rather than as a list including them, because the
	 * live one has to keep growing under the pointer while the others stay exactly as they were.
	 */
	protected readonly extraRanges = signal<readonly HubGridRange[]>([]);
	/**
	 * The cells a pointing gesture is over, while a formula is being written.
	 *
	 * Kept apart from the selection: pointing picks a reference to put into the text, and moving the
	 * reader's own selection out from under them to do it would be a different gesture wearing the
	 * same click.
	 */
	private readonly pointAnchor = signal<HubGridCoords | null>(null);
	private readonly pointTarget = signal<HubGridCoords | null>(null);
	protected readonly editing = signal(false);
	protected readonly draft = signal('');

	/**
	 * The control adapter, when the project registered one.
	 *
	 * Optional on purpose: without it the sheet draws its own native list, which is what makes the
	 * library installable on its own.
	 */
	readonly #controls = inject(HUB_SPREADSHEET_CONTROLS, { optional: true });

	/**
	 * The character that opened the cell, when typing opened it.
	 *
	 * Kept beside the draft rather than inside it because a supplied editor needs it as it was
	 * typed, while the draft has already been turned into whatever the column stores.
	 */
	private readonly seed = signal<string | undefined>(undefined);
	/** The editor holds text that does not read as a value, so it stays open and marked. */
	protected readonly invalid = signal(false);
	private dragging = false;
	/** Whether the pointer visited another cell during this press, which makes it a drag. */
	private dragMoved = false;
	/** The selection a fill drag started from; null when no fill is in progress. */
	protected readonly fillSource = signal<HubGridRange | null>(null);
	/** What the fill would cover if released now. */
	protected readonly fillTarget = signal<HubGridRange | null>(null);
	/** The column being widened, with where the pointer started and how wide it then was. */
	private resizing: { col: number; startX: number; startWidth: number } | null = null;
	/** The column being dragged to another place. */
	protected readonly movingColumn = signal<number | null>(null);
	/** Where it would land if dropped now. */
	protected readonly moveTargetColumn = signal<number | null>(null);
	/** Where the structural menu sits, in pixels from the sheet's own corner; null when closed. */
	protected readonly menuAt = signal<{ x: number; y: number } | null>(null);

	/** Where each frozen column sits, in pixels from the leading edge. */
	protected readonly columnOffsets = signal<readonly number[]>([]);
	/** Where each frozen row sits, in pixels from the top of the scroll area. */
	protected readonly rowOffsets = signal<readonly number[]>([]);

	/** The merges, indexed once per change rather than scanned on every keystroke. */
	protected readonly spanMap = computed(() => buildSpanMap(this.spans()));

	protected readonly bounds = computed(() => ({
		rows: this.rows().length,
		cols: this.columns().length
	}));

	/**
	 * What the viewport has told us about itself: how far it has scrolled and how tall it is.
	 *
	 * Nought until the first measurement, which is why {@link gridWindow} draws a first screenful
	 * from nothing rather than drawing nothing: the rows it puts in are what the measurement then
	 * measures.
	 */
	private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
	/** The coloured copy of the draft drawn behind the editor while a formula is being written. */
	private readonly tokens = viewChild<ElementRef<HTMLElement>>('tokens');

	private readonly scrollTop = signal(0);
	private readonly viewportHeight = signal(0);
	/** The height of a row, measured off the first one drawn unless the host declared it. */
	private readonly measuredRowHeight = signal(0);
	/** How far the viewport has travelled sideways, and how much of it is on screen. */
	private readonly scrollLeft = signal(0);
	private readonly viewportWidth = signal(0);
	/** The width of every column, by index, as last measured. */
	private readonly measuredColumnWidths = signal<number[]>([]);

	/** The rows to draw: the frozen ones, then the window, or all of them when not virtualising. */
	protected readonly rowWindow = computed<HubGridWindow>(() => {
		const total = this.rows().length;
		const frozen = Math.min(this.frozenRows(), total);

		if (!this.virtual()) {
			return { start: frozen, end: total - 1, before: 0, after: 0 };
		}

		// Nothing measured and nothing declared, which is only ever the first frame: a rough height
		// rather than the whole sheet. Drawing it whole once is exactly the cost virtualising is
		// here to avoid — ten thousand rows took a minute and a half of it — and the measurement
		// that follows lands on the real height before anybody sees the difference.
		const size = this.rowHeight() || this.measuredRowHeight() || FIRST_PASS_ROW_HEIGHT;

		const window = gridWindow({
			offset: this.scrollTop(),
			viewport: this.viewportHeight(),
			sizes: size,
			count: total,
			pinned: frozen
		});

		return growWindowToSpans(window, this.spans(), 'row', size, { count: total, pinned: frozen });
	});

	/**
	 * The columns to draw, the same way as the rows.
	 *
	 * Their widths are measured rather than declared, so the first render draws them all — there
	 * is nothing to measure otherwise — and every render after that windows them with what the
	 * first one learnt. A column the sheet has never drawn has no width, and one unknown width is
	 * enough to fall back to drawing the lot: a window is only as honest as the sizes it is built
	 * from.
	 */
	protected readonly columnWindow = computed<HubGridWindow>(() => {
		const total = this.columns().length;
		const frozen = Math.min(this.frozenColumns(), total);
		const everything: HubGridWindow = { start: frozen, end: total - 1, before: 0, after: 0 };

		if (!this.virtual()) {
			return everything;
		}

		const widths = this.measuredColumnWidths();

		if (widths.length !== total || widths.some((width) => !(width > 0))) {
			return everything;
		}

		const window = gridWindow({
			offset: this.scrollLeft(),
			viewport: this.viewportWidth(),
			sizes: widths,
			pinned: frozen
		});

		return growWindowToSpans(window, this.spans(), 'col', widths, { pinned: frozen });
	});

	/** The column indices in the document, frozen ones first. */
	protected readonly drawnColumns = computed<number[]>(() => {
		const total = this.columns().length;
		const frozen = Math.min(this.frozenColumns(), total);
		const window = this.columnWindow();
		const drawn: number[] = [];

		for (let index = 0; index < frozen; index++) {
			drawn.push(index);
		}

		for (let index = window.start; index <= window.end; index++) {
			drawn.push(index);
		}

		return drawn;
	});

	/**
	 * How many cells a row of the sheet actually holds, spacers included.
	 *
	 * What a spacer row has to span. `bounds().cols` would be wrong whenever the columns are
	 * windowed — it counts the columns the sheet has, not the ones in the document — and a colspan
	 * that overshoots stretches the table wider than its own header.
	 */
	protected readonly drawnCellCount = computed(() => {
		const window = this.columnWindow();

		return this.drawnColumns().length + (window.before > 0 ? 1 : 0) + (window.after > 0 ? 1 : 0);
	});

	/** The row indices in the document, frozen ones first. */
	protected readonly drawnRows = computed<number[]>(() => {
		const total = this.rows().length;
		const frozen = Math.min(this.frozenRows(), total);
		const window = this.rowWindow();
		const drawn: number[] = [];

		for (let index = 0; index < frozen; index++) {
			drawn.push(index);
		}

		for (let index = window.start; index <= window.end; index++) {
			drawn.push(index);
		}

		return drawn;
	});

	/** Every cell, worked out once per change of rows or columns rather than on every paint. */
	protected readonly grid = computed<HubSpreadsheetCell[][]>(() => {
		const columns = this.columns();
		const cells = this.rows().map((row) => columns.map((column) => column.cell(row)));

		if (!this.formulas()) {
			return cells;
		}

		const places = new Map(columns.map((column, index) => [column.key, index]));
		const sheet = evaluateSheet({
			rows: this.rows(),
			columns,
			raw: (rowIndex, column) => cells[rowIndex]?.[places.get(column.key) ?? -1]?.value ?? null
		});

		return cells.map((line, rowIndex) =>
			line.map((cell, colIndex) => {
				const column = columns[colIndex];

				// Either the row holds a formula, or the column carries one for every row.
				if (!isFormula(cell.value) && !column.formula) {
					return cell;
				}

				const result = sheet[rowIndex]?.[column.key];

				// The value stays the formula: it is what the editor opens on and what the
				// clipboard carries. What changes is what the cell shows.
				return {
					...cell,
					text: result?.failure ? formulaErrorText(result.failure) : displayValue(result?.value ?? null, column)
				};
			})
		);
	});

	/** Which suggestion the keyboard is on, or -1 when the reader has not moved into the list. */
	private readonly suggestionAt = signal(-1);

	/**
	 * Where the list of suggestions is anchored, in the host's own coordinates.
	 *
	 * The list used to be drawn inside the cell, and the scroll area — which is what makes the
	 * sheet scroll — clipped it: on the last row it fell below the viewport and was never seen,
	 * which is exactly the row a total is written in. It hangs off the host now, like the
	 * structural menu, where no scroll area can cut it. `top` opens below the cell and `bottom`
	 * above it, only one of the two ever being set; both null until the sheet has been measured.
	 */
	protected readonly suggestionsAt = signal<{
		readonly x: number;
		readonly top: number | null;
		readonly bottom: number | null;
		readonly maxWidth: number;
	} | null>(null);

	/**
	 * Whether the cell being edited opens the plain field, which is the only editor the list of
	 * suggestions belongs to.
	 *
	 * A list, a calendar or a host-supplied editor owns its own keystrokes, and the formula
	 * language is not what is being typed there. While the list was drawn inside the field's own
	 * branch that was true by construction; lifted to the host it has to be said.
	 */
	private readonly editingField = computed(() => {
		const active = this.active();

		if (!active || !this.editing()) {
			return false;
		}

		return (
			!this.editorFor(active.col) &&
			!this.hostedControl(active.row, active.col) &&
			this.columns()[active.col]?.kind !== 'select'
		);
	});

	/**
	 * What to offer while a formula is being written, or nothing when one is not.
	 *
	 * A formula names columns by an alias the sheet never shows — the header carries a title meant
	 * for people — so without this, writing one means knowing something that is not on screen.
	 */
	protected readonly suggestions = computed<readonly HubFormulaSuggestion[]>(() => {
		if (!this.formulas() || !this.editingField()) {
			return [];
		}

		const columns = this.columns();

		return suggestFormula(this.draft(), {
			aliases: columns.map((column) => column.key),
			titles: Object.fromEntries(columns.map((column) => [column.key, column.header]))
		});
	});

	/** Whether the sheet is showing the list of what can go into a formula. */
	protected readonly suggesting = computed(() => this.suggestions().length > 0);

	/**
	 * The one the keyboard is on, which Enter and Tab put in.
	 *
	 * The first is taken as chosen the moment there is a word being typed, so `=SU` and Tab
	 * finishes it — which is what completing means, and what a reader who has seen a spreadsheet
	 * expects. Nothing is chosen when there is no word: a bare `=`, or a formula that has just
	 * closed a bracket, is a list to look at rather than a completion to accept, and Enter there
	 * means commit.
	 */
	protected readonly suggestionIndex = computed(() => {
		const moved = this.suggestionAt();

		if (moved >= 0 && moved < this.suggestions().length) {
			return moved;
		}

		return formulaFragment(this.draft()).text && this.suggestions().length ? 0 : -1;
	});

	/** Whether a formula is being written, which is when the aliases are worth showing. */
	protected readonly writingFormula = computed(() => this.formulas() && this.editing() && isFormula(this.draft()));

	/**
	 * The draft split into the pieces a formula is made of, so they can be drawn apart.
	 *
	 * Read off the raw draft rather than off the value that is shown, because this is what the
	 * reader is typing: a half-written `=SUM(` still has to say those three things are what they
	 * are, or the colour would only arrive once the formula was already right.
	 */
	protected readonly draftTokens = computed<readonly HubFormulaToken[]>(() => tokenizeFormula(this.draft()));

	/**
	 * Keeps the coloured copy under the field lined up with the field's own text.
	 *
	 * The field scrolls sideways once the formula is longer than the cell, and the copy has no way
	 * to know it did — so it is told, on every scroll and on every keystroke that moves the caret.
	 */
	protected syncTokens(event: Event): void {
		const overlay = this.tokens()?.nativeElement;
		const field = event.target as HTMLElement | null;

		if (overlay && field) {
			overlay.scrollLeft = field.scrollLeft;
		}
	}

	/** The letters a column answers to in a formula: A, B … Z, AA. */
	protected columnLetter(index: number): string {
		return columnLabel(index);
	}

	/**
	 * Writes a column's alias into the formula being written, from its header badge.
	 *
	 * Nothing when no formula is being written: the badge also shows outside one, as a reading of
	 * what the column is called, and a click there has nothing to write into.
	 */
	protected insertAlias(column: HubSpreadsheetColumn<TRow>): void {
		if (this.writingFormula()) {
			this.useSuggestion({ label: column.key, kind: 'column', insert: `[${column.key}]` });
		}
	}

	/** Puts a suggestion into the draft and leaves the caret where the next thing is typed. */
	protected useSuggestion(suggestion: HubFormulaSuggestion): void {
		const editor = this.editorField();
		const caret = editor?.selectionStart ?? this.draft().length;
		const applied = applySuggestion(this.draft(), suggestion, caret);

		this.writeDraft(applied.draft, applied.caret);
	}

	/** The field a formula is being written in, when there is one. */
	private editorField(): HTMLInputElement | null {
		return this.#host.nativeElement.querySelector<HTMLInputElement>('input.hub-spreadsheet__editor');
	}

	/**
	 * Puts text into the draft at the caret and leaves it there, ready for what is typed next.
	 *
	 * The caret matters as much as the text: dropped after an inserted reference it is ready for
	 * the operator or the next argument, and left where it was the reader has to move it by hand
	 * every single time.
	 */
	private writeDraft(text: string, caret: number): void {
		const editor = this.editorField();

		this.draft.set(text);
		this.suggestionAt.set(-1);

		if (editor) {
			editor.value = text;
			editor.focus();
			editor.setSelectionRange(caret, caret);
		}
	}

	/** Starts pointing at cells to put their reference into the formula being written. */
	protected beginPointing(row: number, col: number): void {
		this.pointAnchor.set({ row, col });
		this.pointTarget.set({ row, col });
	}

	/** Gives up on a pointing gesture without writing anything. */
	private cancelPointing(): void {
		this.pointAnchor.set(null);
		this.pointTarget.set(null);
	}

	/**
	 * Writes the pointed rectangle into the formula as a reference and ends the gesture.
	 *
	 * A single cell goes in as `B3`; more than one as `B3:D7`, the way a spreadsheet names a
	 * rectangle. Coordinates rather than aliases, because that is what pointing at cells means:
	 * an alias names a whole column, and there is no alias for one cell or for a patch of them.
	 */
	private commitPointing(): void {
		const anchor = this.pointAnchor();
		const target = this.pointTarget();

		this.cancelPointing();

		if (!anchor || !target) {
			return;
		}

		const range = gridRangeBetween(anchor, target);
		const near = formatCoordinate({ row: range.top, col: range.left });
		const far = formatCoordinate({ row: range.bottom, col: range.right });
		const reference = near === far ? near : `${near}:${far}`;
		const editor = this.editorField();
		const caret = editor?.selectionStart ?? this.draft().length;

		this.writeDraft(this.draft().slice(0, caret) + reference + this.draft().slice(caret), caret + reference.length);
	}

	/**
	 * Works out where the list of suggestions belongs, against the cell being edited.
	 *
	 * The list is `fixed`, so these are window coordinates read straight off the cell's own
	 * rectangle — which is also the only honest way to place it with frozen panes and
	 * virtualisation, where the drawn position and the scroll offset are not the same number. It
	 * hangs just under the cell, pulled in only as far as keeps it on screen, and it flips above
	 * the cell when the window has no room below — so the last row of a sheet that reaches the
	 * foot of the page can still be written in.
	 */
	private placeSuggestions(): void {
		const active = this.active();

		if (!active) {
			this.suggestionsAt.set(null);

			return;
		}

		const cell = this.#host.nativeElement
			.querySelector<HTMLElement>(`[data-cell="${active.row}-${active.col}"]`)
			?.getBoundingClientRect();

		// A sheet that has not been laid out — a hidden panel, a closed tab, a test with no layout —
		// has nothing to measure. The list keeps where it was rather than jumping to a corner, and
		// the next placement gets it right.
		if (!cell || (cell.width === 0 && cell.height === 0)) {
			return;
		}

		// The width the list asks for, and how far it can go before running off the window's edge.
		// Measured from the edge the sheet starts at — the left when it reads left to right, the
		// right when it does not — because the list is placed by its inline start, whichever that is.
		const wanted = 224;
		const width = Math.min(wanted, window.innerWidth);
		const fromStart = this.rtl() ? window.innerWidth - cell.right : cell.left;
		const x = Math.max(0, Math.min(fromStart, window.innerWidth - width));

		// Below is the default; above only when below is the shorter side, so the list does not
		// cover the rows the reader is writing between.
		const roomBelow = window.innerHeight - cell.bottom;
		const above = roomBelow < wanted && cell.top > roomBelow;

		this.suggestionsAt.set({
			x,
			top: above ? null : cell.bottom,
			bottom: above ? window.innerHeight - cell.top : null,
			maxWidth: Math.max(width, window.innerWidth - x)
		});
	}

	/** Whether a cell is showing a formula that could not be worked out. */
	protected hasFormulaError(row: number, col: number): boolean {
		const cell = this.grid()[row]?.[col];

		const fromColumn = !!this.columns()[col]?.formula;

		return !!cell && (isFormula(cell.value) || fromColumn) && FORMULA_ERRORS.includes(cell.text ?? '');
	}

	protected readonly keys = computed(() => {
		const keyOf = this.rowKey();

		return this.rows().map((row) => keyOf(row));
	});

	protected readonly range = computed<HubGridRange | null>(() => {
		const active = this.active();

		if (!active) {
			return null;
		}

		const base = clampGridRange(gridRangeBetween(this.anchor() ?? active, active), this.bounds());

		// A range that clips a merge cannot be copied, filled or cleared coherently, so it grows
		// until every block it touches is inside it — which is what Excel does too.
		return base ? clampGridRange(coversRange(this.spanMap(), base), this.bounds()) : null;
	});

	/**
	 * Every rectangle the reader has picked: the ones held with `Ctrl`, and the live one last.
	 *
	 * Trimmed to the grid on every read for the same reason one rectangle is — rows come and go
	 * under a live selection, and a stale rectangle would be cleared or copied against cells that
	 * are not there any more.
	 */
	protected readonly selection = computed<readonly HubGridRange[]>(() => {
		const live = this.range();
		const kept = clampGridSelection(this.extraRanges(), this.bounds());

		return live ? addGridRange(kept, live) : kept;
	});

	/** Whether the reader has picked more than one rectangle. */
	protected readonly disjoint = computed(() => this.selection().length > 1);

	/**
	 * Keeps the cursor where it was when the rows are replaced by a reload after a save, and drops
	 * it only once it points at nothing. Typing a value and pressing Enter has to land on the cell
	 * below even when the saved figures come back as fresh objects.
	 */
	private readonly reconcile = effect(() => {
		const { rows, cols } = this.bounds();

		untracked(() => {
			const active = this.active();

			if (active && (active.row >= rows || active.col >= cols)) {
				this.active.set(null);
				this.anchor.set(null);
				this.extraRanges.set([]);
				this.editing.set(false);
			}
		});
	});

	/**
	 * Keeps the viewport's measurements up to date while virtualising.
	 *
	 * In the read phase, like the frozen offsets: reading layout while the browser is writing one
	 * forces a reflow in the middle of it, which is how a grid loses frames exactly when it is
	 * being scrolled.
	 *
	 * It settles rather than loops. Measuring feeds the window, the window changes what is drawn,
	 * and the next pass measures the same numbers — a signal set to the value it already holds
	 * tells nobody, so the third pass does not happen. It reads `drawnRows` so that a sheet whose
	 * data arrives later is measured when its first row finally exists, which is the common case
	 * and the one a single measurement at birth gets wrong.
	 */
	private readonly measureViewport = afterRenderEffect({
		read: () => {
			if (!this.virtual()) {
				return;
			}

			this.drawnRows();
			this.onViewportScroll();
		}
	});

	/**
	 * The width of every column, read off the headers by the index they carry.
	 *
	 * By index and not by position, because a windowed header holds the frozen columns and then
	 * the ones in view — so the third header in the document is rarely the third column. A width
	 * that is not on screen keeps whatever was measured last, which is what makes windowing the
	 * columns possible at all: they are measured once, while the sheet is still drawing them all.
	 */
	private readColumnWidths(): number[] {
		const total = this.columns().length;
		const known = [...this.measuredColumnWidths()];

		known.length = total;

		for (const header of this.#host.nativeElement.querySelectorAll<HTMLElement>('.hub-spreadsheet__header')) {
			const index = Number(header.getAttribute('data-header'));
			const width = header.getBoundingClientRect().width;

			if (Number.isInteger(index) && index >= 0 && index < total && width > 0) {
				known[index] = width;
			}
		}

		const measured = Array.from(known, (width) => width ?? 0);
		const previous = this.measuredColumnWidths();

		// Only when something actually moved. A fresh array is a fresh reference, and a reference
		// set after every render is a render after every render: the measurement feeds the window,
		// the window is drawn, and the drawing measures again for ever.
		if (measured.length !== previous.length || measured.some((width, index) => width !== previous[index])) {
			this.measuredColumnWidths.set(measured);
		}

		return measured;
	}

	/**
	 * Measures the frozen tracks after every render and turns the sizes into offsets.
	 *
	 * Reading layout has to happen in the read phase or it forces a synchronous reflow in the
	 * middle of writing one, which is the classic way a grid loses frames while scrolling.
	 */
	private readonly measureFrozen = afterRenderEffect({
		read: () => {
			const columns = this.frozenColumns();
			const rows = this.frozenRows();
			const widths = this.readColumnWidths();

			if (columns <= 0 && rows <= 0) {
				this.columnOffsets.set([]);
				this.rowOffsets.set([]);
				return;
			}

			const host = this.#host.nativeElement;
			const bodyRows = [...host.querySelectorAll<HTMLElement>('.hub-spreadsheet__row')];

			this.columnOffsets.set(frozenOffsets(widths, columns));

			// Frozen rows start below the header, which is itself pinned at the top.
			const headerHeight =
				host.querySelector<HTMLElement>('.hub-spreadsheet__header')?.getBoundingClientRect().height ?? 0;

			this.rowOffsets.set(
				frozenOffsets(
					bodyRows.map((row) => row.getBoundingClientRect().height),
					rows
				).map((offset) => offset + Math.round(headerHeight))
			);
		}
	});

	/**
	 * Whether a column is pinned.
	 *
	 * Answered from the input alone, never from the measurement. A cell is taken out of the flow
	 * because the caller asked for it; the measured offset only decides where it lands. Gating
	 * the two on the same signal would leave the pane unpinned for the frame before the first
	 * measurement, and permanently unpinned anywhere the render hooks do not run.
	 */
	protected isFrozenColumn(col: number): boolean {
		return col < Math.min(this.frozenColumns(), this.bounds().cols);
	}

	/** Whether a row is pinned. Same reasoning as {@link isFrozenColumn}. */
	protected isFrozenRow(row: number): boolean {
		return row < Math.min(this.frozenRows(), this.bounds().rows);
	}

	/** Where a frozen column sits, once measured; null until then, and the stylesheet pins it at zero. */
	protected columnOffsetOf(col: number): number | null {
		return this.isFrozenColumn(col) ? (this.columnOffsets()[col] ?? null) : null;
	}

	/** Where a frozen row sits, once measured. */
	protected rowOffsetOf(row: number): number | null {
		return this.isFrozenRow(row) ? (this.rowOffsets()[row] ?? null) : null;
	}

	protected isColumnEdge(col: number): boolean {
		return isFrozenEdge(col, Math.min(this.frozenColumns(), this.bounds().cols));
	}

	protected isRowEdge(row: number): boolean {
		return isFrozenEdge(row, Math.min(this.frozenRows(), this.bounds().rows));
	}

	/** Whether a cell is swallowed by a merge, and therefore not rendered. */
	protected isHidden(row: number, col: number): boolean {
		return isCovered(this.spanMap(), { row, col });
	}

	/** How many rows a cell occupies; null leaves the attribute off. */
	protected rowSpanOf(row: number, col: number): number | null {
		const span = spanAt(this.spanMap(), { row, col });

		return span && span.rowSpan > 1 ? span.rowSpan : null;
	}

	/** How many columns a cell occupies; null leaves the attribute off. */
	protected colSpanOf(row: number, col: number): number | null {
		const span = spanAt(this.spanMap(), { row, col });

		return span && span.colSpan > 1 ? span.colSpan : null;
	}

	/**
	 * Whether a cell reaches the trailing edge of the sheet, counting the columns it spans.
	 *
	 * Asked rather than guessed with `:last-child`. Once cells can be swallowed by a merge, the
	 * last one drawn in a row is not the one in the last column — in a row where the rightmost
	 * block is covered it is the cell before it, and that is the one that would lose its border.
	 */
	protected reachesEnd(row: number, col: number): boolean {
		const span = spanAt(this.spanMap(), { row, col });

		return col + (span?.colSpan ?? 1) - 1 >= this.bounds().cols - 1;
	}

	protected isActive(row: number, col: number): boolean {
		const active = this.active();

		return !!active && active.row === row && active.col === col;
	}

	protected isSelected(row: number, col: number): boolean {
		return isWithinGridSelection({ row, col }, this.selection());
	}

	/** Whether a press is being dragged out to point a reference into the formula being written. */
	protected readonly pointing = computed(() => !!this.pointAnchor());

	/**
	 * The rectangle a pointing gesture currently covers, or null when none is in progress.
	 *
	 * Drawn on the cells rather than kept out of sight, because the whole point of pointing is to
	 * see what is about to go into the formula before letting go of it.
	 */
	protected readonly pointedRange = computed<HubGridRange | null>(() => {
		const anchor = this.pointAnchor();
		const target = this.pointTarget();

		return anchor && target ? gridRangeBetween(anchor, target) : null;
	});

	protected isPointed(row: number, col: number): boolean {
		const range = this.pointedRange();

		return !!range && isWithinGridRange({ row, col }, range);
	}

	protected tabIndexOf(row: number, col: number): number {
		return gridCellTabIndex({ row, col }, this.active(), 'roving');
	}

	protected stateOf(row: number, col: number): HubSpreadsheetCellState | undefined {
		return this.states()[this.cellKey(row, col)];
	}

	/** The validation message the host attached to a cell, if any. */
	protected errorOf(row: number, col: number): string | undefined {
		return this.errors()[this.cellKey(row, col)];
	}

	/** How a cell is addressed in the `states` and `errors` maps. */
	private cellKey(row: number, col: number): string {
		return `${this.keys()[row]}\t${this.columns()[col].key}`;
	}

	/**
	 * What a cell shows: its own text when it gives one, otherwise whatever its column makes of
	 * the value — an option's label, a mark for a yes, the value itself for everything else.
	 */
	protected displayOf(cell: HubSpreadsheetCell, column: HubSpreadsheetColumn<TRow>): string {
		if (cell.text !== undefined && cell.text !== null) {
			return cell.text;
		}

		return displayValue(cell.value, column);
	}

	/**
	 * What a hosted control should be for this cell, or null when there is nothing to host.
	 *
	 * Null covers three cases and they are all deliberate: no adapter registered, a column that is
	 * not a list, and a column whose host supplied its own editor — which is read first and wins,
	 * because a template written for one column is a more specific answer than a rule for all of
	 * them.
	 */
	protected hostedControl(row: number, col: number): HubSpreadsheetControlConfig | null {
		const column = this.columns()[col];

		if (!this.#controls || this.editorFor(col) || !(column.kind === 'select' || column.options?.length)) {
			return null;
		}

		return {
			kind: 'select',
			value: this.grid()[row][col].value,
			options: column.options?.map((option) => ({ ...option })),
			label: column.header,
			labelType: 'visually-hidden',
			ariaLabel: column.header,
			placeholder: column.placeholder,
			// A cell is a search box's whole reason for being wired, it empties with `Delete`, and
			// the gesture that opened it has been spent by the time it exists.
			searchable: true,
			clearable: false,
			autoOpen: true,
			searchTerm: this.seed(),
			onValueChange: (value) => this.commitFromEditor(value as HubSpreadsheetValue)
		};
	}

	/**
	 * Which answer a list shows while it is open.
	 *
	 * Read off the draft rather than off the cell, so a list opened by typing shows the answer that
	 * keystroke reached. The draft holds the stored value until a keystroke moves it, so an
	 * ordinary open still shows what the cell holds.
	 */
	protected isChosen(option: HubSpreadsheetOption, column: HubSpreadsheetColumn<TRow>): boolean {
		return parseForColumn(this.draft(), column, this.decimalMark()) === option.value;
	}

	/** Whether a boolean cell is on, which is what draws its checkbox. */
	protected isOn(cell: HubSpreadsheetCell): boolean {
		return isTruthy(cell.value);
	}

	/**
	 * What a cell should show to say it opens onto something, or null when it opens onto a field.
	 *
	 * Only drawn on the cell the reader is on. A caret down every row of a column would read as
	 * content and make the sheet look like a form, and it is only ever the current cell that is
	 * about to be opened.
	 */
	protected affordanceOf(column: HubSpreadsheetColumn<TRow>, col: number): 'list' | 'date' | null {
		if (column.kind === 'date') {
			return 'date';
		}

		// A column with a supplied editor counts as a list: that hook exists for pickers, and the
		// sheet cannot see inside the template to know which kind it is.
		return column.kind === 'select' || column.options?.length || this.editorFor(col) ? 'list' : null;
	}

	/** The template this column's editor should use, if the host supplied one. */
	protected editorFor(col: number): HubSpreadsheetEditorDirective<TRow> | undefined {
		const key = this.columns()[col]?.key;

		return this.customEditors().find((editor) => editor.column() === key);
	}

	/** The template this column draws its cells with, if the host supplied one. */
	protected cellTemplateFor(col: number): HubSpreadsheetCellDirective<TRow> | undefined {
		const key = this.columns()[col]?.key;

		return this.customCells().find((template) => template.column() === key);
	}

	/** The context a cell template is rendered with. */
	protected cellContext(row: number, col: number): HubSpreadsheetCellContext<TRow> {
		const cell = this.grid()[row][col];

		return {
			$implicit: cell.value,
			cell,
			row: this.rows()[row],
			column: this.columns()[col],
			active: this.isActive(row, col)
		};
	}

	/** The context a custom editor template is rendered with. */
	protected editorContext(row: number, col: number): HubSpreadsheetEditorContext<TRow> {
		const cell = this.grid()[row][col];

		return {
			$implicit: cell.value,
			seed: this.seed(),
			cell,
			row: this.rows()[row],
			column: this.columns()[col],
			commit: (value: HubSpreadsheetValue) => this.commitFromEditor(value),
			cancel: () => this.cancelEdit()
		};
	}

	/** Accepts a value a custom editor or a built-in list reported, and moves on as Enter would. */
	protected commitFromEditor(value: HubSpreadsheetValue): void {
		const active = this.active();

		if (!active) {
			return;
		}

		const column = this.columns()[active.col];
		const cell = this.grid()[active.row][active.col];

		this.editing.set(false);
		this.invalid.set(false);

		if (value !== cell.value) {
			this.commit.emit({ coords: active, row: this.rows()[active.row], column, cell, value });
		}

		this.moveTo(moveGridFocus(active, { row: 1, col: 0 }, this.bounds(), { horizontal: 'continuous' }), false);
	}

	/**
	 * Turns a boolean cell over without opening an editor.
	 *
	 * A checkbox that needs opening, ticking and confirming is three gestures for one bit. The
	 * keyboard reaches it the same way, since a printable character on such a column toggles too.
	 */
	protected toggleBoolean(row: number, col: number): void {
		if (!this.canEdit(row, col)) {
			return;
		}

		const cell = this.grid()[row][col];
		const column = this.columns()[col];

		this.commit.emit({
			coords: { row, col },
			row: this.rows()[row],
			column,
			cell,
			value: isTruthy(cell.value) ? 0 : 1
		});
	}

	protected canEdit(row: number, col: number): boolean {
		// A column with a formula of its own has nothing to type into: the cell shows what the
		// column works out, and letting a reader replace it would lose the formula for that row
		// alone, which is the sort of thing nobody notices until the totals stop adding up.
		if (this.formulas() && this.columns()[col]?.formula) {
			return false;
		}

		return !this.readonly() && !!this.grid()[row]?.[col]?.editable;
	}

	protected onKeydown(event: KeyboardEvent): void {
		const active = this.active();

		if (!active) {
			return;
		}

		if (this.editing()) {
			this.catchUp(event);

			return;
		}

		const intent = resolveGridIntent(event, {
			pageSize: this.pageSize(),
			editable: !this.readonly()
		});

		if (!intent) {
			return;
		}

		// Copy and cut ride the browser's own events, which carry the clipboard. Paste needs the
		// focus moved to something editable first, or the event is never dispatched at all.
		if (intent.kind === 'copy' || intent.kind === 'cut') {
			return;
		}

		if (intent.kind === 'paste') {
			this.focusSink();
			return;
		}

		event.preventDefault();

		switch (intent.kind) {
			case 'move':
				this.moveTo(moveGridFocus(active, intent.delta, this.bounds(), { horizontal: 'continuous' }), intent.extend);
				break;
			case 'edge':
				this.moveTo(resolveGridEdge(active, intent.edge, this.bounds()), intent.extend);
				break;
			case 'edit':
				this.startEdit(intent.seed);
				break;
			case 'clear':
				this.announceCleared();
				break;
			case 'cancel':
				this.anchor.set(null);
				this.announceSelection();
				break;
			case 'select-all':
				this.selectRange({ top: 0, bottom: this.bounds().rows - 1, left: 0, right: this.bounds().cols - 1 });
				break;
			case 'select-row':
				this.selectRange({ top: active.row, bottom: active.row, left: 0, right: this.bounds().cols - 1 });
				break;
			case 'select-col':
				this.selectRange({ top: 0, bottom: this.bounds().rows - 1, left: active.col, right: active.col });
				break;
			case 'undo':
				if (this.canUndo()) {
					this.undoRequested.emit();
				}

				break;
			case 'redo':
				if (this.canRedo()) {
					this.redoRequested.emit();
				}

				break;
		}
	}

	protected onMouseDown(event: MouseEvent, row: number, col: number): void {
		if (event.button !== 0) {
			return;
		}

		// While a formula is being written, a press on another cell points at it instead of
		// committing the text: that is how a reference gets into a formula without typing its
		// address. The press is swallowed so the field keeps the focus and the caret it was about
		// to lose — which is also what lets the reader drag out a rectangle.
		if (this.editing() && this.writingFormula() && !this.isActive(row, col)) {
			event.preventDefault();
			this.beginPointing(row, col);

			return;
		}

		if (this.editing() && this.isActive(row, col)) {
			return;
		}

		if (this.editing()) {
			this.finishEdit(null);
		}

		this.dragging = true;
		this.dragMoved = false;

		// `Ctrl` (or `Cmd`) puts the rectangle that was being drawn away and starts another, so the
		// reader can pick blocks that have nothing to do with each other. Shift still extends the
		// live one, and holding both extends it without losing the rest.
		const adding = this.disjointSelection() && (event.ctrlKey || event.metaKey);

		if (adding && !event.shiftKey) {
			const live = this.range();

			if (live) {
				this.extraRanges.update((ranges) => addGridRange(ranges, live));
			}
		}

		this.moveTo({ row, col }, event.shiftKey, adding);
	}

	/**
	 * Opens the editor on release, not on press.
	 *
	 * Pressing would settle the question too early: a press that turns into a drag is a range
	 * selection, and one that does not is a request to type. Waiting for the release is what lets
	 * both gestures start the same way.
	 */
	protected onMouseUp(event: MouseEvent, row: number, col: number): void {
		if (
			event.button !== 0 ||
			event.shiftKey ||
			this.dragMoved ||
			this.editing() ||
			this.editOn() !== 'click' ||
			!this.isActive(row, col)
		) {
			return;
		}

		this.startEdit(undefined);
	}

	protected onMouseEnter(row: number, col: number): void {
		// Pointing grows its own rectangle, and the reader's selection is left exactly where it was.
		if (this.pointing()) {
			this.pointTarget.set({ row, col });

			return;
		}

		if (this.dragging && !this.isActive(row, col)) {
			this.dragMoved = true;
		}

		if (this.fillSource()) {
			this.trackFill(row, col);
			return;
		}

		if (this.dragging && !this.isActive(row, col)) {
			this.moveTo({ row, col }, true);
		}
	}

	/** The width a column has been dragged to, or null while it sizes itself to its content. */
	protected widthOf(col: number): number | null {
		return this.columnWidths()[this.columns()[col].key] ?? null;
	}

	protected onResizeStart(event: MouseEvent, col: number): void {
		if (event.button !== 0) {
			return;
		}

		// The grip lives inside the header; without this the header would also start a reorder.
		event.preventDefault();
		event.stopPropagation();

		const header = this.#host.nativeElement.querySelector<HTMLElement>(`[data-header="${col}"]`);

		this.resizing = {
			col,
			startX: event.clientX,
			startWidth: header?.getBoundingClientRect().width ?? Number.NaN
		};
	}

	protected onHeaderMouseDown(event: MouseEvent, col: number): void {
		if (event.button !== 0 || !this.reorderableColumns()) {
			return;
		}

		event.preventDefault();
		this.movingColumn.set(col);
		this.moveTargetColumn.set(col);
	}

	protected onHeaderMouseEnter(col: number): void {
		if (this.movingColumn() !== null) {
			this.moveTargetColumn.set(col);
		}
	}

	/** Runs for every pointer move while something is being dragged, and only then. */
	protected onPointerMove(event: MouseEvent): void {
		const resizing = this.resizing;

		if (!resizing) {
			return;
		}

		const width = resolveColumnWidth(resizing.startWidth, event.clientX - resizing.startX, this.minColumnWidth());

		if (width === null) {
			return;
		}

		const key = this.columns()[resizing.col]?.key;

		if (key) {
			this.columnWidths.update((widths) => ({ ...widths, [key]: width }));
		}
	}

	protected endDrag(): void {
		const pointing = this.pointing();

		this.dragging = false;
		this.resizing = null;

		// A pointing gesture is not a drag: releasing it writes the reference rather than finishing
		// a column move or a fill, neither of which was ever started.
		if (pointing) {
			this.commitPointing();

			return;
		}

		this.commitColumnMove();

		if (this.fillSource()) {
			this.commitFill();
		}
	}

	protected onContextMenu(event: MouseEvent, row: number, col: number): void {
		if (!this.contextMenu()) {
			return;
		}

		// A right-click on a cell outside the selection moves the cursor there first, as a
		// spreadsheet does: acting on cells the reader cannot see selected is how rows get
		// deleted that should not have been.
		if (!this.isSelected(row, col)) {
			this.moveTo({ row, col }, false);
		}

		if (!this.menuEntries().length) {
			return;
		}

		event.preventDefault();

		const host = this.#host.nativeElement.getBoundingClientRect();

		// Placed by its inline start, so measured from the edge the sheet starts at.
		const x = this.rtl() ? host.right - event.clientX : event.clientX - host.left;

		this.menuAt.set({ x, y: event.clientY - host.top });
	}

	protected closeMenu(): void {
		this.menuAt.set(null);
	}

	/**
	 * What the menu offers here, already filtered by what is allowed.
	 *
	 * Built rather than rendered-and-hidden so the menu is never opened empty, and so no entry
	 * appears that would do nothing when clicked.
	 */
	protected readonly menuEntries = computed<Array<{ id: string; label: string; count: number }>>(() => {
		const range = this.range();

		if (!range || this.readonly()) {
			return [];
		}

		const rows = this.rows();
		const columns = this.columns();
		const structure = this.structure();
		const entries: Array<{ id: string; label: string; count: number }> = [];
		const rowCount = range.bottom - range.top + 1;
		const colCount = range.right - range.left + 1;

		if (isStructureAllowed(structure.insertRows, rows[range.top] ?? null, range.top)) {
			entries.push({ id: 'row-before', label: 'INSERT_ROW_ABOVE', count: 1 });
			entries.push({ id: 'row-after', label: 'INSERT_ROW_BELOW', count: 1 });
		}

		if (this.allRows(range, (row, index) => isStructureAllowed(structure.deleteRows, row, index))) {
			entries.push({ id: 'row-delete', label: 'DELETE_ROWS', count: rowCount });
		}

		if (isStructureAllowed(structure.insertColumns, columns[range.left] ?? null, range.left)) {
			entries.push({ id: 'col-before', label: 'INSERT_COLUMN_BEFORE', count: 1 });
			entries.push({ id: 'col-after', label: 'INSERT_COLUMN_AFTER', count: 1 });
		}

		if (this.allColumns(range, (column, index) => isStructureAllowed(structure.deleteColumns, column, index))) {
			entries.push({ id: 'col-delete', label: 'DELETE_COLUMNS', count: colCount });
		}

		if (this.mergeable()) {
			// The selection has already grown to contain whole blocks, so what it asks for is one
			// rectangle and the arithmetic has nothing left to guess.
			if (mergeRequestFor(this.spans(), range)) {
				entries.push({ id: 'merge', label: 'MERGE_CELLS', count: rowCount * colCount });
			}

			const touched = spansWithin(this.spans(), range);

			if (touched.length) {
				entries.push({ id: 'unmerge', label: 'UNMERGE_CELLS', count: touched.length });
			}
		}

		return entries;
	});

	protected runMenuEntry(id: string): void {
		this.closeMenu();

		switch (id) {
			case 'row-before':
				this.requestInsertRow('before');
				break;
			case 'row-after':
				this.requestInsertRow('after');
				break;
			case 'row-delete':
				this.requestDeleteRows();
				break;
			case 'col-before':
				this.requestInsertColumn('before');
				break;
			case 'col-after':
				this.requestInsertColumn('after');
				break;
			case 'col-delete':
				this.requestDeleteColumns();
				break;
			case 'merge':
				this.requestMerge();
				break;
			case 'unmerge':
				this.requestUnmerge();
				break;
		}
	}

	/** Reports the block the selection would become, with what it swallows. */
	private requestMerge(): void {
		const range = this.range();
		const request = range && mergeRequestFor(this.spans(), range);

		if (request) {
			this.mergeRequested.emit(request);
		}
	}

	/** Reports the blocks the selection touches, so the host can take them apart. */
	private requestUnmerge(): void {
		const range = this.range();

		if (!range) {
			return;
		}

		const anchors = spansWithin(this.spans(), range).map((span) => ({ row: span.row, col: span.col }));

		if (anchors.length) {
			this.unmergeRequested.emit(anchors);
		}
	}

	private allRows(range: HubGridRange, allowed: (row: TRow, index: number) => boolean): boolean {
		const rows = this.rows();

		for (let index = range.top; index <= range.bottom; index++) {
			if (!allowed(rows[index], index)) {
				return false;
			}
		}

		return true;
	}

	private allColumns(range: HubGridRange, allowed: (column: HubSpreadsheetColumn<TRow>, index: number) => boolean): boolean {
		const columns = this.columns();

		for (let index = range.left; index <= range.right; index++) {
			if (!allowed(columns[index], index)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Reads the viewport after it has scrolled, or been resized, or drawn its first rows.
	 *
	 * Signals rather than a stored geometry, so the window is a computed like everything else and
	 * nothing has to remember to recompute it. The row height is measured from the first row in
	 * the document, which is also the only row that is certainly there.
	 */
	protected onViewportScroll(): void {
		const viewport = this.viewport()?.nativeElement;

		if (!viewport) {
			return;
		}

		this.scrollTop.set(viewport.scrollTop);
		this.viewportHeight.set(viewport.clientHeight);
		this.scrollLeft.set(viewport.scrollLeft);
		this.viewportWidth.set(viewport.clientWidth);

		// The cell being edited has moved with the scroll, and so has the list hanging off it.
		if (this.editing()) {
			this.placeSuggestions();
		}

		if (!this.rowHeight()) {
			const row = viewport.querySelector<HTMLElement>('.hub-spreadsheet__row');
			const height = row?.getBoundingClientRect().height ?? 0;

			// A row of nought is a sheet that has not been laid out — a closed tab, a hidden
			// panel. Keeping the last good measurement is better than throwing the window away.
			if (height > 0) {
				this.measuredRowHeight.set(height);
			}
		}
	}

	/** Reports where a dragged column was dropped, if it moved at all. */
	private commitColumnMove(): void {
		const from = this.movingColumn();
		const to = this.moveTargetColumn();

		this.movingColumn.set(null);
		this.moveTargetColumn.set(null);

		if (from === null || to === null || from === to) {
			return;
		}

		const keys = this.columns().map((column) => column.key);

		this.columnMoved.emit({ from, to, key: keys[from], keys: moveColumn(keys, from, to) });
	}

	/** Whether a header is the one being dragged, or the place it would land. */
	protected isMovingColumn(col: number): boolean {
		return this.movingColumn() === col;
	}

	protected isMoveTarget(col: number): boolean {
		return this.movingColumn() !== null && this.moveTargetColumn() === col && this.movingColumn() !== col;
	}

	/** Whether the fill handle belongs on this cell: the far corner of the selection. */
	protected hasFillHandle(row: number, col: number): boolean {
		const range = this.range();

		// Never on a disjoint selection: a fill continues one rectangle, and which of several it
		// would continue is a question with no answer. A spreadsheet drops the handle too.
		return (
			this.fillHandle() && !this.readonly() && !this.disjoint() && !!range && row === range.bottom && col === range.right
		);
	}

	/** Whether a cell is inside the area a released fill would write to. */
	protected isFillPreview(row: number, col: number): boolean {
		const target = this.fillTarget();

		return !!target && isWithinGridRange({ row, col }, target) && !isWithinGridRange({ row, col }, this.range());
	}

	protected onFillHandleDown(event: MouseEvent): void {
		if (event.button !== 0) {
			return;
		}

		// Stops the cell underneath from treating this as the start of a new selection.
		event.preventDefault();
		event.stopPropagation();

		const range = this.range();

		if (range) {
			this.fillSource.set(range);
			this.fillTarget.set(range);
		}
	}

	/** Grows the preview towards wherever the pointer went, on one axis only. */
	private trackFill(row: number, col: number): void {
		const source = this.fillSource();

		if (!source) {
			return;
		}

		const down = Math.max(0, row - source.bottom);
		const right = Math.max(0, col - source.right);

		// One axis at a time, as a spreadsheet does: a diagonal drag would have to invent a rule
		// for the corner it opens up, and any rule there surprises somebody.
		this.fillTarget.set(
			down >= right
				? { ...source, bottom: Math.max(source.bottom, row) }
				: { ...source, right: Math.max(source.right, col) }
		);
	}

	/** Works out what the finished drag writes, reports it, and leaves the selection covering it. */
	private commitFill(): void {
		const source = this.fillSource();
		const target = this.fillTarget();

		this.fillSource.set(null);
		this.fillTarget.set(null);

		if (!source || !target) {
			return;
		}

		const grid = this.grid();
		const rows = this.rows();
		const columns = this.columns();
		const cells: HubSpreadsheetCommit<TRow>[] = [];
		let skipped = 0;

		const down = target.bottom - source.bottom;
		const across = target.right - source.right;

		const write = (row: number, col: number, value: HubSpreadsheetValue) => {
			const cell = grid[row]?.[col];

			if (!cell?.editable) {
				skipped++;
				return;
			}

			if (value !== cell.value) {
				cells.push({ coords: { row, col }, row: rows[row], column: columns[col], cell, value });
			}
		};

		if (down > 0) {
			for (let col = source.left; col <= source.right; col++) {
				const seed: HubSpreadsheetValue[] = [];

				for (let row = source.top; row <= source.bottom; row++) {
					seed.push(grid[row][col].value);
				}

				fillValues(seed, down).forEach((value, offset) => write(source.bottom + 1 + offset, col, value));
			}
		} else if (across > 0) {
			for (let row = source.top; row <= source.bottom; row++) {
				const seed: HubSpreadsheetValue[] = [];

				for (let col = source.left; col <= source.right; col++) {
					seed.push(grid[row][col].value);
				}

				fillValues(seed, across).forEach((value, offset) => write(row, source.right + 1 + offset, value));
			}
		} else {
			return;
		}

		this.anchor.set({ row: target.top, col: target.left });
		this.active.set({ row: target.bottom, col: target.right });
		this.filled.emit({ cells, range: target, skipped, rejected: 0 });
		this.announceSelection();
	}

	/**
	 * Opens the cell from its own mark, on the first click.
	 *
	 * The mark exists to be pressed, so it does not wait for a second click the way the rest of the
	 * cell does — which is what a spreadsheet does with the list of a cell that has one. The press
	 * is swallowed rather than let through: the cell underneath would otherwise start a range drag,
	 * and the release would land on an editor that was not there when the press began.
	 */
	protected onAffordanceDown(event: MouseEvent, row: number, col: number): void {
		if (event.button !== 0) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		this.moveTo({ row, col }, false);
		this.startEdit(undefined);
	}

	protected onDoubleClick(): void {
		this.startEdit(undefined);
	}

	protected onCopy(event: ClipboardEvent, cut: boolean): void {
		// Several rectangles only make a table when they line up — all on the same columns, or all
		// on the same rows. Anything else has no honest shape to write, so nothing is written and
		// the clipboard keeps what it had, which is what Excel does when it refuses the command.
		const table = gridSelectionTable(this.selection());

		if (!table || this.editing() || !event.clipboardData) {
			return;
		}

		const grid = this.grid();
		const values = [];

		for (const row of table.rows) {
			const line: HubSpreadsheetValue[] = [];

			for (const col of table.cols) {
				line.push(grid[row][col].value);
			}

			values.push(line);
		}

		const { text, html } = serialiseClipboardTable(values);

		event.clipboardData.setData('text/plain', text);
		event.clipboardData.setData('text/html', html);
		event.preventDefault();

		if (cut) {
			this.announceCleared();
		}
	}

	protected onPaste(event: ClipboardEvent): void {
		const active = this.active();

		if (!active || this.editing() || !event.clipboardData) {
			return;
		}

		event.preventDefault();

		const block = parseClipboardTable({
			text: event.clipboardData.getData('text/plain'),
			html: event.clipboardData.getData('text/html')
		});

		this.focusActive();

		if (!block.length) {
			return;
		}

		this.applyPaste(active, block);
	}

	/** Asks the owner to add a row beside the cursor, if it allows it. */
	protected requestInsertRow(side: 'before' | 'after'): void {
		const active = this.active();
		const rows = this.rows();
		const subject = active ? (rows[active.row] ?? null) : null;

		if (!isStructureAllowed(this.structure().insertRows, subject, active?.row ?? 0)) {
			return;
		}

		this.insertRequested.emit({
			axis: 'row',
			at: resolveInsertIndex(active?.row ?? rows.length, side, rows.length),
			count: 1
		});
	}

	/** Asks the owner to remove the rows the selection covers, if it allows it. */
	protected requestDeleteRows(): void {
		const range = this.range();
		const rows = this.rows();

		if (!range) {
			return;
		}

		for (let row = range.top; row <= range.bottom; row++) {
			if (!isStructureAllowed(this.structure().deleteRows, rows[row], row)) {
				return;
			}
		}

		this.deleteRequested.emit({ axis: 'row', at: range.top, count: range.bottom - range.top + 1 });
	}

	/** Asks the owner to add a column, handing over an alias that has never been used here. */
	protected requestInsertColumn(side: 'before' | 'after'): void {
		const active = this.active();
		const columns = this.columns();
		const subject = active ? (columns[active.col] ?? null) : null;

		if (!isStructureAllowed(this.structure().insertColumns, subject, active?.col ?? 0)) {
			return;
		}

		this.insertRequested.emit({
			axis: 'column',
			at: resolveInsertIndex(active?.col ?? columns.length, side, columns.length),
			count: 1,
			key: nextColumnKey([...columns.map((column) => column.key), ...this.retiredColumnKeys()])
		});
	}

	/** Asks the owner to remove the columns the selection covers, naming the aliases at stake. */
	protected requestDeleteColumns(): void {
		const range = this.range();
		const columns = this.columns();

		if (!range) {
			return;
		}

		for (let col = range.left; col <= range.right; col++) {
			if (!isStructureAllowed(this.structure().deleteColumns, columns[col], col)) {
				return;
			}
		}

		this.deleteRequested.emit({
			axis: 'column',
			at: range.left,
			count: range.right - range.left + 1,
			keys: columns.slice(range.left, range.right + 1).map((column) => column.key)
		});
	}

	protected onDraftInput(event: Event): void {
		// A keystroke changes what is being offered, so whatever was highlighted is no longer the
		// thing the reader was looking at.
		this.suggestionAt.set(-1);

		this.draft.set((event.target as HTMLInputElement).value);
		this.invalid.set(false);

		// The copy behind has just changed length, and may have been re-anchored; keep it where the
		// field is rather than at the start of the line.
		this.syncTokens(event);
	}

	protected onEditorKeydown(event: KeyboardEvent): void {
		// A composition is in flight: the Enter that picks a candidate is not the Enter that
		// commits the cell.
		if (event.isComposing || event.keyCode === 229) {
			return;
		}

		if (this.onSuggestionKeydown(event)) {
			return;
		}

		switch (event.key) {
			// Stopped as well as prevented, all three of them. The editor sits inside the grid, so
			// the same keystroke reaches the grid's own handler a moment later — and there it
			// reads as a fresh Enter on the cell below, which opened an editor the reader never
			// asked for on every single commit.
			case 'Enter':
				event.preventDefault();
				event.stopPropagation();
				this.finishEdit({ row: event.shiftKey ? -1 : 1, col: 0 });
				break;
			case 'Tab':
				event.preventDefault();
				event.stopPropagation();
				this.finishEdit({ row: 0, col: event.shiftKey ? -1 : 1 });
				break;
			case 'Escape':
				event.preventDefault();
				event.stopPropagation();

				// A pointing gesture in flight is what Escape gives up first: the formula stays as it
				// was, and the reader is still writing it.
				if (this.pointing()) {
					this.cancelPointing();
				} else {
					this.cancelEdit();
				}

				break;
		}
	}

	/**
	 * The list of suggestions takes the arrows, and takes Enter only once the reader is in it.
	 *
	 * Enter is the awkward one: it both accepts a suggestion and commits a cell, and which of the
	 * two it means depends on whether the reader has moved into the list. Moving into it is
	 * deliberate — an arrow key — so somebody who types a whole formula and presses Enter commits
	 * it, which is what they meant.
	 *
	 * @returns Whether the key was the list's, and the editor should leave it alone.
	 */
	private onSuggestionKeydown(event: KeyboardEvent): boolean {
		const suggestions = this.suggestions();

		if (!suggestions.length) {
			return false;
		}

		const index = this.suggestionIndex();

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				event.stopPropagation();
				this.suggestionAt.set((index + 1) % suggestions.length);

				return true;

			case 'ArrowUp':
				event.preventDefault();
				event.stopPropagation();
				this.suggestionAt.set(index <= 0 ? suggestions.length - 1 : index - 1);

				return true;

			case 'Tab':
			case 'Enter':
				if (index < 0) {
					return false;
				}

				event.preventDefault();
				event.stopPropagation();
				this.useSuggestion(suggestions[index]);

				return true;

			case 'Escape':
				// Out of the list, not out of the cell: a reader dismissing a list of suggestions
				// has not asked to throw away what they were writing.
				if (index >= 0) {
					event.preventDefault();
					event.stopPropagation();
					this.suggestionAt.set(-1);

					return true;
				}

				return false;
		}

		return false;
	}

	/** Leaving the editor keeps what was typed, as clicking away does in a spreadsheet. */
	protected onEditorBlur(): void {
		if (this.editing() && !this.finishEdit(null)) {
			this.cancelEdit();
		}
	}

	protected trackRow = (index: number): string => this.keys()[index] ?? String(index);

	protected trackColumn = (_index: number, column: HubSpreadsheetColumn<TRow>): string => column.key;

	/** Writes a pasted block into the sheet and reports what fitted and what did not. */
	private applyPaste(at: HubGridCoords, block: HubClipboardCell[][]): void {
		const rows = this.rows();
		const columns = this.columns();
		const grid = this.grid();
		const cells: HubSpreadsheetCommit<TRow>[] = [];
		let skipped = 0;
		let rejected = 0;

		block.forEach((line, rowOffset) =>
			line.forEach((incoming, colOffset) => {
				const row = at.row + rowOffset;
				const col = at.col + colOffset;
				const cell = grid[row]?.[col];

				if (!cell?.editable || this.readonly()) {
					skipped++;
					return;
				}

				const column = columns[col];
				const value = this.read(incoming, column);

				if (value === undefined) {
					rejected++;
					return;
				}

				if (value !== cell.value) {
					cells.push({ coords: { row, col }, row: rows[row], column, cell, value });
				}
			})
		);

		const height = block.length;
		const width = Math.max(...block.map((line) => line.length));
		const range = clampGridRange(
			{ top: at.row, bottom: at.row + height - 1, left: at.col, right: at.col + width - 1 },
			this.bounds()
		);

		this.anchor.set(at);
		this.active.set({
			row: Math.min(this.bounds().rows - 1, at.row + height - 1),
			col: Math.min(this.bounds().cols - 1, at.col + width - 1)
		});

		this.pasted.emit({
			cells,
			range: range ?? { top: at.row, bottom: at.row, left: at.col, right: at.col },
			skipped,
			rejected
		});
		this.announceSelection();
	}

	/**
	 * What a pasted cell is worth in this column.
	 *
	 * The raw number from the HTML flavour wins where there is one, because it does not depend on
	 * how the source happened to format it. Only when it is absent is the displayed text parsed,
	 * and then in this reader's own convention.
	 */
	private read(incoming: HubClipboardCell, column: HubSpreadsheetColumn<TRow>): HubSpreadsheetValue | undefined {
		const kind = column.kind ?? 'text';

		// A formula is kept as what it is, whatever the column holds. Read as a figure it is not
		// one — `=2*4` is not a number — and the cell refused the very thing it exists to accept:
		// a column of currency is exactly where somebody writes a formula.
		if (this.formulas() && isFormula(incoming.text)) {
			return incoming.text;
		}

		// The raw number from the HTML flavour wins for a figure column, because it does not
		// depend on how the source happened to format it. For every other kind the text is what
		// carries the meaning.
		if (incoming.raw !== undefined && (kind === 'number' || kind === 'currency')) {
			return incoming.raw;
		}

		return parseForColumn(incoming.text, column, this.decimalMark());
	}

	private startEdit(seed: string | undefined): void {
		const active = this.active();

		if (!active || !this.canEdit(active.row, active.col)) {
			return;
		}

		// A yes/no column has nothing to type into. Opening a field over it would show the stored
		// 0 or 1 as text and ask the reader to edit a number that is not what the column means.
		if (this.columns()[active.col].kind === 'boolean') {
			this.toggleBoolean(active.row, active.col);
			return;
		}

		const cell = this.grid()[active.row][active.col];
		const column = this.columns()[active.col];
		const kind = column.kind ?? 'text';
		// The character that opened the cell is the reader's first keystroke, and it has to land
		// somewhere. In a list it picks the first answer that starts with it, as a native list
		// does when you type at it; in a date field it lands nowhere, because a letter is not a
		// date and keeping it would commit rubbish on the way out.
		const opener = kind === 'select' ? this.optionStartingWith(column, seed) : undefined;

		this.anchor.set(null);
		this.seed.set(seed);
		this.draft.set(this.openingText(cell, kind, seed, opener));
		this.invalid.set(false);
		this.editing.set(true);

		// The cell is already drawn — it is the one that was clicked — so its rectangle can be read
		// now, and the list is anchored before the list itself is ever rendered.
		this.placeSuggestions();

		afterNextRender(
			() => {
				const editor = this.#host.nativeElement.querySelector<HTMLElement>('.hub-spreadsheet__editor');

				if (!editor) {
					// A supplied editor draws whatever it likes, so the most the sheet can do is put
					// the keyboard inside it and let it take over from there.
					this.focusSuppliedEditor();

					return;
				}

				editor.focus();

				// Opened with Enter or F2 the value is kept and selected; opened by typing, the caret
				// sits after the character that opened it. Only a text field has a selection to
				// place — a list has no such method and a date field refuses.
				if (seed === undefined && editor instanceof HTMLInputElement && editor.type === 'text') {
					editor.select();
				}

				// One gesture for one decision: the list and the calendar come up with the cell
				// instead of waiting for a second click. Not when the cell was opened by typing
				// into it, though — a calendar over a half-written date takes the keystrokes that
				// were meant to finish it.
				if (seed === undefined && (kind === 'select' || kind === 'date')) {
					revealPicker(editor);
				}
			},
			{ injector: this.#injector }
		);
	}

	/** Puts the keyboard in the first thing a supplied editor offers it. */
	private focusSuppliedEditor(): void {
		this.#host.nativeElement
			.querySelector<HTMLElement>(
				'.hub-spreadsheet__custom-editor :is(input, select, textarea, button, [tabindex]:not([tabindex="-1"]))'
			)
			?.focus();
	}

	/**
	 * Keeps the characters typed between opening a cell and the editor getting the focus.
	 *
	 * The field does not exist until the view has been drawn, so the focus can only move to it on
	 * the render after the keystroke that opened the cell. Anybody typing quickly — `8`, `0`, `0`
	 * inside one frame — has the first character open the cell and the rest arrive here, at the
	 * grid, with nowhere to go. They used to be dropped: the cell opened on `8` and committed `8`.
	 *
	 * So they are added to the draft, which is what the field shows the moment it appears.
	 */
	private catchUp(event: KeyboardEvent): void {
		if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) {
			return;
		}

		if (event.key.length !== 1) {
			return;
		}

		const editor = this.#host.nativeElement.querySelector<HTMLElement>('.hub-spreadsheet__editor');

		// Only for a key that did not come from the field itself. Once the field has the focus its
		// keystrokes bubble up here too, and adding those to the draft would type everything
		// twice. Read off the event rather than off `document.activeElement`, which is the same
		// question asked of something that lies about it in tests.
		if (editor && event.target === editor) {
			return;
		}

		event.preventDefault();
		this.draft.update((draft) => draft + event.key);

		if (editor instanceof HTMLInputElement) {
			editor.value = this.draft();
		}
	}

	/**
	 * Reads what was typed, reports it if it changed, then moves by `step`.
	 *
	 * @returns false when the text is not a value for this column, leaving the editor open and
	 *          marked rather than throwing away what the reader wrote.
	 */
	private finishEdit(step: { row: number; col: number } | null): boolean {
		const active = this.active();

		if (!active) {
			return true;
		}

		const column = this.columns()[active.col];
		const cell = this.grid()[active.row][active.col];
		const value = this.read({ text: this.draft() }, column);

		if (value === undefined) {
			this.invalid.set(true);
			return false;
		}

		this.editing.set(false);
		this.invalid.set(false);

		if (value !== cell.value) {
			this.commit.emit({ coords: active, row: this.rows()[active.row], column, cell, value });
		}

		if (step) {
			this.moveTo(moveGridFocus(active, step, this.bounds(), { horizontal: 'continuous' }), false);
		} else {
			this.focusActive();
		}

		return true;
	}

	private cancelEdit(): void {
		this.editing.set(false);
		this.invalid.set(false);
		this.focusActive();
	}

	/**
	 * The first answer of a list that starts with what was typed, skipping the ones a reader is
	 * not allowed to choose. Matched on the label, because that is what they were reading.
	 */
	private optionStartingWith(column: HubSpreadsheetColumn<TRow>, seed: string | undefined): HubSpreadsheetOption | undefined {
		if (seed === undefined || seed === '') {
			return undefined;
		}

		const start = seed.toLocaleLowerCase();

		return column.options?.find((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(start));
	}

	/** What the editor starts with, which is not always what was typed. */
	private openingText(
		cell: HubSpreadsheetCell,
		kind: HubSpreadsheetValueKind,
		seed: string | undefined,
		opener: HubSpreadsheetOption | undefined
	): string {
		if (seed === undefined) {
			return this.editableTextOf(cell);
		}

		if (kind === 'select') {
			// The label, which is what a list is read back from; an unmatched character leaves the
			// cell as it was rather than emptying it.
			return opener ? opener.label : this.editableTextOf(cell);
		}

		// A date field cannot hold half a date, and a letter left in the draft would be committed
		// as one the moment the reader clicked away.
		return kind === 'date' ? '' : seed;
	}

	/** A value as it goes into the editor: numbers in this reader's own convention. */
	private editableTextOf(cell: HubSpreadsheetCell): string {
		if (cell.value === null) {
			return '';
		}

		return typeof cell.value === 'number' ? String(cell.value).replace('.', this.decimalMark()) : String(cell.value);
	}

	private moveTo(rawTarget: HubGridCoords, extend: boolean, keepExtras = false): void {
		// Arithmetic runs on plain coordinates; landing on a covered cell then resolves to the
		// block that owns it, so the cursor is never on something that is not drawn.
		const target = anchorOf(this.spanMap(), rawTarget);

		if (extend) {
			this.anchor.set(this.anchor() ?? this.active());
		} else {
			this.anchor.set(null);
		}

		// Any ordinary move starts the selection again, which is what every spreadsheet does: the
		// rectangles held with `Ctrl` last until the reader clicks or walks somewhere plainly.
		if (!keepExtras) {
			this.extraRanges.set([]);
		}

		this.active.set(target);
		this.announceSelection();
		this.focusActive();
	}

	private selectRange(range: HubGridRange): void {
		this.extraRanges.set([]);
		this.anchor.set({ row: range.top, col: range.left });
		this.active.set({ row: range.bottom, col: range.right });
		this.announceSelection();
		this.focusActive();
	}

	private focusActive(): void {
		// While virtualising, the cell the cursor has just moved to may not be in the document at
		// all — that is the whole point of virtualising — so the scroller is moved first and the
		// focus follows on the render that puts the row there.
		this.scrollRowIntoView();

		afterNextRender(
			() => {
				const active = this.active();

				if (active) {
					this.#host.nativeElement
						.querySelector<HTMLElement>(`[data-cell="${active.row}-${active.col}"]`)
						?.focus({ preventScroll: false });
				}
			},
			{ injector: this.#injector }
		);
	}

	/**
	 * Brings the row the cursor is on inside the viewport, when the sheet is the thing that
	 * scrolls and the row might not be drawn.
	 *
	 * Only the arithmetic the browser cannot do for us: `scrollIntoView` needs an element, and a
	 * row that is not in the document has none. The offset is worked out from the row height,
	 * which virtualising already depends on, and the scroller is nudged by the least that brings
	 * the row in — jumping it to the middle would move the sheet under a reader who only pressed
	 * the down arrow.
	 */
	private scrollRowIntoView(): void {
		const active = this.active();
		const viewport = this.viewport()?.nativeElement;
		const size = this.rowHeight() || this.measuredRowHeight();

		if (!active || !viewport || !this.virtual() || size <= 0) {
			return;
		}

		const frozen = Math.min(this.frozenRows(), this.rows().length);

		// A frozen row is pinned, so it is on screen wherever the reader has got to — but landing
		// on one means going back to the top of the sheet, and leaving the view where it was makes
		// the cursor look lost.
		if (active.row < frozen) {
			viewport.scrollTop = 0;
			this.scrollColumnIntoView(viewport, active.col);

			return;
		}

		const top = (active.row - frozen) * size;
		const bottom = top + size;
		const visibleTop = viewport.scrollTop;
		const visibleBottom = visibleTop + viewport.clientHeight;

		if (top < visibleTop) {
			viewport.scrollTop = top;
		} else if (bottom > visibleBottom) {
			viewport.scrollTop = bottom - viewport.clientHeight;
		}

		this.scrollColumnIntoView(viewport, active.col);
	}

	/**
	 * The same for the column the cursor is on, which may be out of the document sideways.
	 *
	 * Measured widths rather than a single size: columns are rarely alike, and adding up the ones
	 * before the cursor is the only way to know where it starts. Nothing to do when a width is
	 * missing, which is also when the sheet is drawing every column anyway.
	 */
	private scrollColumnIntoView(viewport: HTMLElement, col: number): void {
		// Right to left, the scroll offset runs the other way and the arithmetic below would nudge
		// the sheet in the wrong direction. The browser's own focus scroll brings the drawn cell
		// into view; reaching a column that is not drawn yet is left alone rather than guessed at.
		if (this.rtl()) {
			return;
		}

		const widths = this.measuredColumnWidths();
		const frozen = Math.min(this.frozenColumns(), this.columns().length);

		if (widths.length !== this.columns().length || widths.some((width) => !(width > 0))) {
			return;
		}

		// Same for a frozen column: pinned, so visible, but `Home` means the beginning of the row
		// and the sheet has to come back with the cursor.
		if (col < frozen) {
			viewport.scrollLeft = 0;

			return;
		}

		let start = 0;

		for (let index = frozen; index < col; index++) {
			start += widths[index];
		}

		const end = start + widths[col];
		const visibleStart = viewport.scrollLeft;
		const visibleEnd = visibleStart + viewport.clientWidth;

		if (start < visibleStart) {
			viewport.scrollLeft = start;
		} else if (end > visibleEnd) {
			viewport.scrollLeft = end - viewport.clientWidth;
		}
	}

	/** Hands focus to the off-screen field so the browser will dispatch a paste at all. */
	private focusSink(): void {
		this.#host.nativeElement.querySelector<HTMLTextAreaElement>('.hub-spreadsheet__sink')?.focus({
			preventScroll: true
		});
	}

	private refAt(coords: HubGridCoords): HubSpreadsheetCellRef<TRow> {
		return {
			coords,
			row: this.rows()[coords.row],
			column: this.columns()[coords.col],
			cell: this.grid()[coords.row][coords.col]
		};
	}

	private announceSelection(): void {
		this.selectionChange.emit(this.range());
		this.selectionRangesChange.emit(this.selection());
	}

	private announceCleared(): void {
		const ranges = this.selection();

		if (!ranges.length || this.readonly()) {
			return;
		}

		const cells = gridSelectionCells(ranges)
			.filter(({ row, col }) => this.canEdit(row, col) && this.grid()[row][col].value !== null)
			.map((coords) => this.refAt(coords));

		if (cells.length) {
			this.cleared.emit(cells);
		}
	}
}
