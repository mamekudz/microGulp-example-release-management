// ===========================================
// demo-dictionary.mjs — en-US → de-DE for blog fixtures
// ===========================================

import { PrepareReleaseContext } from '../release-context.mjs';

/** @param {string} _en @param {string} _de */
function _pair(_en, _de) {
	return [PrepareReleaseContext(_en), _de];
}

const PAIRS = [
	_pair(
		'Release history',
		'Release-Historie',
	),
	_pair(
		'beta',
		'Beta',
	),
	_pair(
		'Added automatic theme detection for light and dark IDE themes.',
		'Automatische Theme-Erkennung für helle und dunkle IDE-Themes hinzugefügt.',
	),
	_pair(
		'Fixed incorrect icon state after task completion on Stream Deck keys.',
		'Fehlerhaften Icon-Zustand nach Task-Ende auf Stream-Deck-Tasten behoben.',
	),
	_pair(
		'Improved hardware reconnect handling when the control session drops.',
		'Hardware-Reconnect verbessert, wenn die Control-Session abbricht.',
	),
	_pair(
		'Added German translation for device settings labels.',
		'Deutsche Übersetzung für Geräte-Einstellungslabels hinzugefügt.',
	),
	_pair(
		'Optimized dashboard startup time by deferring unused skin assets.',
		'Dashboard-Startzeit optimiert, indem ungenutzte Skin-Assets verzögert geladen werden.',
	),
	_pair(
		'Fixed duplicate task entries after a workspace reload.',
		'Doppelte Task-Einträge nach Workspace-Reload behoben.',
	),
	_pair(
		'Documented the Actions Ring title-only limit (SDK has no LCD animation).',
		'Actions-Ring-Grenze dokumentiert (nur Titel, SDK ohne LCD-Animation).',
	),
	_pair(
		'Reduced false positives in the µWatch runaway circuit breaker.',
		'Falsch-Positive im µWatch-Runaway-Schutz reduziert.',
	),
	_pair(
		'Clarified Free edition hardware exclusion in the settings panel.',
		'Hardware-Ausschluss der Free-Edition im Einstellungsbereich klargestellt.',
	),
	_pair(
		'Stabilized schedule countdown display when switching dashboard language.',
		'Scheduler-Countdown stabilisiert beim Sprachwechsel im Dashboard.',
	),
	_pair(
		'Legacy note from last quarter — left on purpose to demonstrate the 30-day filter.',
		'Ältere Notiz aus dem letzten Quartal — absichtlich belassen, um den 30-Tage-Filter zu zeigen.',
	),
	_pair(
		'Already shipped in 0.9.6 — duplicate on purpose for merge tests.',
		'Bereits in 0.9.6 enthalten — absichtliches Duplikat für Merge-Tests.',
	),
];

/** @type {Record<string, Record<string, string>>} */
export const DEMO_DICTIONARIES = {
	'en-US': Object.fromEntries(PAIRS.map(([_en]) => [_en, StripBody(_en)])),
	'de-DE': Object.fromEntries(PAIRS),
};

function StripBody(_prepared) {
	return String(_prepared).replace(/<context\s*=\s*["']release info["']\s*\/>/gi, '').trim();
}
