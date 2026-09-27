import { HubSpreadsheetColumn } from './spreadsheet.types';

/**
 * Adding and removing rows and columns while the sheet is running.
 *
 * The sheet never mutates anything itself. It reports what the reader asked for and the owner
 * decides, because only the owner knows whether a line may be deleted, what a new row should
 * start with, or whether any of it should reach a server. What the sheet does offer is the two
 * pieces that are easy to get wrong: allocating an alias for a new column, and finding out what
 * a deletion would leave pointing at nothing.
 */

/** Which axis a structural change acts on. */
export type HubSpreadsheetAxis = 'row' | 'column';

/** Where a new row or column goes, relative to the one the reader pointed at. */
export type HubSpreadsheetInsertSide = 'before' | 'after';

/**
 * Whether a structural change is offered at all.
 *
 * A plain boolean covers the usual case. A predicate covers the rest: a tariff sheet that lets
 * you add lines but never delete the first one, a column set where only the ones the reader
 * created may be removed.
 */
export type HubSpreadsheetPermission<TSubject> = boolean | ((subject: TSubject, index: number) => boolean);

/** The reader asked to insert. */
export interface HubSpreadsheetInsertRequest {
	readonly axis: HubSpreadsheetAxis;
	/** Where the new one lands, already resolved to an index. */
	readonly at: number;
	/** How many to insert. */
	readonly count: number;
	/** For a column, an alias that is free and has never been used in this sheet. */
	readonly key?: string;
}

/** The reader asked to delete. */
export interface HubSpreadsheetDeleteRequest {
	readonly axis: HubSpreadsheetAxis;
	/** The first index to remove. */
	readonly at: number;
	/** How many to remove. */
	readonly count: number;
	/**
	 * For a column, the aliases about to disappear.
	 *
	 * Handed over so the owner can check what still points at them before agreeing — see
	 * {@link danglingColumnKeys}.
	 */
	readonly keys?: readonly string[];
}

/** How a sheet is allowed to change shape. Everything is refused unless turned on. */
export interface HubSpreadsheetStructureOptions<TRow> {
	readonly insertRows?: HubSpreadsheetPermission<TRow | null>;
	readonly deleteRows?: HubSpreadsheetPermission<TRow>;
	readonly insertColumns?: HubSpreadsheetPermission<HubSpreadsheetColumn<TRow> | null>;
	readonly deleteColumns?: HubSpreadsheetPermission<HubSpreadsheetColumn<TRow>>;
}

/** Matches an alias this module allocated, capturing its number. */
const GENERATED = /^(.+)-(\d+)$/;

/**
 * Whether a permission lets this particular subject through.
 *
 * Silence means no. A sheet that gains the ability to delete rows because an option was left out
 * is a worse failure than one that refuses until told otherwise.
 *
 * A predicate that throws is treated as a refusal: the owner's guard is broken, and acting on a
 * broken guard is how data gets deleted that should not have been.
 */
export function isStructureAllowed<TSubject>(
	permission: HubSpreadsheetPermission<TSubject> | undefined,
	subject: TSubject,
	index: number
): boolean {
	if (permission === undefined) {
		return false;
	}

	if (typeof permission === 'boolean') {
		return permission;
	}

	try {
		return permission(subject, index);
	} catch {
		return false;
	}
}

/**
 * Where an insertion actually lands.
 *
 * @param reference The row or column the reader pointed at.
 * @param side Whether the new one goes before it or after it.
 * @param length How many there are now.
 * @returns An index between 0 and `length`, inclusive, since appending at the end is legal.
 */
export function resolveInsertIndex(reference: number, side: HubSpreadsheetInsertSide, length: number): number {
	const clamped = Math.max(0, Math.min(length, Math.trunc(reference)));
	const index = side === 'after' ? clamped + 1 : clamped;

	return Math.max(0, Math.min(length, index));
}

/**
 * An alias for a new column that has never belonged to another one.
 *
 * Pass every alias the sheet has ever handed out, the live ones and the retired ones together.
 * That is the whole point: an alias is an identity, so reusing a deleted column's name makes
 * everything that referenced the old column silently resolve to the new one, and the mistake
 * surfaces much later as wrong numbers rather than as an error.
 *
 * The same rule the project already applies to task codes, for the same reason.
 *
 * @param taken Every alias ever used, whether the column still exists or not.
 * @param prefix The family to number within; `col` when not given.
 */
export function nextColumnKey(taken: Iterable<string>, prefix = 'col'): string {
	let highest = 0;

	for (const key of taken) {
		const match = GENERATED.exec(key);

		if (match && match[1] === prefix) {
			highest = Math.max(highest, Number(match[2]));
		}
	}

	return `${prefix}-${highest + 1}`;
}

/**
 * The references that no longer resolve to a column.
 *
 * Give it whatever points at columns — the keys of a saved-state map, the aliases a formula
 * mentions — and it reports which of them have nothing behind them any more. Each one named
 * once, in the order first seen, so a message to the reader lists them the way they were found.
 */
export function danglingColumnKeys<TRow>(
	referenced: Iterable<string>,
	columns: readonly HubSpreadsheetColumn<TRow>[]
): string[] {
	const live = new Set(columns.map((column) => column.key));
	const broken: string[] = [];
	const seen = new Set<string>();

	for (const key of referenced) {
		if (!live.has(key) && !seen.has(key)) {
			seen.add(key);
			broken.push(key);
		}
	}

	return broken;
}
