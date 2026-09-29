// ===========================================
// release-merge.mjs — developer notes → RELEASES.json
// ===========================================

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { FingerprintReleaseText, PrepareReleaseContext, StripReleaseContext } from './release-context.mjs';
import { CompareVersions, FormatVersionString, NormalizeVersionParts } from './release-version.mjs';

export const DEFAULT_MAX_AGE_DAYS = 30;

/**
 * @typedef {object} ReleaseEntry
 * @property {number} main
 * @property {number} minor
 * @property {number} revision
 * @property {string} date
 * @property {boolean} [beta]
 * @property {string[]} info
 * @property {string} [author]
 */

/**
 * @typedef {object} MergeSummary
 * @property {number} scanned
 * @property {number} merged
 * @property {number} duplicates
 * @property {number} expired
 * @property {number} invalid
 * @property {string[]} authors
 * @property {ReleaseEntry[]} releases
 * @property {object[]} accepted
 * @property {object[]} skipped
 */

/**
 * Parse RELEASES-style date strings (`YYYY-MM-DD` or `YYYY-MM-DD HH:mm`).
 * @param {string} _dateText
 * @returns {Date|null}
 */
export function ParseReleaseDate(_dateText) {
	let text = String(_dateText ?? '').trim();
	let match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
	if (!match) return null;
	let iso = `${match[1]}-${match[2]}-${match[3]}T${match[4] ?? '00'}:${match[5] ?? '00'}:${match[6] ?? '00'}`;
	let date = new Date(iso);
	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @param {Date} _now
 * @param {Date} _date
 * @param {number} [_maxAgeDays]
 * @returns {boolean}
 */
export function IsWithinMaxAge(_now, _date, _maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
	let maxMs = Math.max(0, Number(_maxAgeDays) || 0) * 86_400_000;
	return (_now.getTime() - _date.getTime()) <= maxMs;
}

/**
 * @param {string} _dir
 * @returns {{ author: string, path: string, contributions: ReleaseEntry[] }[]}
 */
export function LoadDeveloperReleaseFiles(_dir) {
	if (!existsSync(_dir)) return [];
	let files = readdirSync(_dir)
		.filter((_name) => _name.toLowerCase().endsWith('.json'))
		.sort((_a, _b) => _a.localeCompare(_b));
	let out = [];
	for (let name of files) {
		let path = join(_dir, name);
		let raw = JSON.parse(readFileSync(path, 'utf8'));
		let contributions = _NormalizeContributions(raw);
		out.push({
			author: String(raw.author || basename(name, '.json')),
			path,
			contributions,
		});
	}
	return out;
}

/**
 * @param {string} _releasesPath
 * @returns {{ releases: ReleaseEntry[] }}
 */
export function LoadCentralReleases(_releasesPath) {
	if (!existsSync(_releasesPath)) return { releases: [] };
	let raw = JSON.parse(readFileSync(_releasesPath, 'utf8'));
	let releases = Array.isArray(raw.releases) ? raw.releases.map(_NormalizeReleaseEntry).filter(Boolean) : [];
	return { releases };
}

/**
 * Build the set of info fingerprints already present in central RELEASES.json.
 * @param {ReleaseEntry[]} _releases
 * @returns {Set<string>}
 */
export function CollectExistingInfoFingerprints(_releases) {
	let set = new Set();
	for (let release of _releases ?? []) {
		let version = FormatVersionString(release);
		for (let line of release.info ?? []) {
			set.add(_InfoKey(version, line));
		}
	}
	return set;
}

/**
 * Merge developer contributions into a central RELEASES document.
 * Idempotent: re-running with the same inputs does not duplicate info lines.
 *
 * @param {object} _options
 * @param {string} _options.developerDir
 * @param {string} _options.releasesPath
 * @param {Date|string|number} [_options.now]
 * @param {number} [_options.maxAgeDays]
 * @param {boolean} [_options.write=true]
 * @returns {MergeSummary}
 */
export function MergeDeveloperReleases(_options) {
	let now = _ResolveNow(_options.now);
	let maxAgeDays = _options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
	let central = LoadCentralReleases(_options.releasesPath);
	let releases = central.releases.map((_entry) => ({
		..._entry,
		info: [...(_entry.info ?? [])],
	}));
	let fingerprints = CollectExistingInfoFingerprints(releases);
	let byVersion = new Map();
	for (let release of releases) {
		byVersion.set(FormatVersionString(release), release);
	}

	let scanned = 0;
	let merged = 0;
	let duplicates = 0;
	let expired = 0;
	let invalid = 0;
	let authors = new Set();
	let accepted = [];
	let skipped = [];

	for (let file of LoadDeveloperReleaseFiles(_options.developerDir)) {
		authors.add(file.author);
		for (let contribution of file.contributions) {
			scanned += 1;
			let date = ParseReleaseDate(contribution.date);
			if (!date) {
				invalid += 1;
				skipped.push({ reason: 'invalid-date', author: file.author, contribution });
				continue;
			}
			if (!IsWithinMaxAge(now, date, maxAgeDays)) {
				expired += 1;
				skipped.push({ reason: 'expired', author: file.author, contribution, ageDays: _AgeDays(now, date) });
				continue;
			}

			let version = FormatVersionString(contribution);
			let preparedInfo = (contribution.info ?? []).map((_line) => PrepareReleaseContext(_line));
			let newLines = [];
			for (let line of preparedInfo) {
				let key = _InfoKey(version, line);
				if (fingerprints.has(key)) {
					duplicates += 1;
					skipped.push({ reason: 'duplicate', author: file.author, version, text: StripReleaseContext(line) });
					continue;
				}
				fingerprints.add(key);
				newLines.push(line);
			}
			if (!newLines.length) continue;

			let target = byVersion.get(version);
			if (!target) {
				target = {
					main: contribution.main,
					minor: contribution.minor,
					revision: contribution.revision,
					date: contribution.date,
					beta: contribution.beta === true,
					info: [],
				};
				releases.push(target);
				byVersion.set(version, target);
			} else if (ParseReleaseDate(contribution.date)
				&& (!ParseReleaseDate(target.date)
					|| ParseReleaseDate(contribution.date) > ParseReleaseDate(target.date))) {
				// Keep the newest contribution date on the version block.
				target.date = contribution.date;
			}
			if (contribution.beta === true) target.beta = true;
			target.info.push(...newLines);
			merged += newLines.length;
			accepted.push({
				author: file.author,
				version,
				date: contribution.date,
				lines: newLines.map(StripReleaseContext),
			});
		}
	}

	releases.sort((_a, _b) => {
		let byVersionCmp = CompareVersions(_b, _a);
		if (byVersionCmp !== 0) return byVersionCmp;
		let dateA = ParseReleaseDate(_a.date)?.getTime() ?? 0;
		let dateB = ParseReleaseDate(_b.date)?.getTime() ?? 0;
		return dateB - dateA;
	});

	if (_options.write !== false) {
		mkdirSync(join(_options.releasesPath, '..'), { recursive: true });
		writeFileSync(_options.releasesPath, `${JSON.stringify({ releases }, null, '\t')}\n`, 'utf8');
	}

	return {
		scanned,
		merged,
		duplicates,
		expired,
		invalid,
		authors: [...authors].sort(),
		releases,
		accepted,
		skipped,
	};
}

/**
 * @param {unknown} _raw
 * @returns {ReleaseEntry[]}
 */
function _NormalizeContributions(_raw) {
	let list = Array.isArray(_raw?.contributions)
		? _raw.contributions
		: Array.isArray(_raw?.releases)
			? _raw.releases
			: Array.isArray(_raw)
				? _raw
				: [];
	return list.map(_NormalizeReleaseEntry).filter(Boolean);
}

/**
 * @param {unknown} _raw
 * @returns {ReleaseEntry|null}
 */
function _NormalizeReleaseEntry(_raw) {
	if (!_raw || typeof _raw !== 'object') return null;
	let parts = NormalizeVersionParts(_raw);
	let info = Array.isArray(_raw.info)
		? _raw.info.map((_line) => String(_line ?? '')).filter(Boolean)
		: typeof _raw.text === 'string'
			? [String(_raw.text)]
			: [];
	if (!info.length) return null;
	return {
		main: parts.main,
		minor: parts.minor,
		revision: parts.revision,
		date: String(_raw.date ?? ''),
		beta: _raw.beta === true,
		info,
		author: _raw.author != null ? String(_raw.author) : undefined,
	};
}

/**
 * @param {string} _version
 * @param {string} _line
 */
function _InfoKey(_version, _line) {
	return `${_version}|${FingerprintReleaseText(_line)}`;
}

/**
 * @param {Date|string|number|undefined} _now
 * @returns {Date}
 */
function _ResolveNow(_now) {
	if (_now instanceof Date) return _now;
	if (typeof _now === 'number' || typeof _now === 'string') {
		let date = new Date(_now);
		if (!Number.isNaN(date.getTime())) return date;
	}
	return new Date();
}

/**
 * @param {Date} _now
 * @param {Date} _date
 */
function _AgeDays(_now, _date) {
	return Math.floor((_now.getTime() - _date.getTime()) / 86_400_000);
}
