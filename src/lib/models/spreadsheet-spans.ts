import { HubGridCoords, HubGridRange, HubGridSpan } from 'ng-hub-ui-utils';

/**
 * Working out what a reader's merge or unmerge does to a list of blocks.
 *
 * The sheet reports what was asked for and writes nothing, as with rows and columns — the list of
 * blocks belongs to whoever declared it, and is usually saved with the document. These are the two
 * lines of arithmetic that would otherwise be rewritten in every host, and the place where the
 * awkward case lives: a merge swallows the blocks already inside it, and a host that merely
 * appends ends up with two blocks claiming the same cell.
 */

/** A merge the reader asked for, and what it absorbs. */
export interface HubSpreadsheetMergeRequest {
	/** The block to create. */
	readonly span: HubGridSpan;
	/** The anchors of the blocks it swallows, which have to go. */
	readonly replaced: readonly HubGridCoords[];
}

/** Whether two coordinates are the same cell. */
function sameCell(a: HubGridCoords, b: HubGridCoords): boolean {
	return a.row === b.row && a.col === b.col;
}

/** The rectangle a block occupies. */
function boundsOf(span: HubGridSpan): HubGridRange {
	return {
		top: span.row,
		left: span.col,
		bottom: span.row + span.rowSpan - 1,
		right: span.col + span.colSpan - 1
	};
}

/** Whether two rectangles share at least one cell. */
function overlaps(a: HubGridRange, b: HubGridRange): boolean {
	return a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;
}

/** The blocks that share a cell with a rectangle, in the order they were declared. */
export function spansWithin(spans: readonly HubGridSpan[], range: HubGridRange): readonly HubGridSpan[] {
	return spans.filter((span) => overlaps(boundsOf(span), range));
}

/**
 * The block a selection would become, and the blocks it swallows.
 *
 * `null` for a selection of one cell that is not already a block: there is nothing to merge, and
 * an entry that does nothing should not be offered.
 */
export function mergeRequestFor(spans: readonly HubGridSpan[], range: HubGridRange): HubSpreadsheetMergeRequest | null {
	const rowSpan = range.bottom - range.top + 1;
	const colSpan = range.right - range.left + 1;

	if (rowSpan < 1 || colSpan < 1 || (rowSpan === 1 && colSpan === 1)) {
		return null;
	}

	return {
		span: { row: range.top, col: range.left, rowSpan, colSpan },
		replaced: spansWithin(spans, range).map((span) => ({ row: span.row, col: span.col }))
	};
}

/**
 * The list of blocks after a merge.
 *
 * The swallowed ones are dropped rather than left behind: two blocks claiming the same cell is a
 * sheet that draws one of them and loses the other, and which one depends on the order they happen
 * to be declared in.
 */
export function applySpanMerge(spans: readonly HubGridSpan[], request: HubSpreadsheetMergeRequest): HubGridSpan[] {
	const kept = spans.filter((span) => !request.replaced.some((anchor) => sameCell(anchor, span)));

	return [...kept, request.span];
}

/** The list of blocks after the ones anchored at `anchors` are taken apart. */
export function applySpanUnmerge(spans: readonly HubGridSpan[], anchors: readonly HubGridCoords[]): HubGridSpan[] {
	return spans.filter((span) => !anchors.some((anchor) => sameCell(anchor, span)));
}
