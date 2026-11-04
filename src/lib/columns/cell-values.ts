import { parseDecimal } from '../clipboard/clipboard-table';
import {
	HubSpreadsheetAppend,
	HubSpreadsheetColumn,
	HubSpreadsheetOption,
	HubSpreadsheetValue
} from '../models/spreadsheet.types';

/**
 * Turning a stored value into what a cell shows, and turning what was typed back into a value.
 *
 * One place for both directions, because they have to agree: a cell that shows `On hold` must
 * accept `On hold` back, or pasting a column onto itself loses data.
 */

/** Written forms of yes and no, in the languages the library ships labels for. */
const AFFIRMATIVE = new Set(['1', 'true', 'yes', 'y', 'sí', 'si', 'oui', 'ja', 'да', 'はい', '是', 'نعم']);
const NEGATIVE = new Set(['0', 'false', 'no', 'n', 'non', 'nein', 'нет', 'いいえ', '否', 'لا']);

/** The option a stored value belongs to, or undefined when it belongs to none of them. */
export function optionFor<TRow>(
	value: HubSpreadsheetValue,
	column: HubSpreadsheetColumn<TRow>
): HubSpreadsheetOption | undefined {
	return column.options?.find((option) => option.value === value);
}

/**
 * What the cell shows for a value.
 *
 * A `select` value whose option has been removed is shown as the stored value rather than as
 * nothing: blanking it would read as data loss, and the reader would have no way to tell what the
 * row used to say.
 */
export function displayValue<TRow>(value: HubSpreadsheetValue, column: HubSpreadsheetColumn<TRow>): string {
	if (value === null || value === '') {
		return '';
	}

	switch (column.kind) {
		case 'select':
			return optionFor(value, column)?.label ?? String(value);
		case 'boolean':
			// A mark rather than the word: a column of them reads as a column, and it takes no
			// width worth arguing about.
			return isTruthy(value) ? '✓' : '';
		default:
			return String(value);
	}
}

/**
 * What a typed or pasted string is worth in a column.
 *
 * Three answers, as everywhere else here: the value, `null` for an empty cell, and `undefined`
 * for something this column cannot hold — which lets the caller refuse rather than store rubbish.
 */
export function parseForColumn<TRow>(
	text: string,
	column: HubSpreadsheetColumn<TRow>,
	decimalMark: ',' | '.'
): HubSpreadsheetValue | undefined {
	const trimmed = text.trim();

	switch (column.kind) {
		case 'number':
		case 'currency':
			return parseDecimal(text, decimalMark);

		case 'select': {
			if (trimmed === '') {
				return null;
			}

			// The stored value first, then the label — a paste from a spreadsheet carries what was
			// displayed, and a column pasted onto itself has to survive the round trip.
			const byValue = column.options?.find((option) => String(option.value) === trimmed);
			const byLabel = column.options?.find((option) => option.label === trimmed);
			const match = byValue ?? byLabel;

			// Nothing on the list means nothing this column may hold. Refusing is the whole point
			// of declaring a closed list in the first place.
			return match ? match.value : undefined;
		}

		case 'boolean': {
			if (trimmed === '') {
				return null;
			}

			const lowered = trimmed.toLowerCase();

			if (AFFIRMATIVE.has(lowered)) {
				return 1;
			}

			if (NEGATIVE.has(lowered)) {
				return 0;
			}

			return undefined;
		}

		case 'date':
			// Kept as the text it was written in. Turning it into a Date and back is what shifts a
			// date by a day for anyone east or west of whoever wrote the code.
			return trimmed === '' ? null : trimmed;

		default:
			return trimmed === '' ? null : text;
	}
}

/** Whether a stored value counts as yes. */
export function isTruthy(value: HubSpreadsheetValue): boolean {
	if (typeof value === 'number') {
		return value !== 0;
	}

	return typeof value === 'string' && AFFIRMATIVE.has(value.toLowerCase());
}

/**
 * What an appended value shows: its option's label, the raw value when the option is gone (the
 * same rule as a `select` column, so an old row stays readable), and nothing when it is empty.
 */
export function appendLabel<TRow>(value: HubSpreadsheetValue, append: HubSpreadsheetAppend<TRow>): string {
	if (value === null || value === '') {
		return '';
	}

	return append.options.find((option) => option.value === value)?.label ?? String(value);
}

/**
 * The appended value dressed as a column of its own.
 *
 * Owners already switch on `commit.column.key`; handing them a column-like ref keyed by the
 * append means they need no new code path for it.
 */
export function appendColumn<TRow>(column: HubSpreadsheetColumn<TRow>): HubSpreadsheetColumn<TRow> {
	const append = column.append as HubSpreadsheetAppend<TRow>;

	return {
		key: append.key,
		header: append.label,
		kind: 'select',
		options: append.options,
		cell: (row) => ({ value: append.cell(row).value, editable: append.cell(row).editable })
	};
}

/**
 * Splits a pasted text into its main part and the option it ends with.
 *
 * Case-insensitive and indifferent to the space (`10%`, `10 %`), matching either the label or the
 * stored value. A word-like token only counts when it starts a word, so `5 wh` is not `5` plus
 * `h`. Returns null when nothing on the list closes the text, which the caller reads as "bare value".
 */
export function splitAppend(
	text: string,
	options: readonly HubSpreadsheetOption[]
): { main: string; value: HubSpreadsheetValue } | null {
	const trimmed = text.trim();
	const lower = trimmed.toLocaleLowerCase();
	let best: { main: string; value: HubSpreadsheetValue; length: number } | null = null;

	for (const option of options) {
		for (const token of [option.label, String(option.value ?? '')]) {
			const needle = token.trim().toLocaleLowerCase();
			const head = trimmed.slice(0, trimmed.length - needle.length);

			if (!needle || !lower.endsWith(needle) || !head.trim() || (best && best.length >= needle.length)) {
				continue;
			}

			if (/^\p{L}/u.test(needle) && /\p{L}$/u.test(head)) {
				continue;
			}

			best = { main: head.trim(), value: option.value, length: needle.length };
		}
	}

	return best && { main: best.main, value: best.value };
}
