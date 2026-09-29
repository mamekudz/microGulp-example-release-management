import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import {
	CollectExistingInfoFingerprints,
	IsWithinMaxAge,
	LoadDeveloperReleaseFiles,
	MergeDeveloperReleases,
	ParseReleaseDate,
} from '../src/release-merge.mjs';
import { PrepareReleaseContext, StripReleaseContext, FingerprintReleaseText } from '../src/release-context.mjs';
import {
	CompareVersions,
	FormatVersionString,
	VersionToLegacyFloat,
	VersionToSortKey,
} from '../src/release-version.mjs';
import { CreateLocalDemoTranslationProvider } from '../src/translation/LocalDemoTranslationProvider.mjs';
import { CreateReleaseTranslationAdapter } from '../src/translation/ReleaseTranslationAdapter.mjs';
import { DEMO_DICTIONARIES } from '../src/translation/demo-dictionary.mjs';
import { BuildDemoHistory } from '../src/history/BuildLocalizedHistory.mjs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const DEMO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-09-24T12:00:00');
const TEMP_ROOTS = [];

after(() => {
	for (let root of TEMP_ROOTS) {
		try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
	}
});

function _TempProject() {
	let root = mkdtempSync(join(tmpdir(), 'release-mgmt-'));
	TEMP_ROOTS.push(root);
	let developerDir = join(root, 'dev', 'releases');
	mkdirSync(developerDir, { recursive: true });
	let releasesPath = join(root, 'RELEASES.json');
	return { root, developerDir, releasesPath };
}

describe('release-context', () => {
	test('PrepareReleaseContext adds a single tag', () => {
		assert.equal(
			PrepareReleaseContext('Added automatic theme detection.'),
			'Added automatic theme detection.<context="release info"/>',
		);
	});

	test('PrepareReleaseContext strips existing tags before adding one', () => {
		let once = PrepareReleaseContext('Fixed icon state.<context="release info"/>');
		let twice = PrepareReleaseContext(once + '<context="release info"/>');
		assert.equal(once, 'Fixed icon state.<context="release info"/>');
		assert.equal(twice, once);
		assert.equal((twice.match(/<context=/g) || []).length, 1);
	});

	test('FingerprintReleaseText ignores context and case', () => {
		assert.equal(
			FingerprintReleaseText('Fixed ICON state.<context="release info"/>'),
			FingerprintReleaseText('fixed icon state.'),
		);
	});
});

describe('release-version', () => {
	test('CompareVersions orders 1.10.0 above 1.2.0', () => {
		assert.ok(CompareVersions('1.10.0', '1.2.0') > 0);
		assert.ok(CompareVersions({ main: 0, minor: 9, revision: 7 }, '0.9.6') > 0);
		assert.equal(CompareVersions('0.9.6', '0.9.6'), 0);
	});

	test('VersionToSortKey and FormatVersionString stay consistent', () => {
		assert.equal(FormatVersionString({ main: 0, minor: 10, revision: 0 }), '0.10.0');
		assert.ok(VersionToSortKey('0.10.0') > VersionToSortKey('0.9.9'));
	});

	test('VersionToLegacyFloat documents the historical idea without replacing CompareVersions', () => {
		assert.ok(Math.abs(VersionToLegacyFloat('1.2.3') - (1 + 2 / 1000 + 3 / 1_000_000)) < 1e-12);
		// Float alone would mishandle large minors relative to naive parseFloat — we still expose it.
		assert.notEqual(Number.parseFloat('1.10.0'), VersionToLegacyFloat('1.10.0'));
	});
});

describe('30-day rule', () => {
	test('ParseReleaseDate and IsWithinMaxAge', () => {
		assert.ok(IsWithinMaxAge(NOW, ParseReleaseDate('2026-09-23 18:40'), 30));
		assert.ok(IsWithinMaxAge(NOW, ParseReleaseDate('2026-08-26 12:00'), 30));
		assert.equal(IsWithinMaxAge(NOW, ParseReleaseDate('2026-08-10 16:00'), 30), false);
		assert.equal(IsWithinMaxAge(NOW, ParseReleaseDate('2026-07-01 10:00'), 30), false);
	});
});

