// ===========================================
// BuildLocalizedHistory.mjs
// ===========================================

import { FormatVersionString } from '../release-version.mjs';
import { CreateReleaseTranslationAdapter } from '../translation/ReleaseTranslationAdapter.mjs';
import { CreateLocalDemoTranslationProvider } from '../translation/LocalDemoTranslationProvider.mjs';
import { DEMO_DICTIONARIES } from '../translation/demo-dictionary.mjs';

/**
 * @param {object} _options
 * @param {object[]} _options.releases
 * @param {ReturnType<typeof CreateReleaseTranslationAdapter>} _options.adapter
 * @param {string} _options.lid
 * @returns {{ lid: string, title: string, items: { summary: string, open: boolean, lines: string[] }[] }}
 */
export function BuildLocalizedHistory(_options) {
	let adapter = _options.adapter;
	let lid = _options.lid || 'en-US';
	let releases = Array.isArray(_options.releases) ? _options.releases : [];
	let titleSource = 'Release history<context="release info"/>';
	adapter.registerReleaseText(titleSource);
	let betaSource = 'beta<context="release info"/>';
	adapter.registerReleaseText(betaSource);

	return {
		lid,
		title: adapter.translateReleaseText(titleSource, lid),
		items: releases.map((_release, _index) => {
			let version = FormatVersionString(_release);
			let betaLabel = _release.beta
				? ` (${adapter.translateReleaseText(betaSource, lid)})`
				: '';
			for (let line of _release.info ?? []) {
				adapter.registerReleaseText(line);
			}
			return {
				summary: `V${version}${betaLabel} — ${_release.date}`,
				open: _index === 0,
				lines: (_release.info ?? []).map((_line) => adapter.translateReleaseText(_line, lid)),
			};
		}),
	};
}

/**
 * Default demo wiring: LocalDemoTranslationProvider behind the stable adapter.
 * @param {object[]} _releases
 * @param {string} _lid
 */
export function BuildDemoHistory(_releases, _lid) {
	let provider = CreateLocalDemoTranslationProvider(DEMO_DICTIONARIES);
	let adapter = CreateReleaseTranslationAdapter(provider);
	// Register known dictionary keys so callers can swap providers later.
	for (let lid of Object.keys(DEMO_DICTIONARIES)) {
		for (let key of Object.keys(DEMO_DICTIONARIES[lid])) {
			adapter.registerReleaseText(key);
		}
	}
	return BuildLocalizedHistory({ releases: _releases, adapter, lid: _lid });
}

/**
 * Accordion payload compatible with gulp-mu-gulp-api LogAccordion.
 * @param {object[]} _releases
 * @param {string} _lid
 */
export function BuildHistoryAccordion(_releases, _lid) {
	let history = BuildDemoHistory(_releases, _lid);
	return {
		title: history.title,
		items: history.items.map((_item) => ({
			summary: _item.summary,
			open: _item.open,
			lines: _item.lines,
		})),
	};
}
