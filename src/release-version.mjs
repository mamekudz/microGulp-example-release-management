// ===========================================
// release-version.mjs — comparable version keys
// ===========================================

/**
 * Version helpers for RELEASES-style `{ main, minor, revision }` triples.
 *
 * Historical systems sometimes mapped versions to a FLOAT for "easy"
 * comparison (`major + minor/1000 + revision/1e6`). That idea is preserved
 * as {@link VersionToLegacyFloat} for documentation, but sorting and tests
 * use {@link CompareVersions} / {@link VersionToSortKey} so values like
 * `1.10.0` vs `1.2.0` stay correct. Never use `parseFloat("1.10.0")`.
 */

/**
 * @param {object|string|null|undefined} _value
 * @returns {{ main: number, minor: number, revision: number }}
 */
export function NormalizeVersionParts(_value) {
	if (_value && typeof _value === 'object') {
		return {
			main: _ToNonNegInt(_value.main),
			minor: _ToNonNegInt(_value.minor),
			revision: _ToNonNegInt(_value.revision),
		};
	}
	let text = String(_value ?? '').trim();
	let match = text.match(/^(\d+)\.(\d+)\.(\d+)/);
	if (!match) {
		throw new Error(`Invalid version: ${text || '(empty)'}`);
	}
	return {
		main: Number(match[1]),
		minor: Number(match[2]),
		revision: Number(match[3]),
	};
}

/**
 * @param {object|string} _value
 * @returns {string}
 */
export function FormatVersionString(_value) {
	let parts = NormalizeVersionParts(_value);
	return `${parts.main}.${parts.minor}.${parts.revision}`;
}

/**
 * Integer sort key — safe across practical release ranges.
 * @param {object|string} _value
 * @returns {number}
 */
export function VersionToSortKey(_value) {
	let parts = NormalizeVersionParts(_value);
	return parts.main * 1_000_000 + parts.minor * 1_000 + parts.revision;
}

/**
 * Historical FLOAT illustration only — do not use for product decisions.
 * Caps each component at three digits of fractional space.
 * @param {object|string} _value
 * @returns {number}
 */
export function VersionToLegacyFloat(_value) {
	let parts = NormalizeVersionParts(_value);
	return parts.main + parts.minor / 1_000 + parts.revision / 1_000_000;
}

/**
 * @param {object|string} _left
 * @param {object|string} _right
 * @returns {number} negative if left < right, 0 if equal, positive if left > right
 */
export function CompareVersions(_left, _right) {
	return VersionToSortKey(_left) - VersionToSortKey(_right);
}

/**
 * @param {number|string|null|undefined} _value
 * @returns {number}
 */
function _ToNonNegInt(_value) {
	let number = Number(_value);
	if (!Number.isFinite(number) || number < 0) return 0;
	return Math.floor(number);
}
