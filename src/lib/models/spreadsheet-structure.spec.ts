import { danglingColumnKeys, isStructureAllowed, nextColumnKey, resolveInsertIndex } from './spreadsheet-structure';
import { HubSpreadsheetColumn } from './spreadsheet.types';

const columns: HubSpreadsheetColumn<unknown>[] = [
	{ key: 'producto', header: 'Producto', cell: () => ({ value: null }) },
	{ key: 'unidades', header: 'Unidades', cell: () => ({ value: null }) },
	{ key: 'precio', header: 'Precio', cell: () => ({ value: null }) }
];

describe('isStructureAllowed', () => {
	it('honours a plain yes or no', () => {
		expect(isStructureAllowed(true, 'x', 0)).toBe(true);
		expect(isStructureAllowed(false, 'x', 0)).toBe(false);
	});

	it('refuses by default, so a sheet never gains a mutation nobody asked for', () => {
		expect(isStructureAllowed(undefined, 'x', 0)).toBe(false);
	});

	it('asks the predicate when one is given, handing it the subject and its index', () => {
		const onlyAfterTheFirst = (_subject: string, index: number) => index > 0;

		expect(isStructureAllowed(onlyAfterTheFirst, 'x', 0)).toBe(false);
		expect(isStructureAllowed(onlyAfterTheFirst, 'x', 2)).toBe(true);
	});

	it('treats a throwing predicate as a refusal rather than letting it escape', () => {
		const broken = () => {
			throw new Error('boom');
		};

		expect(isStructureAllowed(broken, 'x', 0)).toBe(false);
	});
});

describe('resolveInsertIndex', () => {
	it('inserts before or after the reference row', () => {
		expect(resolveInsertIndex(2, 'before', 5)).toBe(2);
		expect(resolveInsertIndex(2, 'after', 5)).toBe(3);
	});

	it('allows appending at the very end', () => {
		expect(resolveInsertIndex(4, 'after', 5)).toBe(5);
	});

	it('clamps a reference that points outside the sheet', () => {
		expect(resolveInsertIndex(99, 'after', 5)).toBe(5);
		expect(resolveInsertIndex(-3, 'before', 5)).toBe(0);
	});

	it('works on an empty sheet, where the only place is the start', () => {
		expect(resolveInsertIndex(0, 'before', 0)).toBe(0);
		expect(resolveInsertIndex(0, 'after', 0)).toBe(0);
	});
});

describe('nextColumnKey', () => {
	it('starts at one when nothing is taken', () => {
		expect(nextColumnKey([])).toBe('col-1');
	});

	it('skips what is already in use', () => {
		expect(nextColumnKey(['col-1', 'col-2'])).toBe('col-3');
	});

	it('ignores aliases that do not follow the pattern', () => {
		expect(nextColumnKey(['producto', 'unidades', 'precio'])).toBe('col-1');
	});

	/**
	 * The rule that matters. A deleted column's alias dies with it: if `col-2` is retired and a
	 * new column reuses the name, everything that referenced the old one silently points at the
	 * new one instead, and nobody finds out until the numbers are wrong.
	 */
	it('never reuses the alias of a column that was deleted', () => {
		const live = ['col-1', 'col-3'];
		const retired = ['col-2'];

		expect(nextColumnKey([...live, ...retired])).toBe('col-4');
	});

	it('keeps counting past a gap rather than filling it', () => {
		expect(nextColumnKey(['col-1', 'col-7'])).toBe('col-8');
	});

	it('takes a prefix of its own, for a sheet that wants its columns named its way', () => {
		expect(nextColumnKey(['mes-1'], 'mes')).toBe('mes-2');
		expect(nextColumnKey([], 'mes')).toBe('mes-1');
	});

	it('counts a prefix separately from another', () => {
		expect(nextColumnKey(['col-5'], 'mes')).toBe('mes-1');
	});
});

describe('danglingColumnKeys', () => {
	it('says nothing when every reference still resolves', () => {
		expect(danglingColumnKeys(['producto', 'precio'], columns)).toEqual([]);
	});

	it('names what points at a column that is no longer there', () => {
		expect(danglingColumnKeys(['producto', 'descuento'], columns)).toEqual(['descuento']);
	});

	it('names each broken reference once, however often it is repeated', () => {
		expect(danglingColumnKeys(['iva', 'iva', 'descuento', 'iva'], columns)).toEqual(['iva', 'descuento']);
	});

	it('reports everything as broken when the sheet has no columns left', () => {
		expect(danglingColumnKeys(['producto'], [])).toEqual(['producto']);
	});
});
