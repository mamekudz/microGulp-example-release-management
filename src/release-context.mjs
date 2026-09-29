// ===========================================
// release-context.mjs — release info context normalization
// ===========================================

/**
 * Demo / compatibility marker between the release system and a translation
 * backend. Matches the historical µGulp RELEASES.json convention
 * (`<context="release info"/>`) so texts stay familiar in blog screenshots.
 *
 * This is NOT a claim about the final i18x / i18xe-sync API. Context
 * preparation lives behind {@link CreateReleaseTranslationAdapter} so a
 * future provider can replace or own this step without changing merge logic.
 */

export const RELEASE_INFO_CONTEXT = 'release info';
export const RELEASE_INFO_CONTEXT_TAG = `<context="${RELEASE_INFO_CONTEXT}"/>`;

/** Matches one or more release-info context tags (quoted attribute). */
const RELEASE_CONTEXT_RE = /<context\s*=\s*["']release info["']\s*\/>/gi;

/**
 * Removes every release-info context tag and collapses whitespace.
 * @param {string} _text
 * @returns {string}
 */
export function StripReleaseContext(_text) {
	return String(_text ?? '')
		.replace(RELEASE_CONTEXT_RE, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Ensures exactly one trailing release-info context tag.
 * Safe to call repeatedly — never stacks tags.
 * @param {string} _text
 * @returns {string}
 */
export function PrepareReleaseContext(_text) {
	let body = StripReleaseContext(_text);
	if (!body) return RELEASE_INFO_CONTEXT_TAG;
	return `${body}${RELEASE_INFO_CONTEXT_TAG}`;
}

/**
 * Stable fingerprint for duplicate detection (case-insensitive, no context).
 * @param {string} _text
 * @returns {string}
 */
export function FingerprintReleaseText(_text) {
	return StripReleaseContext(_text).toLowerCase();
}
