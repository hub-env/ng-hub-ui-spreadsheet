/**
 * The outline an axis makes, worked out from the level each cell of it carries.
 *
 * A level is how deep a row or a column sits: `1` inside one fold, `2` inside two, `0` or nothing
 * outside every fold. A run of neighbours that all sit at a level or deeper is a group, and it is
 * what a toggle folds away — the same shape Excel's grouping has, worked out from the levels rather
 * than stored as a tree.
 */
export interface HubOutlineGroup {
	/** Stable across a reorder: the level, and the identity of the run's first member. */
	readonly id: string;
	/** The level this group folds at; a member may sit deeper and still belong to it. */
	readonly level: number;
	/** First member, as an index into the axis. */
	readonly start: number;
	/** Last member, inclusive. */
	readonly end: number;
}

/**
 * Every group an axis makes, deepest level last.
 *
 * @param levels The level of each member; `0` or a hole outside every fold.
 * @param identify Names a member for the group's id, usually its stable key.
 * @returns One group per run, at each level from 1 to the deepest the axis carries.
 */
export function outlineGroups(levels: readonly number[], identify: (index: number) => string): readonly HubOutlineGroup[] {
	const deepest = levels.reduce((deepest, level) => Math.max(deepest, level || 0), 0);
	const groups: HubOutlineGroup[] = [];

	for (let level = 1; level <= deepest; level++) {
		let start = -1;

		for (let index = 0; index <= levels.length; index++) {
			const inside = index < levels.length && (levels[index] || 0) >= level;

			if (inside && start === -1) {
				start = index;
			}

			if (!inside && start !== -1) {
				groups.push({ id: `${level}:${identify(start)}`, level, start, end: index - 1 });
				start = -1;
			}
		}
	}

	return groups;
}

/**
 * The members a set of folded groups takes out of the axis.
 *
 * A member is hidden when any group that encloses it — one whose level is no deeper than its own
 * and whose run contains it — is folded. Folding an outer group therefore takes its inner ones with
 * it, which is what folding a level in Excel does.
 *
 * @param levels The level of each member.
 * @param groups Every group the axis makes, as {@link outlineGroups} returns them.
 * @param collapsed The ids of the folded groups.
 * @returns The indices not to draw, in order.
 */
export function collapsedMembers(
	levels: readonly number[],
	groups: readonly HubOutlineGroup[],
	collapsed: readonly string[]
): readonly number[] {
	const folded = new Set(collapsed);
	const hidden = new Set<number>();

	for (const group of groups) {
		if (!folded.has(group.id)) {
			continue;
		}

		for (let index = group.start; index <= group.end; index++) {
			if ((levels[index] || 0) >= group.level) {
				hidden.add(index);
			}
		}
	}

	return [...hidden].sort((a, b) => a - b);
}
