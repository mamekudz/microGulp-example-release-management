// ===========================================
// release-management/gulpfile.mjs
// Per-developer notes → RELEASES.json → localized history
// Works with plain gulp CLI and with the µGulp dashboard.
// ===========================================

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
	InstallStringExtensions,
	Log,
	LogAccordion,
	LogKeyValue,
	LogCallout,
} from 'gulp-mu-gulp-api';
import { MergeDeveloperReleases } from './src/release-merge.mjs';
import { RenderHistoryHtml } from './src/history/RenderHistoryHtml.mjs';
import { BuildHistoryAccordion } from './src/history/BuildLocalizedHistory.mjs';

InstallStringExtensions();

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const DEVELOPER_DIR = join(PROJECT_ROOT, 'dev', 'releases');
const RELEASES_PATH = join(PROJECT_ROOT, 'RELEASES.json');
const DIST_DIR = join(PROJECT_ROOT, 'dist');

/** Fixed clock for reproducible blog demos (matches fixture dates). Override with RELEASE_DEMO_NOW. */
function _DemoNow() {
	if (process.env.RELEASE_DEMO_NOW) return new Date(process.env.RELEASE_DEMO_NOW);
	return new Date('2026-09-24T12:00:00');
}

function _Merge() {
	return MergeDeveloperReleases({
		developerDir: DEVELOPER_DIR,
		releasesPath: RELEASES_PATH,
		now: _DemoNow(),
		maxAgeDays: 30,
		write: true,
	});
}

function _LogSummary(_summary) {
	LogKeyValue({
		title: 'Release notes',
		items: [
			{ key: 'scanned', value: String(_summary.scanned) },
			{ key: 'new', value: String(_summary.merged) },
			{ key: 'duplicates', value: String(_summary.duplicates) },
			{ key: 'expired', value: String(_summary.expired) },
			{ key: 'invalid', value: String(_summary.invalid) },
			{ key: 'authors', value: _summary.authors.join(', ') },
			{ key: 'versions', value: String(_summary.releases.length) },
		],
	});
}

export async function MERGE_RELEASES() {
	Log('Merging dev/releases/*.json into RELEASES.json…<context="task log"/>');
	let summary = _Merge();
	_LogSummary(summary);
	if (summary.merged === 0 && summary.duplicates > 0) {
		LogCallout({
			variant: 'info',
			title: 'Idempotent merge',
			message: 'No new lines — duplicates and age filter left RELEASES.json unchanged in substance.',
		});
	}
	return summary;
}
MERGE_RELEASES.µDisplayName = 'Merge developer release notes<context="µDisplayName"/>'.i18xRegister();
MERGE_RELEASES.µDescription = 'Reads dev/releases/*.json, keeps notes younger than 30 days that are not already in RELEASES.json, normalizes release-info context tags, and writes the central file.<context="µDescription"/>'.i18xRegister();
MERGE_RELEASES.µTooltip = 'Safe to run repeatedly — duplicate detection is fingerprint-based.<context="µTooltip"/>'.i18xRegister();
MERGE_RELEASES.µGroup = 'Releases<context="µGroup"/>'.i18xRegister();
MERGE_RELEASES.µOrder = 10;
MERGE_RELEASES.µPresentation = { icon: 'build' };

/** Alias expected by blog write-ups (`gulp releases`). */
export async function RELEASES() {
	return MERGE_RELEASES();
}
RELEASES.µDisplayName = 'Merge releases (alias)<context="µDisplayName"/>'.i18xRegister();
RELEASES.µDescription = 'Alias for Merge developer release notes.<context="µDescription"/>'.i18xRegister();
RELEASES.µGroup = 'Releases<context="µGroup"/>'.i18xRegister();
RELEASES.µOrder = 11;
RELEASES.µPresentation = { icon: 'build' };

export async function BUILD_HISTORY() {
	Log('Building localized history page…<context="task log"/>');
	let summary = _Merge();
	let { htmlPath, jsonPath } = RenderHistoryHtml({
		releases: summary.releases,
		outDir: DIST_DIR,
		lids: ['en-US', 'de-DE'],
	});
	Log('Wrote <html/> and <json/><context="task log"/>', { html: htmlPath, json: jsonPath });
	return { summary, htmlPath, jsonPath };
}
BUILD_HISTORY.µDisplayName = 'Build history HTML<context="µDisplayName"/>'.i18xRegister();
BUILD_HISTORY.µDescription = 'Merges release notes, then writes dist/history.html with English/German toggle via the opaque translation adapter.<context="µDescription"/>'.i18xRegister();
BUILD_HISTORY.µGroup = 'Releases<context="µGroup"/>'.i18xRegister();
BUILD_HISTORY.µOrder = 20;
BUILD_HISTORY.µPresentation = { icon: 'document' };

export async function BUILD() {
	Log('Full release demo build…<context="task log"/>');
	return BUILD_HISTORY();
}
BUILD.µDisplayName = 'Build (merge + history)<context="µDisplayName"/>'.i18xRegister();
BUILD.µDescription = 'Runs merge and writes the bilingual history page under dist/.<context="µDescription"/>'.i18xRegister();
BUILD.µGroup = 'Releases<context="µGroup"/>'.i18xRegister();
BUILD.µOrder = 30;
BUILD.µPresentation = { icon: 'build' };

export async function SHOW_HISTORY() {
	Log('Localized release history (en-US)…<context="task log"/>');
	let summary = _Merge();
	LogAccordion(BuildHistoryAccordion(summary.releases, 'en-US'));
	Log('Localized release history (de-DE)…<context="task log"/>');
	LogAccordion(BuildHistoryAccordion(summary.releases, 'de-DE'));
}
SHOW_HISTORY.µDisplayName = 'Show history (en + de)<context="µDisplayName"/>'.i18xRegister();
SHOW_HISTORY.µDescription = 'Merges notes and prints the release accordion in English and German through the translation adapter.<context="µDescription"/>'.i18xRegister();
SHOW_HISTORY.µGroup = 'Releases<context="µGroup"/>'.i18xRegister();
SHOW_HISTORY.µOrder = 40;
SHOW_HISTORY.µPresentation = { icon: 'info' };

export const µGroups = 'collapsed';
