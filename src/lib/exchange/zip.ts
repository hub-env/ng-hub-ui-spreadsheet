/**
 * A zip file, written by hand.
 *
 * An xlsx is a zip of XML, and this is the part of that sentence that usually drags a library in.
 * It does not have to: the entries are **stored** rather than deflated, which the format has
 * allowed since the beginning and every reader supports, and what is left is a checksum and three
 * fixed-shape records. A spreadsheet of a few thousand cells makes a file a couple of times bigger
 * than a compressed one would be — against a dependency of some hundreds of kilobytes that every
 * consumer of the library would pay for whether they export anything or not.
 */

/** The table CRC-32 needs, worked out once. */
const CRC_TABLE = (() => {
	const table = new Uint32Array(256);

	for (let index = 0; index < 256; index++) {
		let value = index;

		for (let bit = 0; bit < 8; bit++) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}

		table[index] = value >>> 0;
	}

	return table;
})();

/** The checksum a zip entry carries, which a reader uses to know the bytes arrived whole. */
export function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;

	for (const byte of bytes) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}

	return (crc ^ 0xffffffff) >>> 0;
}

/** One file inside the archive. */
export interface HubZipEntry {
	/** Its path inside the zip, with forward slashes. */
	readonly path: string;
	/** Its contents. */
	readonly data: string | Uint8Array;
}

/** Writes little-endian numbers into a buffer, which is all a zip header is. */
function writer(size: number) {
	const bytes = new Uint8Array(size);
	let at = 0;

	return {
		bytes,
		u16(value: number) {
			bytes[at++] = value & 0xff;
			bytes[at++] = (value >>> 8) & 0xff;
		},
		u32(value: number) {
			bytes[at++] = value & 0xff;
			bytes[at++] = (value >>> 8) & 0xff;
			bytes[at++] = (value >>> 16) & 0xff;
			bytes[at++] = (value >>> 24) & 0xff;
		},
		raw(source: Uint8Array) {
			bytes.set(source, at);
			at += source.length;
		}
	};
}

/**
 * Packs a set of files into a zip archive.
 *
 * Everything is stored rather than compressed, and dated to a fixed moment: a file that changes
 * every time it is written for no reason other than the clock is a file that cannot be compared
 * with the one from yesterday.
 *
 * @param entries - What goes in it.
 * @returns The bytes of the archive.
 */
export function zip(entries: readonly HubZipEntry[]): Uint8Array {
	const encoder = new TextEncoder();
	const parts: Uint8Array[] = [];
	const directory: Uint8Array[] = [];
	let offset = 0;

	// 1 January 1980, which is the earliest a zip can say and the only honest answer when the
	// contents did not come from a file with a date of its own.
	const time = 0;
	const date = 33;

	for (const entry of entries) {
		const name = encoder.encode(entry.path);
		const data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
		const checksum = crc32(data);

		const local = writer(30 + name.length);

		local.u32(0x04034b50);
		local.u16(20);
		local.u16(0);
		local.u16(0);
		local.u16(time);
		local.u16(date);
		local.u32(checksum);
		local.u32(data.length);
		local.u32(data.length);
		local.u16(name.length);
		local.u16(0);
		local.raw(name);

		parts.push(local.bytes, data);

		const central = writer(46 + name.length);

		central.u32(0x02014b50);
		central.u16(20);
		central.u16(20);
		central.u16(0);
		central.u16(0);
		central.u16(time);
		central.u16(date);
		central.u32(checksum);
		central.u32(data.length);
		central.u32(data.length);
		central.u16(name.length);
		central.u16(0);
		central.u16(0);
		central.u16(0);
		central.u16(0);
		central.u32(0);
		central.u32(offset);
		central.raw(name);

		directory.push(central.bytes);
		offset += local.bytes.length + data.length;
	}

	const directorySize = directory.reduce((total, record) => total + record.length, 0);
	const end = writer(22);

	end.u32(0x06054b50);
	end.u16(0);
	end.u16(0);
	end.u16(entries.length);
	end.u16(entries.length);
	end.u32(directorySize);
	end.u32(offset);
	end.u16(0);

	const all = [...parts, ...directory, end.bytes];
	const size = all.reduce((total, part) => total + part.length, 0);
	const archive = new Uint8Array(size);
	let at = 0;

	for (const part of all) {
		archive.set(part, at);
		at += part.length;
	}

	return archive;
}
