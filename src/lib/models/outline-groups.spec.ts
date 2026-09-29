import { collapsedMembers, outlineGroups } from './outline-groups';

/**
 * The outline an axis makes, and what folding a group of it takes out.
 *
 * Worked off levels alone — `1` inside one fold, `2` inside two, `0` outside every fold — so the
 * two tests here are the whole of the rule the sheet folds by.
 */
describe('outlineGroups', () => {
	const identify = (index: number) => `c${index}`;

	it('makes a group per run, at each level, and nothing when nothing is nested', () => {
		expect(outlineGroups([0, 0, 0], identify)).toEqual([]);
		expect(outlineGroups([0, 1, 1, 0], identify)).toEqual([{ id: '1:c1', level: 1, start: 1, end: 2 }]);
	});

	it('makes a group at every level a member reaches, so an outer fold takes its inner ones', () => {
		expect(outlineGroups([0, 1, 2, 1, 0], identify)).toEqual([
			{ id: '1:c1', level: 1, start: 1, end: 3 },
			{ id: '2:c2', level: 2, start: 2, end: 2 }
		]);
	});

	it('splits a run where the level drops and starts a new one where it rises', () => {
		expect(outlineGroups([1, 1, 0, 1, 0, 1], identify)).toEqual([
			{ id: '1:c0', level: 1, start: 0, end: 1 },
			{ id: '1:c3', level: 1, start: 3, end: 3 },
			{ id: '1:c5', level: 1, start: 5, end: 5 }
		]);
	});
});

describe('collapsedMembers', () => {
	const identify = (index: number) => `c${index}`;

	it('takes out the members of a folded group and leaves the rest', () => {
		const levels = [0, 1, 1, 0];
		const groups = outlineGroups(levels, identify);

		expect(collapsedMembers(levels, groups, [])).toEqual([]);
		expect(collapsedMembers(levels, groups, ['1:c1'])).toEqual([1, 2]);
	});

	it('takes an inner group with the outer one that encloses it', () => {
		const levels = [0, 1, 2, 1, 0];
		const groups = outlineGroups(levels, identify);

		expect(collapsedMembers(levels, groups, ['1:c1'])).toEqual([1, 2, 3]);
		expect(collapsedMembers(levels, groups, ['2:c2'])).toEqual([2]);
	});

	it('reads a level as a depth, so a member deeper than the fold still goes', () => {
		const levels = [0, 2, 2, 0];
		const groups = outlineGroups(levels, identify);

		// The run at level 1 covers both members even though neither sits at 1, and the run at
		// level 2 is the same pair again.
		expect(groups).toEqual([
			{ id: '1:c1', level: 1, start: 1, end: 2 },
			{ id: '2:c1', level: 2, start: 1, end: 2 }
		]);
		expect(collapsedMembers(levels, groups, ['1:c1'])).toEqual([1, 2]);
	});
});