describe('developer merge', () => {
	test('reads multiple author files from the demo fixtures', () => {
		let files = LoadDeveloperReleaseFiles(join(DEMO_ROOT, 'dev', 'releases'));
		assert.equal(files.length, 3);
		assert.deepEqual(files.map((_f) => _f.author).sort(), ['DEV', 'MAM', 'UX']);
	});

	test('merges fresh notes, skips expired and duplicates, stays idempotent', () => {
		let { developerDir, releasesPath } = _TempProject();
		writeFileSync(releasesPath, JSON.stringify({
			releases: [{
				main: 0, minor: 9, revision: 6,
				date: '2026-09-18 20:20',
				beta: false,
				info: ['Already shipped in 0.9.6 — duplicate on purpose for merge tests.<context="release info"/>'],
			}],
		}, null, '\t'));

		writeFileSync(join(developerDir, 'MAM.json'), JSON.stringify({
			author: 'MAM',
			contributions: [
				{
					main: 0, minor: 9, revision: 7, date: '2026-09-23 18:40', beta: false,
					info: ['Added automatic theme detection for light and dark IDE themes.'],
				},
				{
					main: 0, minor: 9, revision: 6, date: '2026-09-20 09:30', beta: false,
					info: ['Already shipped in 0.9.6 — duplicate on purpose for merge tests.'],
				},
				{
					main: 0, minor: 8, revision: 4, date: '2026-08-10 16:00', beta: false,
					info: ['Legacy note from last quarter — left on purpose to demonstrate the 30-day filter.'],
				},
			],
		}, null, '\t'));

		writeFileSync(join(developerDir, 'UX.json'), JSON.stringify({
			author: 'UX',
			contributions: [
				{
					main: 0, minor: 9, revision: 7, date: '2026-09-24 09:10', beta: false,
					info: [
						'Added German translation for device settings labels.',
						'Added German translation for device settings labels.<context="release info"/>',
					],
				},
			],
		}, null, '\t'));

		let first = MergeDeveloperReleases({
			developerDir, releasesPath, now: NOW, maxAgeDays: 30, write: true,
		});
		assert.ok(first.merged >= 2);
		assert.ok(first.duplicates >= 2); // central duplicate + UX self-duplicate with context
		assert.ok(first.expired >= 1);

		let v97 = first.releases.find((_r) => FormatVersionString(_r) === '0.9.7');
		assert.ok(v97);
		assert.equal(
			v97.info.filter((_line) => FingerprintReleaseText(_line).includes('german translation')).length,
			1,
		);
		for (let line of v97.info) {
			assert.equal((line.match(/<context=/g) || []).length, 1);
		}

		let second = MergeDeveloperReleases({
			developerDir, releasesPath, now: NOW, maxAgeDays: 30, write: true,
		});
		assert.equal(second.merged, 0);
		assert.ok(second.duplicates >= first.merged);
		assert.equal(
			JSON.stringify(JSON.parse(readFileSync(releasesPath, 'utf8')).releases),
			JSON.stringify(first.releases),
		);
	});

	test('CollectExistingInfoFingerprints covers seeded central lines', () => {
		let set = CollectExistingInfoFingerprints([{
			main: 0, minor: 9, revision: 6,
			info: ['Hello.<context="release info"/>'],
		}]);
		assert.ok(set.has('0.9.6|hello.'));
	});
});

describe('translation adapter boundary', () => {
	test('LocalDemoTranslationProvider serves en-US and de-DE', () => {
		let provider = CreateLocalDemoTranslationProvider(DEMO_DICTIONARIES);
		let adapter = CreateReleaseTranslationAdapter(provider);
		let source = 'Added automatic theme detection for light and dark IDE themes.';
		adapter.registerReleaseText(source);
		assert.equal(
			adapter.translateReleaseText(source, 'en-US'),
			StripReleaseContext(PrepareReleaseContext(source)),
		);
		assert.match(adapter.translateReleaseText(source, 'de-DE'), /Theme-Erkennung/);
	});

	test('provider can be swapped without changing adapter call sites', () => {
		let calls = [];
		let fake = {
			register(_text) {
				calls.push(['register', _text]);
				return PrepareReleaseContext(_text);
			},
			translate(_text, _lid) {
				calls.push(['translate', _text, _lid]);
				return `FAKE(${_lid}):${StripReleaseContext(_text)}`;
			},
			availableLids() { return ['en-US', 'xx-FAKE']; },
		};
		let adapter = CreateReleaseTranslationAdapter(fake);
		assert.equal(adapter.translateReleaseText('beta', 'xx-FAKE'), 'FAKE(xx-FAKE):beta');
		assert.ok(calls.some((_c) => _c[0] === 'translate'));
		assert.deepEqual(adapter.availableLids(), ['en-US', 'xx-FAKE']);
	});

	test('BuildDemoHistory switches language', () => {
		let releases = [{
			main: 0, minor: 9, revision: 7,
			date: '2026-09-23 18:40',
			beta: false,
			info: ['Added automatic theme detection for light and dark IDE themes.<context="release info"/>'],
		}];
		let en = BuildDemoHistory(releases, 'en-US');
		let de = BuildDemoHistory(releases, 'de-DE');
		assert.equal(en.title, 'Release history');
		assert.equal(de.title, 'Release-Historie');
		assert.match(de.items[0].lines[0], /Theme-Erkennung/);
		assert.ok(CompareVersions(releases[0], '0.9.6') > 0);
	});
});
