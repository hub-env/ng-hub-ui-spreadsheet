/**
 * Resizing and reordering columns, as arithmetic on their own.
 *
 * Kept apart from the component so the fiddly parts — a floor that a drag cannot go under, an
 * index that shifts as a column leaves its old place — are settled by tests rather than by
 * pulling at a header and hoping.
 */

/**
 * The width a drag arrives at, or null when there is no honest answer.
 *
 * Null rather than a guess: if the starting width could not be measured — missing, or zero
 * because nothing had been laid out yet — any number this returns
 * is invented, and an invented width either collapses the column to its floor or makes it jump.
 * Saying so lets the caller leave the column exactly as it is, which is what the reader expects
 * from a drag that could not be interpreted.
 *
 * @param start The width the column had when the drag began.
 * @param delta How far the pointer has travelled since.
 * @param min The narrowest the column may become.
 * @returns A whole number of pixels never below `min`, or null when the drag cannot be read.
 */
export function resolveColumnWidth(start: number, delta: number, min: number): number | null {
	// Zero counts as unmeasurable, not as a width: no column is nought pixels wide, so a zero
	// means the element had not been laid out when the drag began. Accepting it would make the
	// column jump to wherever the pointer happened to be.
	if (!Number.isFinite(start) || start <= 0) {
		return null;
	}

	const travelled = Number.isFinite(delta) ? delta : 0;

	// Whole pixels: half a pixel of column leaves a hairline of the one behind showing through.
	return Math.max(min, Math.round(start + travelled));
}

/**
 * A list with one item moved to another position.
 *
 * `to` is read against the list as it stands before the move, which is what a reader means when
 * they drop a column "here". Taking the item out first would shift every later index by one and
 * make a rightward move land one place short — the off-by-one every reorder implementation meets
 * exactly once.
 *
 * @returns A new array; the one passed in is left alone.
 */
export function moveColumn<T>(items: readonly T[], from: number, to: number): T[] {
	const next = [...items];

	if (from < 0 || from >= next.length) {
		return next;
	}

	const target = Math.max(0, Math.min(next.length - 1, to));

	if (target === from) {
		return next;
	}

	const [moved] = next.splice(from, 1);

	next.splice(target, 0, moved);

	return next;
}
