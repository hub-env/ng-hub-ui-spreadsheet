import { HubSpreadsheetValue } from '../models/spreadsheet.types';

/**
 * Working out what dragging a fill handle should produce.
 *
 * Two rules, in this order. If the source looks like a run — numbers with an even gap, or text
 * ending in a number — it is continued. Otherwise it is repeated. Guessing more than that is how
 * a fill handle becomes something people switch off: a pattern the reader did not intend is
 * worse than a plain repeat they can see coming.
 */

/** What a source run turned out to be. */
export type HubFillSeries =
	| { kind: 'number'; start: number; step: number }
	| { kind: 'text-number'; prefix: string; suffix: string; start: number; step: number; pad: number }
	| { kind: 'repeat'; values: readonly HubSpreadsheetValue[] };

/** Text ending in digits: `INV-007`, `Week 3`. The trailing digits are what gets counted. */
const TRAILING_NUMBER = /^(.*?)(\d+)(\D*)$/;

/**
 * Reads a source run and says how to continue it.
 *
 * A single value still counts as a run: dragging one number down produces 1, 2, 3, which is what
 * every spreadsheet does and what people expect.
 */
export function detectSeries(values: readonly HubSpreadsheetValue[]): HubFillSeries {
	const repeat: HubFillSeries = { kind: 'repeat', values };

	if (!values.length || values.some((value) => value === null || value === '')) {
		return repeat;
	}

	if (values.every((value) => typeof value === 'number')) {
		const numbers = values as readonly number[];
		const step = numbers.length === 1 ? 1 : numbers[1] - numbers[0];

		// Every gap has to match, or it is not a run the reader meant.
		for (let index = 2; index < numbers.length; index++) {
			if (round(numbers[index] - numbers[index - 1]) !== round(step)) {
				return repeat;
			}
		}

		return { kind: 'number', start: numbers[numbers.length - 1], step: round(step) };
	}

	if (values.every((value) => typeof value === 'string')) {
		return textSeries(values as readonly string[]) ?? repeat;
	}

	return repeat;
}

/**
 * The values a drag of `count` cells should write.
 *
 * @param source What the reader had selected when they took the handle.
 * @param count How many cells the drag covers.
 */
export function fillValues(source: readonly HubSpreadsheetValue[], count: number): HubSpreadsheetValue[] {
	if (count <= 0) {
		return [];
	}

	if (!source.length) {
		return Array.from({ length: count }, () => null);
	}

	const series = detectSeries(source);
	const out: HubSpreadsheetValue[] = [];

	for (let index = 0; index < count; index++) {
		switch (series.kind) {
			case 'number':
				out.push(round(series.start + series.step * (index + 1)));
				break;
			case 'text-number': {
				const next = series.start + series.step * (index + 1);

				out.push(`${series.prefix}${String(Math.abs(next)).padStart(series.pad, '0')}${series.suffix}`);
				break;
			}
			case 'repeat':
				out.push(series.values[index % series.values.length] ?? null);
				break;
		}
	}

	return out;
}

/** A run of text ending in numbers, or null when the pieces do not line up. */
function textSeries(values: readonly string[]): HubFillSeries | null {
	const parts = values.map((value) => TRAILING_NUMBER.exec(value));

	if (parts.some((part) => !part)) {
		return null;
	}

	const matches = parts as RegExpExecArray[];
	const prefix = matches[0][1];
	const suffix = matches[0][3];

	// Only a run that shares its wording is a run. `INV-1` and `REC-2` are two names, not a series.
	if (matches.some((match) => match[1] !== prefix || match[3] !== suffix)) {
		return null;
	}

	const numbers = matches.map((match) => Number(match[2]));
	const step = numbers.length === 1 ? 1 : numbers[1] - numbers[0];

	for (let index = 2; index < numbers.length; index++) {
		if (numbers[index] - numbers[index - 1] !== step) {
			return null;
		}
	}

	return {
		kind: 'text-number',
		prefix,
		suffix,
		start: numbers[numbers.length - 1],
		step,
		// The written width is kept, so a run of INV-008 does not become INV-10.
		pad: matches[0][2].length
	};
}

/**
 * Rounds away the drift of adding decimals repeatedly.
 *
 * `0.1 + 0.1 + 0.1` is not `0.3` in binary floating point, and a column of prices that reads
 * `0.30000000000000004` is a bug report waiting to happen.
 */
function round(value: number): number {
	return Number(value.toFixed(10));
}
