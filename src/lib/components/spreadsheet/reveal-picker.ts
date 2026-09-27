/**
 * Opens the list of a native select, or the calendar of a date field, as its cell opens.
 *
 * Without it the reader clicks a cell, gets an editor, and has to click a second time to see what
 * the column allows — two gestures for one decision.
 *
 * `showPicker` needs the click that opened the cell still to count as a gesture, and it is recent
 * enough that some browsers do not have it. Either way a refusal leaves the editor focused and the
 * list closed, which is where it stood before, so nothing has to be undone.
 *
 * Only for a list and a date. On a text field the same method opens the browser's own autofill
 * suggestions, which is not what the cell asked for.
 *
 * @returns whether the picker was asked to open.
 */
export function revealPicker(element: Element | null | undefined): boolean {
	const picker = element as (Element & { showPicker?: () => void }) | null | undefined;

	if (typeof picker?.showPicker !== 'function') {
		return false;
	}

	try {
		picker.showPicker();

		return true;
	} catch {
		return false;
	}
}
