// ===========================================
// TranslationProvider.mjs — opaque provider contract
// ===========================================

/**
 * Stable boundary between release management and any translation backend.
 *
 * TODAY: {@link LocalDemoTranslationProvider}
 * FUTURE: swap in an i18xe-sync / i18x-backed provider. Do **not** invent
 * i18xe-sync APIs in this demo — the real project is still in the pipeline.
 *
 * Required shape:
 *   register(_sourceText) → string   // identity / catalog registration
 *   translate(_sourceText, _lid) → string
 * Optional:
 *   availableLids() → string[]
 *
 * @typedef {object} TranslationProvider
 * @property {(text: string) => string} register
 * @property {(text: string, lid: string) => string} translate
 * @property {() => string[]} [availableLids]
 */

/**
 * @param {unknown} _provider
 * @returns {asserts _provider is TranslationProvider}
 */
export function AssertTranslationProvider(_provider) {
	if (!_provider || typeof _provider !== 'object') {
		throw new Error('TranslationProvider must be an object.');
	}
	if (typeof _provider.register !== 'function') {
		throw new Error('TranslationProvider.register(text) is required.');
	}
	if (typeof _provider.translate !== 'function') {
		throw new Error('TranslationProvider.translate(text, lid) is required.');
	}
}
