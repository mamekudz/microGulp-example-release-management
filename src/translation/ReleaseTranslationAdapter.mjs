// ===========================================
// ReleaseTranslationAdapter.mjs — release ↔ provider boundary
// ===========================================

import { AssertTranslationProvider } from './TranslationProvider.mjs';
import { PrepareReleaseContext, StripReleaseContext } from '../release-context.mjs';

/**
 * Release code talks only to this adapter. Swap the underlying
 * TranslationProvider later (LocalDemo → i18xe-sync / i18x) without touching
 * merge or history rendering call sites.
 *
 * @param {import('./TranslationProvider.mjs').TranslationProvider} _provider
 */
export function CreateReleaseTranslationAdapter(_provider) {
	AssertTranslationProvider(_provider);

	return {
		/**
		 * Normalize / attach release context (demo format today).
		 * @param {string} _text
		 */
		prepareReleaseContext(_text) {
			return PrepareReleaseContext(_text);
		},

		/**
		 * Strip context for fingerprints / comparisons.
		 * @param {string} _text
		 */
		stripReleaseContext(_text) {
			return StripReleaseContext(_text);
		},

		/**
		 * Register a release note with the opaque backend.
		 * @param {string} _text
		 * @returns {string} canonical source key
		 */
		registerReleaseText(_text) {
			return _provider.register(PrepareReleaseContext(_text));
		},

		/**
		 * Translate a release note for display.
		 * @param {string} _text
		 * @param {string} _lid
		 * @returns {string}
		 */
		translateReleaseText(_text, _lid) {
			return _provider.translate(PrepareReleaseContext(_text), _lid);
		},

		/**
		 * @returns {string[]}
		 */
		availableLids() {
			if (typeof _provider.availableLids === 'function') {
				return _provider.availableLids();
			}
			return ['en-US'];
		},
	};
}
