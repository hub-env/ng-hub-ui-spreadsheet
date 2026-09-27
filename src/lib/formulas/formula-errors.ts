import { HubFormulaFailure } from './formula.types';

/**
 * What a cell shows for a formula that could not be worked out.
 *
 * The spreadsheet spellings rather than sentences: they fit in a cell, they are the same in every
 * language, and anybody who has used a spreadsheet already knows what `#DIV/0!` means. They also
 * travel — a file exported with `#DIV/0!` in a cell says the same thing to whoever opens it in
 * Excel as it did here.
 */
export const FORMULA_ERROR_TEXT: Record<HubFormulaFailure['code'], string> = {
	syntax: '#SYNTAX!',
	name: '#NAME?',
	'divide-by-zero': '#DIV/0!',
	cycle: '#CYCLE!',
	type: '#VALUE!'
};

/** Every spelling, for telling an error apart from something a reader typed. */
export const FORMULA_ERRORS = Object.values(FORMULA_ERROR_TEXT);

/** What to show for a failure. */
export function formulaErrorText(failure: HubFormulaFailure): string {
	return FORMULA_ERROR_TEXT[failure.code];
}
