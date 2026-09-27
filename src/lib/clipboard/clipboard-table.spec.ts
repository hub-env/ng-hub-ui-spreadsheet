import { parseClipboardTable, parseDecimal, serialiseClipboardTable } from './clipboard-table';

describe('parseDecimal', () => {
	it('reads a plain number under either convention', () => {
		expect(parseDecimal('12.5', '.')).toBe(12.5);
		expect(parseDecimal('12,5', ',')).toBe(12.5);
	});

	it('strips the thousands separator that Excel pastes as display text', () => {
		expect(parseDecimal('1.234,56', ',')).toBe(1234.56);
		expect(parseDecimal('1,234.56', '.')).toBe(1234.56);
		expect(parseDecimal('1.234.567,89', ',')).toBe(1234567.89);
	});

	it('keeps the sign, in front or behind', () => {
		expect(parseDecimal('-12,5', ',')).toBe(-12.5);
		expect(parseDecimal('+3', ',')).toBe(3);
	});

	it('reads a percentage as its number, leaving the meaning to the caller', () => {
		expect(parseDecimal('21%', ',')).toBe(21);
	});

	it('ignores surrounding spaces, including the non-breaking one Excel likes', () => {
		expect(parseDecimal('  12,5  ', ',')).toBe(12.5);
		expect(parseDecimal('1 234,5', ',')).toBe(1234.5);
	});

	it('reports an empty cell as null, which is not a zero', () => {
		expect(parseDecimal('', ',')).toBeNull();
		expect(parseDecimal('   ', ',')).toBeNull();
	});

	it('refuses what is not a number, rather than guessing', () => {
		expect(parseDecimal('pendiente', ',')).toBeUndefined();
		expect(parseDecimal('12,5,5', ',')).toBeUndefined();
		expect(parseDecimal('--3', ',')).toBeUndefined();
	});
});

describe('parseClipboardTable · plain text', () => {
	it('splits on tabs and newlines', () => {
		const table = parseClipboardTable({ text: 'a\tb\nc\td' });

		expect(table.map((row) => row.map((cell) => cell.text))).toEqual([
			['a', 'b'],
			['c', 'd']
		]);
	});

	it('handles the CRLF that Excel writes on Windows', () => {
		const table = parseClipboardTable({ text: 'a\tb\r\nc\td\r\n' });

		expect(table.map((row) => row.map((cell) => cell.text))).toEqual([
			['a', 'b'],
			['c', 'd']
		]);
	});

	it('drops only the final newline, keeping a deliberately empty last row out of the way', () => {
		const table = parseClipboardTable({ text: 'a\nb\n' });

		expect(table).toHaveLength(2);
	});

	it('keeps a newline that lives inside a quoted cell', () => {
		const table = parseClipboardTable({ text: 'a\t"linea 1\nlinea 2"\tc' });

		expect(table[0].map((cell) => cell.text)).toEqual(['a', 'linea 1\nlinea 2', 'c']);
	});

	it('keeps a tab that lives inside a quoted cell', () => {
		const table = parseClipboardTable({ text: '"con\ttab"\tb' });

		expect(table[0].map((cell) => cell.text)).toEqual(['con\ttab', 'b']);
	});

	it('unescapes a doubled quote, which is how a quote travels', () => {
		const table = parseClipboardTable({ text: '"dice ""hola"""\tb' });

		expect(table[0].map((cell) => cell.text)).toEqual(['dice "hola"', 'b']);
	});

	it('leaves a quote alone when it is not wrapping the cell', () => {
		const table = parseClipboardTable({ text: '12" de pantalla\tb' });

		expect(table[0].map((cell) => cell.text)).toEqual(['12" de pantalla', 'b']);
	});

	it('yields nothing for an empty payload', () => {
		expect(parseClipboardTable({ text: '' })).toEqual([]);
		expect(parseClipboardTable({})).toEqual([]);
	});
});

