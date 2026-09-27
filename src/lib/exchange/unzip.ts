/**
 * Reading a zip archive, which is what an xlsx is.
 *
 * The writing side got away without compressing anything. Reading cannot: a workbook that came out
 * of Excel has every part deflated, and refusing those would mean refusing every real file. What
 * makes it possible without a dependency is that the platform already has the decompressor —
 * `DecompressionStream`, in every browser since 2023 and in Node since 18 — so all that is left is
 * the bookkeeping: find the directory at the end of the file, and for each entry work out where its
 * bytes start.
 *
 * Only the two storage methods that exist in practice are understood, stored and deflated. An
 * entry compressed any other way is left out rather than guessed at, and the caller sees a part it
 * asked for missing instead of a page of nonsense.
 */

/** Where a reader looks for the directory: the last record in the file. */
const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;

/** Reads little-endian numbers, which is the only way a zip states a length. */
function reader(bytes: Uint8Array) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	return {
		u16: (at: number) => view.getUint16(at, true),
		u32: (at: number) => view.getUint32(at, true)
	};
}

/**
 * Undoes a deflated entry, with the decompressor the platform already has.
 *
 * Written against the stream reader directly rather than through `Blob` or `Response`, which are
 * the shorter spellings and are not there everywhere this runs.
 */
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
	const stream = new DecompressionStream('deflate-raw');
	const writer = stream.writable.getWriter();

	// The cast is TypeScript's business, not the runtime's: a `Uint8Array` may sit on a shared
	// buffer as far as the types are concerned, and a stream writer will not say so.
	void writer.write(bytes as unknown as BufferSource).then(() => writer.close());

	const reader = stream.readable.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;

	for (;;) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		chunks.push(value);
		size += value.length;
	}

	const whole = new Uint8Array(size);
	let at = 0;

	for (const chunk of chunks) {
		whole.set(chunk, at);
		at += chunk.length;
	}

	return whole;
}

/**
 * Takes an archive apart.
 *
 * @param bytes - The whole file.
 * @returns Each entry's contents, by its path inside the archive.
 * @throws When the file is not a zip at all, which for an xlsx means it is not a workbook.
 */
export async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
	const { u16, u32 } = reader(bytes);
	let end = -1;

	// Backwards from the end, because the record that says where everything is may be followed by
	// a comment of any length up to 64k.
	for (let at = bytes.length - 22; at >= 0 && at >= bytes.length - 22 - 0xffff; at--) {
		if (u32(at) === END_OF_DIRECTORY) {
			end = at;
			break;
		}
	}

	if (end < 0) {
		throw new Error('Not a zip archive: no end-of-directory record.');
	}

	const count = u16(end + 10);
	const files = new Map<string, Uint8Array>();
	let at = u32(end + 16);

	for (let index = 0; index < count && u32(at) === DIRECTORY_ENTRY; index++) {
		const method = u16(at + 10);
		const compressed = u32(at + 20);
		const nameLength = u16(at + 28);
		const extraLength = u16(at + 30);
		const commentLength = u16(at + 32);
		const localAt = u32(at + 42);
		const path = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));

		// The local header repeats the name and carries extra fields of its own length, so where
		// the data starts can only be read there — not worked out from the directory entry.
		const localNameLength = u16(localAt + 26);
		const localExtraLength = u16(localAt + 28);
		const from = localAt + 30 + localNameLength + localExtraLength;
		const raw = bytes.subarray(from, from + compressed);

		if (method === 0) {
			files.set(path, raw);
		} else if (method === 8) {
			files.set(path, await inflate(raw));
		}

		at += 46 + nameLength + extraLength + commentLength;
	}

	return files;
}
