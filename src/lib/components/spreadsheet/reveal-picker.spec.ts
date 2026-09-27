import { describe, expect, it, vi } from 'vitest';
import { revealPicker } from './reveal-picker';

describe('revealPicker', () => {
	it('opens the picker of an element that has one', () => {
		const showPicker = vi.fn();
		const element = Object.assign(document.createElement('select'), { showPicker });

		expect(revealPicker(element)).toBe(true);
		expect(showPicker).toHaveBeenCalledOnce();
	});

	it('says no when the browser has no such method, rather than throwing', () => {
		expect(revealPicker(document.createElement('select'))).toBe(false);
	});

	it('says no when the browser refuses for want of a gesture', () => {
		const element = Object.assign(document.createElement('input'), {
			showPicker: () => {
				throw new DOMException('NotAllowedError');
			}
		});

		expect(revealPicker(element)).toBe(false);
	});

	it('has nothing to open when there is no element', () => {
		expect(revealPicker(null)).toBe(false);
	});
});