describe('parseClipboardTable · the HTML flavour', () => {
	/**
	 * The plain-text flavour carries what the source displayed, formatted in its own locale. The
	 * HTML flavour is where the raw number travels, and it is the only way to read a figure back
	 * without guessing which convention wrote it.
	 */
	it('takes the raw number out of the attribute Excel writes, ignoring the formatted text', () => {
		const html = '<table><tr><td x:num="1234.56">1.234,56 €</td></tr></table>';
		const table = parseClipboardTable({ text: '1.234,56 €', html });

		expect(table[0][0].text).toBe('1.234,56 €');
		expect(table[0][0].raw).toBe(1234.56);
	});

	it('reads a number out of what Google Sheets writes', () => {
		const html = '<table><tr><td data-sheets-value=\'{"1":3,"3":42.5}\'>42,5</td></tr></table>';
		const table = parseClipboardTable({ text: '42,5', html });

		expect(table[0][0].raw).toBe(42.5);
	});

	it('leaves a text cell without a raw value rather than inventing one', () => {
		const html = '<table><tr><td>Tornillo M6</td><td x:num="3">3</td></tr></table>';
		const table = parseClipboardTable({ text: 'Tornillo M6\t3', html });

		expect(table[0][0].raw).toBeUndefined();
		expect(table[0][1].raw).toBe(3);
	});

	it('survives the wrapper Office puts around the fragment', () => {
		const html = `Version:1.0\nStartHTML:0000000105\n<html><body><!--StartFragment--><table><tr><td x:num="7">7</td></tr></table><!--EndFragment--></body></html>`;
		const table = parseClipboardTable({ text: '7', html });

		expect(table[0][0].raw).toBe(7);
	});

	it('falls back to the plain text when the HTML does not parse into a table', () => {
		const table = parseClipboardTable({ text: 'a\tb', html: '<p>ni tabla ni nada</p>' });

		expect(table[0].map((cell) => cell.text)).toEqual(['a', 'b']);
	});

	it('never executes what it is handed, and keeps only the text', () => {
		const html = '<table><tr><td><img src=x onerror="alert(1)">7</td></tr></table>';
		const table = parseClipboardTable({ text: '7', html });

		expect(table[0][0].text).toBe('7');
	});
});

describe('serialiseClipboardTable', () => {
	it('writes tab-separated rows, which is what a spreadsheet reads', () => {
		const { text } = serialiseClipboardTable([
			['a', 'b'],
			['c', 'd']
		]);

		expect(text).toBe('a\tb\nc\td');
	});

	it('writes an empty cell as nothing at all', () => {
		expect(serialiseClipboardTable([[null, 'b']]).text).toBe('\tb');
	});

	it('quotes a cell that carries a tab, a newline or a quote', () => {
		expect(serialiseClipboardTable([['con\ttab']]).text).toBe('"con\ttab"');
		expect(serialiseClipboardTable([['dos\nlineas']]).text).toBe('"dos\nlineas"');
		expect(serialiseClipboardTable([['dice "hola"']]).text).toBe('"dice ""hola"""');
	});

	it('writes numbers with a dot, so Excel reads them whatever the reader has configured', () => {
		expect(serialiseClipboardTable([[1234.56]]).text).toBe('1234.56');
	});

	it('also emits an HTML flavour carrying the raw numbers', () => {
		const { html } = serialiseClipboardTable([[1234.56, 'texto']]);

		expect(html).toContain('x:num="1234.56"');
		expect(html).toContain('<td>texto</td>');
	});

	it('escapes what would otherwise break the HTML flavour', () => {
		const { html } = serialiseClipboardTable([['<b>&amp;</b>']]);

		expect(html).toContain('&lt;b&gt;&amp;amp;&lt;/b&gt;');
		expect(html).not.toContain('<b>');
	});

	it('round-trips through its own two flavours', () => {
		const original = [
			[1234.56, 'con\ttab'],
			[null, 'dice "hola"']
		];
		const { text, html } = serialiseClipboardTable(original);
		const back = parseClipboardTable({ text, html });

		expect(back[0][0].raw).toBe(1234.56);
		expect(back[0][1].text).toBe('con\ttab');
		expect(back[1][0].text).toBe('');
		expect(back[1][1].text).toBe('dice "hola"');
	});
});
