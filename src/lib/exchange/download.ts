/**
 * Handing the reader a file to save.
 *
 * Six lines that every host writes and two things they all get wrong: the object URL nobody
 * releases, and the anchor left in the document.
 *
 * @param filename - What to call it.
 * @param blob - What goes in it.
 */
export function downloadBlob(filename: string, blob: Blob): void {
	if (typeof document === 'undefined') {
		return;
	}

	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');

	anchor.href = url;
	anchor.download = filename;
	anchor.rel = 'noopener';
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
