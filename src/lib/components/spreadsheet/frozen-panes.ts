/**
 * Working out where frozen rows and columns sit.
 *
 * `position: sticky` pins an element at a distance from the edge, but it cannot work that
 * distance out for itself: the second frozen column has to sit exactly as far in as the first
 * one is wide, and CSS has no way to add up its siblings. So the widths are measured once after
 * a render and turned into offsets here.
 */

/**
 * The distance from the leading edge for each of the first `count` tracks.
 *
 * @param sizes The measured width or height of every track, in order.
 * @param count How many of them are frozen.
 * @returns One offset per frozen track; the first is always zero.
 */
export function frozenOffsets(sizes: readonly number[], count: number): number[] {
	const frozen = Math.max(0, Math.min(Math.trunc(count) || 0, sizes.length));
	const offsets: number[] = [];
	let running = 0;

	for (let index = 0; index < frozen; index++) {
		offsets.push(running);

		const size = sizes[index];

		// A track that could not be measured contributes nothing rather than turning every
		// offset after it into NaN, which would unpin the whole pane.
		running += Number.isFinite(size) ? Math.round(size) : 0;
	}

	return offsets;
}

/**
 * Whether a track is the last frozen one.
 *
 * That one carries the divider: a frozen pane needs a visible seam, or content scrolling
 * underneath it reads as content that belongs to it.
 */
export function isFrozenEdge(index: number, count: number): boolean {
	return count > 0 && index === count - 1;
}
