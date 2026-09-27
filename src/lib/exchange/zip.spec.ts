import { describe, expect, it } from 'vitest';
import { crc32, zip } from './zip';

describe('crc32', () => {
	it('matches the checksum every other implementation gives', () => {
		// The value zlib gives for the same bytes. A checksum that only agrees with itself is
		// worthless: it is the reader on the other side that has to recognise it.
		expect(crc32(new TextEncoder().encode('hello'))).toBe(907060870);
	});

	it('is zero for nothing at all', () => {
		expect(crc32(new Uint8Array())).toBe(0);
	});
});

describe('zip', () => {
	const archive = zip([
		{ path: 'a.txt', data: 'first' },
		{ path: 'folder/b.xml', data: '<x/>' }
	]);

	it('starts with a local file header', () => {
		expect(Array.from(archive.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
	});

	it('ends with the end-of-directory record, counting every entry', () => {
		const end = archive.slice(-22);

		expect(Array.from(end.slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06]);
		expect(end[8] + (end[9] << 8)).toBe(2);
		expect(end[10] + (end[11] << 8)).toBe(2);
	});

	it(`carries each entry's contents and its name`, () => {
		const text = new TextDecoder().decode(archive);

		expect(text).toContain('a.txt');
		expect(text).toContain('first');
		expect(text).toContain('folder/b.xml');
		expect(text).toContain('<x/>');
	});

	it('writes nothing but the end record for no entries', () => {
		expect(zip([]).length).toBe(22);
	});
});
