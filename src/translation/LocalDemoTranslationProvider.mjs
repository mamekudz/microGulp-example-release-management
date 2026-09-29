// ===========================================
// LocalDemoTranslationProvider.mjs — minimal blog demo backend
// ===========================================

import { AssertTranslationProvider } from './TranslationProvider.mjs';
import { PrepareReleaseContext, StripReleaseContext } from '../release-context.mjs';

/**
 * Tiny in-memory dictionary for the blog demo (en-US source → de-DE).
 * Not a general i18n framework — only enough to show language switching.
 */
export class LocalDemoTranslationProvider {
	/**
	 * @param {Record<string, Record<string, string>>} [_dictionaries] lid → { source → translation }
	 * @param {string} [_defaultLid]
	 */
	constructor(_dictionaries = {}, _defaultLid = 'en-US') {
		this._dictionaries = _dictionaries;
		this._defaultLid = _defaultLid;
		this._registered = new Set();
	}

	/** @returns {string[]} */
	availableLids() {
		return Object.keys(this._dictionaries);
	}

	/**
	 * @param {string} _sourceText English source (with or without context tag)
	 * @returns {string} prepared source key (with exactly one context tag)
	 */
	register(_sourceText) {
		let key = PrepareReleaseContext(_sourceText);
		this._registered.add(key);
		return key;
	}

	/**
	 * @param {string} _sourceText
	 * @param {string} [_lid]
	 * @returns {string} plain localized text (context tags stripped for display)
	 */
	translate(_sourceText, _lid) {
		let lid = _lid || this._defaultLid;
		let key = PrepareReleaseContext(_sourceText);
		let body = StripReleaseContext(key);
		if (lid === 'en-US' || lid === 'en') return body;
		let table = this._dictionaries[lid] ?? {};
		let hit = table[key] ?? table[body] ?? table[StripReleaseContext(_sourceText)];
		return hit != null ? String(hit) : body;
	}
}

/**
 * @param {Record<string, Record<string, string>>} _dictionaries
 * @returns {LocalDemoTranslationProvider}
 */
export function CreateLocalDemoTranslationProvider(_dictionaries) {
	let provider = new LocalDemoTranslationProvider(_dictionaries);
	AssertTranslationProvider(provider);
	return provider;
}
