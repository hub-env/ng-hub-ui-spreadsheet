/**
 * The shape of a formula, and of what comes back from running one.
 *
 * A formula refers to columns by the alias they were declared with — `[price] * [units]` — and
 * never by a coordinate. That is the whole reason the aliases exist: a column can be reordered,
 * renamed in its header, or moved to another position and every formula still means what it said.
 * Excel made the other choice, and renaming a column there rewrites every formula in the workbook.
 */

/** A value a formula can work with. */
export type HubFormulaValue = number | string | boolean | null;

/** What went wrong, in the terms a reader can be shown. */
export type HubFormulaErrorCode =
	/** The text is not a formula: a bracket left open, an operator with nothing after it. */
	| 'syntax'
	/** A name nothing answers to: a column alias that does not exist, a function that is not one. */
	| 'name'
	/** Division by nought. */
	| 'divide-by-zero'
	/** A formula that needs its own result to work out its own result. */
	| 'cycle'
	/** Arithmetic on something that is not a number, or a function given the wrong kind of thing. */
	| 'type';

/** A formula that could not be run, and why. */
export interface HubFormulaFailure {
	readonly ok: false;
	readonly code: HubFormulaErrorCode;
	/** What it was that failed — an alias, a function name, the character it stopped at. */
	readonly at?: string;
}

/** A formula that ran. */
export interface HubFormulaSuccess {
	readonly ok: true;
	readonly value: HubFormulaValue;
}

export type HubFormulaOutcome = HubFormulaSuccess | HubFormulaFailure;

/** What a formula is allowed to ask about the sheet around it. */
export interface HubFormulaContext {
	/**
	 * This row's value in a column.
	 *
	 * `undefined` for an alias no column answers to, which is how `#NAME?` is told apart from an
	 * empty cell — a distinction Excel makes and every ad-hoc evaluator forgets.
	 */
	cell(alias: string): HubFormulaValue | undefined;
	/** Every row's value in a column, in the order the rows are in. */
	column(alias: string): readonly HubFormulaValue[] | undefined;
	/**
	 * The cell at a place, for a formula written with coordinates.
	 *
	 * `undefined` for a place outside the sheet, which is `#REF!` and not an empty cell: a formula
	 * pointing off the edge is a mistake, and one pointing at a blank cell is not.
	 */
	at?(row: number, col: number): HubFormulaValue | undefined;
	/** Every cell of a rectangle, row by row. */
	area?(top: number, left: number, bottom: number, right: number): readonly HubFormulaValue[] | undefined;
}

/** A parsed formula, ready to be run as many times as the sheet is redrawn. */
export interface HubFormula {
	/** The tree to walk. */
	readonly node: HubFormulaNode;
	/** Aliases it reads from its own row. */
	readonly cells: readonly string[];
	/** Aliases it reads whole columns of. */
	readonly columns: readonly string[];
	/** Whether it points at anywhere by coordinate, which is what a change of shape has to move. */
	readonly coordinates: boolean;
}

/** One step of a parsed formula. */
export type HubFormulaNode =
	| { readonly kind: 'number'; readonly value: number }
	| { readonly kind: 'text'; readonly value: string }
	| { readonly kind: 'boolean'; readonly value: boolean }
	| { readonly kind: 'cell'; readonly alias: string }
	| { readonly kind: 'column'; readonly alias: string }
	| { readonly kind: 'at'; readonly row: number; readonly col: number }
	| {
			readonly kind: 'area';
			readonly top: number;
			readonly left: number;
			readonly bottom: number;
			readonly right: number;
	  }
	| { readonly kind: 'unary'; readonly operator: '-' | '+'; readonly operand: HubFormulaNode }
	| {
			readonly kind: 'binary';
			readonly operator: '+' | '-' | '*' | '/' | '^' | '&' | '=' | '<>' | '<' | '<=' | '>' | '>=';
			readonly left: HubFormulaNode;
			readonly right: HubFormulaNode;
	  }
	| { readonly kind: 'call'; readonly name: string; readonly args: readonly HubFormulaNode[] };
