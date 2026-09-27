/**
 * What to offer a reader who is in the middle of writing a formula.
 *
 * A formula names columns by an alias that is nowhere on screen — the header shows a title meant
 * for people, not the key the formula needs — so writing one from memory means knowing something
 * the sheet never showed. That is the actual problem: not that the language is hard, but that the
 * words are hidden.
 *
 * Kept as arithmetic over strings, with no DOM and no component, so the awkward parts — where the
 * word being typed starts, what counts as one — can be held still by a test.
 */

/** One thing the reader can put into the formula. */
export interface HubFormulaSuggestion {
	/** What to show. */
	readonly label: string;
	/** What it is, so the list can say so. */
	readonly kind: 'column' | 'function';
	/** What goes into the draft. */
	readonly insert: string;
	/** A word on what it does, for a function. */
	readonly hint?: string;
}

/** What the sheet knows that a formula might want. */
export interface HubFormulaVocabulary {
	/** The column aliases, in the order the columns are in. */
	readonly aliases: readonly string[];
	/** What each alias is called on screen, so the list can show both. */
	readonly titles?: Readonly<Record<string, string>>;
}

/** The functions the engine knows, with a word on each. */
export const HUB_FORMULA_FUNCTIONS: ReadonlyArray<{ name: string; hint: string }> = [
	{ name: 'SUM', hint: 'Adds numbers and whole columns' },
	{ name: 'AVERAGE', hint: 'The mean of what is there, gaps left out' },
	{ name: 'MIN', hint: 'The least of them' },
	{ name: 'MAX', hint: 'The most of them' },
	{ name: 'COUNT', hint: 'How many are numbers' },
	{ name: 'ROUND', hint: 'To a given number of places' },
	{ name: 'ABS', hint: 'Without its sign' },
	{ name: 'IF', hint: 'One answer or the other' },
	{ name: 'AND', hint: 'True when all of them are' },
	{ name: 'OR', hint: 'True when any of them is' },
	{ name: 'NOT', hint: 'The opposite' },
	{ name: 'CONCAT', hint: 'Joins text together' },
	{ name: 'LEN', hint: 'How long a piece of text is' }
];

/** Where the word being typed starts, and what it says so far. */
export interface HubFormulaFragment {
	/** Where in the draft it begins. */
	readonly start: number;
	/** What has been typed of it. */
	readonly text: string;
	/** Whether the reader is inside brackets, which is where a column belongs. */
	readonly inBrackets: boolean;
}

/**
 * The word the caret is in the middle of.
 *
 * Inside brackets it is a column being named — `[pri` — and everywhere else it is a function, or
 * the beginning of one. Everything before the last operator, bracket or space is settled and is
 * left alone.
 */
export function formulaFragment(draft: string, caret = draft.length): HubFormulaFragment {
	const upTo = draft.slice(0, caret);
	const opened = upTo.lastIndexOf('[');
	const closed = upTo.lastIndexOf(']');

	if (opened > closed) {
		return { start: opened + 1, text: upTo.slice(opened + 1), inBrackets: true };
	}

	const match = /[A-Za-z_][A-Za-z0-9_]*$/.exec(upTo);

	return match ? { start: match.index, text: match[0], inBrackets: false } : { start: caret, text: '', inBrackets: false };
}

/**
 * What to offer for a draft, in the order it should be shown.
 *
 * Columns first while inside brackets, functions first outside them, because that is what the
 * reader is asking for by having typed the bracket at all. An empty fragment offers everything:
 * somebody who has just typed `=` is exactly the person who needs the list most.
 *
 * @param draft - The formula as it stands, `=` and all.
 * @param vocabulary - The aliases the sheet has.
 * @param caret - Where the caret is; the end of the draft when not given.
 */
export function suggestFormula(
	draft: string,
	vocabulary: HubFormulaVocabulary,
	caret = draft.length
): readonly HubFormulaSuggestion[] {
	if (!draft.trimStart().startsWith('=')) {
		return [];
	}

	const fragment = formulaFragment(draft, caret);
	const needle = fragment.text.toLocaleLowerCase();
	const matches = (candidate: string) => !needle || candidate.toLocaleLowerCase().startsWith(needle);

	const columns: HubFormulaSuggestion[] = vocabulary.aliases
		.filter((alias) => matches(alias))
		.map((alias) => ({
			label: alias,
			kind: 'column' as const,
			// Inside brackets the brackets are already there; outside, they come with it.
			insert: fragment.inBrackets ? alias : `[${alias}]`,
			hint: vocabulary.titles?.[alias]
		}));

	const functions: HubFormulaSuggestion[] = fragment.inBrackets
		? []
		: HUB_FORMULA_FUNCTIONS.filter((entry) => matches(entry.name)).map((entry) => ({
				label: entry.name,
				kind: 'function' as const,
				insert: `${entry.name}(`,
				hint: entry.hint
			}));

	return fragment.inBrackets ? columns : [...functions, ...columns];
}

/**
 * The draft with a suggestion put in, and where the caret should end up.
 *
 * The caret matters more than it looks: dropped at the end of `SUM(` it carries straight on into
 * the brackets, and dropped after `[price]` it is ready for the operator. Leaving it where it was
 * makes the reader move it by hand every single time.
 */
export function applySuggestion(
	draft: string,
	suggestion: HubFormulaSuggestion,
	caret = draft.length
): { readonly draft: string; readonly caret: number } {
	const fragment = formulaFragment(draft, caret);
	const before = draft.slice(0, fragment.start);
	const after = draft.slice(caret);

	// A closing bracket the reader has already typed is not doubled.
	const trailing = fragment.inBrackets && after.startsWith(']') ? after.slice(1) : after;
	const insert = fragment.inBrackets ? `${suggestion.insert}]` : suggestion.insert;

	return { draft: before + insert + trailing, caret: before.length + insert.length };
}
