import { frozenOffsets, isFrozenEdge } from './frozen-panes';

describe('frozenOffsets', () => {
	it('starts the first frozen one at the edge and stacks the rest behind it', () => {
		expect(frozenOffsets([100, 80, 120, 60], 3)).toEqual([0, 100, 180]);
	});

	it('gives nothing when nothing is frozen', () => {
		expect(frozenOffsets([100, 80], 0)).toEqual([]);
	});

	it('freezes only one when only one is asked for', () => {
		expect(frozenOffsets([100, 80], 1)).toEqual([0]);
	});

	it('never freezes more than there are, which is what a shrinking sheet leaves behind', () => {
		expect(frozenOffsets([100, 80], 9)).toEqual([0, 100]);
	});

	it('treats a width it could not measure as zero rather than poisoning the whole run', () => {
		expect(frozenOffsets([100, Number.NaN, 50], 3)).toEqual([0, 100, 100]);
	});

	it('rounds to whole pixels, since a fraction leaves a hairline of content showing through', () => {
		expect(frozenOffsets([100.4, 80.3], 2)).toEqual([0, 100]);
	});

	it('copes with a negative or absurd count instead of throwing', () => {
		expect(frozenOffsets([100, 80], -2)).toEqual([]);
	});
});

describe('isFrozenEdge', () => {
	it('marks the last frozen one, which is where the dividing line goes', () => {
		expect(isFrozenEdge(0, 2)).toBe(false);
		expect(isFrozenEdge(1, 2)).toBe(true);
		expect(isFrozenEdge(2, 2)).toBe(false);
	});

	it('marks nothing when nothing is frozen', () => {
		expect(isFrozenEdge(0, 0)).toBe(false);
	});
});
