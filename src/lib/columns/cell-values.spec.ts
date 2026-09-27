import { HubSpreadsheetColumn, HubSpreadsheetOption } from '../models/spreadsheet.types';
import { displayValue, parseForColumn } from './cell-values';

const options: HubSpreadsheetOption[] = [
	{ value: 'new', label: 'New' },
	{ value: 'done', label: 'Done' },
	{ value: 'held', label: 'On hold', disabled: true }
];

function column<T>(extra: Partial<HubSpreadsheetColumn<T>>): HubSpreadsheetColumn<T> {
	return { key: 'k', header: 'H', cell: () => ({ value: null }), ...extra } as HubSpreadsheetColumn<T>;
}

describe('displayValue', () => {
	it('shows text and numbers as they are', () => {
		expect(displayValue('Bolt', column({}))).toBe('Bolt');
		expect(displayValue(42, column({ kind: 'number' }))).toBe('42');
	});

	it('shows an empty cell as nothing at all', () => {
		expect(displayValue(null, column({}))).toBe('');
		expect(displayValue(null, column({ kind: 'select', options }))).toBe('');
	});

	it('shows the label of a chosen option, not the value that is stored', () => {
		expect(displayValue('done', column({ kind: 'select', options }))).toBe('Done');
	});

	it('shows a disabled option like any other, since old rows still hold those values', () => {
		expect(displayValue('held', column({ kind: 'select', options }))).toBe('On hold');
	});

	/**
	 * A value whose option was removed has to stay readable. Blanking it would look like data
	 * loss, and the reader would have no way to tell what the row used to say.
	 */
	it('falls back to the stored value when nothing on the list matches', () => {
		expect(displayValue('archived', column({ kind: 'select', options }))).toBe('archived');
	});

	it('shows a boolean as a mark, and as nothing when it is off', () => {
		expect(displayValue(1, column({ kind: 'boolean' }))).toBe('✓');
		expect(displayValue(0, column({ kind: 'boolean' }))).toBe('');
		expect(displayValue(null, column({ kind: 'boolean' }))).toBe('');
	});
});

describe('parseForColumn', () => {
	it('keeps text, and reads an empty string as an empty cell', () => {
		expect(parseForColumn('Bolt', column({}), ',')).toBe('Bolt');
		expect(parseForColumn('   ', column({}), ',')).toBeNull();
	});

	it('reads a number in the reader own convention', () => {
		expect(parseForColumn('1.234,5', column({ kind: 'number' }), ',')).toBe(1234.5);
		expect(parseForColumn('nope', column({ kind: 'number' }), ',')).toBeUndefined();
	});

	it('accepts a value that is on the list', () => {
		expect(parseForColumn('done', column({ kind: 'select', options }), ',')).toBe('done');
	});

	it('accepts a label too, which is what a paste from a spreadsheet carries', () => {
		expect(parseForColumn('On hold', column({ kind: 'select', options }), ',')).toBe('held');
	});

	it('refuses anything that is not on the list, rather than storing a value nobody offered', () => {
		expect(parseForColumn('archived', column({ kind: 'select', options }), ',')).toBeUndefined();
	});

	it('reads an empty select cell as empty', () => {
		expect(parseForColumn('', column({ kind: 'select', options }), ',')).toBeNull();
	});

	it('reads the usual ways of writing yes and no', () => {
		const boolean = column({ kind: 'boolean' });

		expect(parseForColumn('true', boolean, ',')).toBe(1);
		expect(parseForColumn('1', boolean, ',')).toBe(1);
		expect(parseForColumn('yes', boolean, ',')).toBe(1);
		expect(parseForColumn('sí', boolean, ',')).toBe(1);
		expect(parseForColumn('false', boolean, ',')).toBe(0);
		expect(parseForColumn('0', boolean, ',')).toBe(0);
		expect(parseForColumn('no', boolean, ',')).toBe(0);
		expect(parseForColumn('', boolean, ',')).toBeNull();
		expect(parseForColumn('perhaps', boolean, ',')).toBeUndefined();
	});

	it('keeps a date as the text it was written in, so no timezone can shift it', () => {
		expect(parseForColumn('2026-09-25', column({ kind: 'date' }), ',')).toBe('2026-09-25');
		expect(parseForColumn('', column({ kind: 'date' }), ',')).toBeNull();
	});
});
