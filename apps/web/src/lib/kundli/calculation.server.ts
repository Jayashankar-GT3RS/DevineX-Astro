/**
 * Vedic astrology calculation engine.
 *
 * Uses `astronomy-engine` (pure JS, no native deps) to compute geocentric
 * apparent ecliptic longitudes of date for the Sun, Moon, the five visible
 * planets, and the mean lunar nodes (Rahu/Ketu). The Lahiri (Chitrapaksha)
 * ayanamsa is subtracted to derive sidereal longitudes, from which signs,
 * nakshatras, padas, the ascendant, houses (whole-sign), Navamsa (D9),
 * Vimshottari dashas, selected yogas/doshas and current transits are derived.
 *
 * Geocoding uses the free Open-Meteo geocoding API (no key). Historical
 * timezone offsets are resolved with Node's built-in ICU timezone database.
 *
 * IMPORTANT: chart accuracy must be validated by an administrator against
 * trusted reference outputs before automatic release is enabled. The engine
 * version and all calculation settings are stored with every report.
 */
import {
	AstroTime,
	Body,
	Ecliptic,
	GeoVector,
	Observer,
	SiderealTime,
	e_tilt,
} from 'astronomy-engine';
import type {
	KundliCalculationData,
	PlanetKey,
	PlanetPlacement,
	DashaPeriod,
	YogaFinding,
} from './types';

const ENGINE_NAME = 'astronomy-engine';
const ENGINE_VERSION = 'devinex-vedic-1.0.0';
const PROMPT_VERSION = 'vedic-report-v1';

export { ENGINE_NAME, ENGINE_VERSION, PROMPT_VERSION };

const RASHI = [
	'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
	'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const NAKSHATRAS = [
	'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
	'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
	'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
	'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
	'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Vimshottari dasha lords in order, repeating across the 27 nakshatras (groups of 3).
const DASHA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS: Record<string, number> = {
	Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

// Sign lords.
const SIGN_LORDS = [
	'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
	'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

// Exaltation sign index per planet (undefined = none).
const EXALTATION: Record<string, number | undefined> = {
	Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};
const DEBILITATION: Record<string, number | undefined> = {
	Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0,
};

const PLANET_BODIES: { key: PlanetKey; body: Body }[] = [
	{ key: 'Sun', body: Body.Sun },
	{ key: 'Moon', body: Body.Moon },
	{ key: 'Mars', body: Body.Mars },
	{ key: 'Mercury', body: Body.Mercury },
	{ key: 'Jupiter', body: Body.Jupiter },
	{ key: 'Venus', body: Body.Venus },
	{ key: 'Saturn', body: Body.Saturn },
];

const NAK_SPAN = 360 / 27; // 13.333...
const NAV_SPAN = 30 / 9; // 3.333...

function normalize360(deg: number): number {
	const d = deg % 360;
	return d < 0 ? d + 360 : d;
}

/** Lahiri (Chitrapaksha) ayanamsa in degrees for a given Julian date. */
function lahiriAyanamsa(jd: number): number {
	// Linear approximation anchored at J2000.0 (23°51'11.67" ≈ 23.85324°).
	// Rate ≈ 50.2388783 arcsec/year. Accurate to within a few arcminutes for
	// 1950-2030 birth dates; administrators must validate against reference charts.
	const T = (jd - 2451545.0) / 36525.0;
	const ayanamsa = 23.85324 + (50.2388783 / 3600) * T * 100;
	return ayanamsa;
}

function signOf(longitude: number): { signIndex: number; degreeInSign: number } {
	const lon = normalize360(longitude);
	return { signIndex: Math.floor(lon / 30), degreeInSign: lon % 30 };
}

function nakshatraOf(longitude: number): { index: number; pada: number } {
	const lon = normalize360(longitude);
	const idx = Math.floor(lon / NAK_SPAN);
	const posInNak = lon - idx * NAK_SPAN;
	return { index: idx, pada: Math.floor(posInNak / (NAK_SPAN / 4)) + 1 };
}

function navamsaOf(longitude: number): number {
	const lon = normalize360(longitude);
	const signIndex = Math.floor(lon / 30);
	const degreeInSign = lon % 30;
	const partIndex = Math.floor(degreeInSign / NAV_SPAN);
	const group = signIndex % 3; // 0 movable, 1 fixed, 2 dual
	const offset = group === 0 ? 0 : group === 1 ? 8 : 4;
	return (signIndex + offset + partIndex) % 12;
}

function dignityOf(planet: PlanetKey, signIndex: number): string {
	if (EXALTATION[planet] === signIndex) return 'Exalted';
	if (DEBILITATION[planet] === signIndex) return 'Debilitated';
	if (SIGN_LORDS[signIndex] === planet) return 'Own sign';
	return 'Neutral';
}

/** Geocentric apparent ecliptic longitude of date (tropical), in degrees. */
function tropicalLongitude(body: Body, time: AstroTime): number {
	const vec = GeoVector(body, time, true);
	return normalize360(Ecliptic(vec).elon);
}

/** Mean lunar node (Rahu) longitude for a Julian date, in degrees (tropical of date). */
function meanNodeLongitude(jd: number): number {
	const T = (jd - 2451545.0) / 36525.0;
	// Mean ascending node of the Moon's orbit (retrograde).
	const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
	return normalize360(omega);
}

function isRetrograde(body: Body, time: AstroTime): boolean {
	const t1 = tropicalLongitude(body, time);
	const later = new AstroTime(new Date(time.date.getTime() + 86400000));
	const t2 = tropicalLongitude(body, later);
	// Handle wraparound near 0/360.
	let diff = t2 - t1;
	if (diff > 180) diff -= 360;
	if (diff < -180) diff += 360;
	return diff < 0;
}

/** Ascendant (Lagna) ecliptic longitude of date, in degrees. */
function ascendantLongitude(time: AstroTime, latitude: number, longitude: number): number {
	const gstHours = SiderealTime(time); // Greenwich apparent sidereal time, hours
	const lstHours = normalize360((gstHours * 15 + longitude)) / 15; // local sidereal time, hours
	const ramc = normalize360(lstHours * 15); // right ascension of meridian, degrees
	const eps = (e_tilt(time).tobl * Math.PI) / 180; // true obliquity, radians
	const ramcRad = (ramc * Math.PI) / 180;
	const latRad = (latitude * Math.PI) / 180;
	const asc = Math.atan2(
		Math.cos(ramcRad),
		-(Math.sin(ramcRad) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps)),
	);
	return normalize360((asc * 180) / Math.PI);
}

interface GeocodeResult {
	name: string;
	latitude: number;
	longitude: number;
	timezone: string;
}

/** Resolves a place name to coordinates + IANA timezone via Open-Meteo (no key). */
async function geocode(place: string): Promise<GeocodeResult | null> {
	const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) return null;
		const data = (await res.json()) as { results?: Array<{ latitude: number; longitude: number; timezone: string; name: string; country?: string; admin1?: string }> };
		const r = data.results?.[0];
		if (!r) return null;
		return {
			name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
			latitude: r.latitude,
			longitude: r.longitude,
			timezone: r.timezone,
		};
	} catch {
		return null;
	}
}

/** Offset (ms) of an IANA timezone from UTC at the given epoch. */
function tzOffsetMs(timezone: string, epochMs: number): number {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
	});
	const parts = dtf.formatToParts(new Date(epochMs));
	const map: Record<string, number> = {};
	for (const p of parts) {
		if (p.type !== 'literal') map[p.type] = Number(p.value);
	}
	let h = map.hour;
	if (h === 24) h = 0; // Intl can return 24 at midnight.
	const asIfUtc = Date.UTC(map.year, map.month - 1, map.day, h, map.minute, map.second);
	return asIfUtc - epochMs;
}

/** Converts a local wall-clock time in an IANA timezone to a UTC Date. */
function localToUtc(timezone: string, year: number, month: number, day: number, hour: number, minute: number): Date {
	const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
	const offset1 = tzOffsetMs(timezone, asIfUtc);
	const guess = asIfUtc - offset1;
	const offset2 = tzOffsetMs(timezone, guess);
	return new Date(asIfUtc - offset2);
}

function julianDay(date: Date): number {
	return date.getTime() / 86400000 + 2440587.5;
}

function buildPlacement(
	planet: PlanetKey,
	siderealLon: number,
	ascendantSignIndex: number,
	retrograde: boolean,
): PlanetPlacement {
	const { signIndex, degreeInSign } = signOf(siderealLon);
	const { index: nakIdx, pada } = nakshatraOf(siderealLon);
	const navIdx = navamsaOf(siderealLon);
	// Whole-sign house: house 1 = ascendant sign.
	const house = ((signIndex - ascendantSignIndex + 12) % 12) + 1;
	return {
		name: planet,
		longitude: Math.round(siderealLon * 10000) / 10000,
		signIndex,
		sign: RASHI[signIndex],
		degreeInSign: Math.round(degreeInSign * 10000) / 10000,
		house,
		nakshatraIndex: nakIdx,
		nakshatra: NAKSHATRAS[nakIdx],
		pada,
		retrograde,
		dignity: dignityOf(planet, signIndex),
		navamsaSignIndex: navIdx,
		navamsaSign: RASHI[navIdx],
	};
}

function computeDashas(moonSiderealLon: number, birthDate: Date): DashaPeriod[] {
	const nakIdx = Math.floor(normalize360(moonSiderealLon) / NAK_SPAN);
	const startLordPos = nakIdx % 9;
	const posInNak = normalize360(moonSiderealLon) - nakIdx * NAK_SPAN;
	const balanceFraction = (NAK_SPAN - posInNak) / NAK_SPAN;
	const startLord = DASHA_LORDS[startLordPos];
	const startDashaYears = DASHA_YEARS[startLord];
	const elapsedInStart = startDashaYears * (1 - balanceFraction);
	const msPerYear = 365.25 * 86400000;
	const firstDashaStart = new Date(birthDate.getTime() - elapsedInStart * msPerYear);

	const dashas: DashaPeriod[] = [];
	let cursor = new Date(firstDashaStart);
	for (let i = 0; i < 9; i++) {
		const lordIdx = (startLordPos + i) % 9;
		const lord = DASHA_LORDS[lordIdx];
		const years = DASHA_YEARS[lord];
		const end = new Date(cursor.getTime() + years * msPerYear);
		// Antardashas within this mahadasha, starting from the same lord.
		const antardashas: { lord: string; start: string; end: string }[] = [];
		let aCursor = new Date(cursor);
		for (let j = 0; j < 9; j++) {
			const aLordIdx = (lordIdx + j) % 9;
			const aLord = DASHA_LORDS[aLordIdx];
			const aYears = (DASHA_YEARS[aLord] / 120) * years;
			const aEnd = new Date(aCursor.getTime() + aYears * msPerYear);
			antardashas.push({ lord: aLord, start: aCursor.toISOString(), end: aEnd.toISOString() });
			aCursor = aEnd;
		}
		dashas.push({ lord, start: cursor.toISOString(), end: end.toISOString(), antardashas });
		cursor = end;
	}
	return dashas;
}

function findYogas(planets: PlanetPlacement[], moonSignIndex: number, ascendantSignIndex: number): YogaFinding[] {
	const yogas: YogaFinding[] = [];
	const byName = (n: PlanetKey) => planets.find(p => p.name === n);
	const moon = byName('Moon');
	const jup = byName('Jupiter');

	// Gajakesari: Jupiter in a kendra (1st, 4th, 7th, 10th) from the Moon (whole sign).
	if (moon && jup) {
		const kendra = (jup.signIndex - moon.signIndex + 12) % 12;
		if (kendra === 0 || kendra === 3 || kendra === 6 || kendra === 9) {
			yogas.push({ name: 'Gajakesari Yoga', description: 'Jupiter occupies a kendra (angular house) from the Moon, traditionally associated with wisdom, reputation and steady character.' });
		}
	}

	// Budhaditya: Sun and Mercury in the same sign.
	const sun = byName('Sun');
	const merc = byName('Mercury');
	if (sun && merc && sun.signIndex === merc.signIndex) {
		yogas.push({ name: 'Budhaditya Yoga', description: 'Sun and Mercury occupy the same sign, traditionally associated with intellect and communication.' });
	}

	// Chandra-Mangala: Moon and Mars in the same sign.
	const mars = byName('Mars');
	if (moon && mars && moon.signIndex === mars.signIndex) {
		yogas.push({ name: 'Chandra-Mangala Yoga', description: 'Moon and Mars occupy the same sign, traditionally linked to drive and resourcefulness.' });
	}

	// Pancha Mahapurusha yogas: a planet in own sign or exalted, in a kendra from the ascendant.
	const kendraHouses = [1, 4, 7, 10];
	const pancha: Record<string, { planet: PlanetKey; yoga: string; desc: string }> = {
		Mars: { planet: 'Mars', yoga: 'Ruchaka Yoga', desc: 'Mars in own sign or exalted in a kendra, traditionally associated with courage and leadership.' },
		Mercury: { planet: 'Mercury', yoga: 'Bhadra Yoga', desc: 'Mercury in own sign or exalted in a kendra, traditionally associated with intellect and eloquence.' },
		Jupiter: { planet: 'Jupiter', yoga: 'Hamsa Yoga', desc: 'Jupiter in own sign or exalted in a kendra, traditionally associated with wisdom and spirituality.' },
		Venus: { planet: 'Venus', yoga: 'Malavya Yoga', desc: 'Venus in own sign or exalted in a kendra, traditionally associated with grace and creativity.' },
		Saturn: { planet: 'Saturn', yoga: 'Sasa Yoga', desc: 'Saturn in own sign or exalted in a kendra, traditionally associated with discipline and endurance.' },
	};
	for (const key of Object.keys(pancha)) {
		const p = byName(key as PlanetKey);
		const cfg = pancha[key];
		if (p && kendraHouses.includes(p.house) && (p.dignity === 'Own sign' || p.dignity === 'Exalted')) {
			yogas.push({ name: cfg.yoga, description: cfg.desc });
		}
	}

	// Kemadruma: no planets (excluding Sun, Rahu, Ketu) in the 2nd or 12th from the Moon, and none conjunct the Moon.
	if (moon) {
		const second = (moon.signIndex + 1) % 12;
		const twelfth = (moon.signIndex + 11) % 12;
		const neighbors = planets.filter(p => p.name !== 'Moon' && p.name !== 'Sun' && p.name !== 'Rahu' && p.name !== 'Ketu');
		const hasNeighbor = neighbors.some(p => p.signIndex === moon.signIndex || p.signIndex === second || p.signIndex === twelfth);
		if (!hasNeighbor) {
			yogas.push({ name: 'Kemadruma Yoga', description: 'No benefic planets occupy the 2nd, 12th or the same sign as the Moon. Traditionally interpreted as indicating self-reliance; classical texts suggest remedial reflection.' });
		}
	}

	return yogas;
}

function findDoshas(planets: PlanetPlacement[]): YogaFinding[] {
	const doshas: YogaFinding[] = [];
	const mars = planets.find(p => p.name === 'Mars');
	if (mars && [1, 2, 4, 7, 8, 12].includes(mars.house)) {
		doshas.push({
			name: 'Mangal Dosha',
			description: `Mars occupies house ${mars.house}. Traditionally considered in the context of marriage compatibility. This is a classical calculation, not a prediction of harm; many traditions hold it is mitigated by various factors.`,
		});
	}
	return doshas;
}

function computeTransits(): { planet: PlanetKey; signIndex: number; sign: string }[] {
	const now = new Date();
	const time = new AstroTime(now);
	const ayanamsa = lahiriAyanamsa(julianDay(now));
	const out: { planet: PlanetKey; signIndex: number; sign: string }[] = [];
	for (const { key, body } of PLANET_BODIES) {
		const sidereal = normalize360(tropicalLongitude(body, time) - ayanamsa);
		const { signIndex } = signOf(sidereal);
		out.push({ planet: key, signIndex, sign: RASHI[signIndex] });
	}
	const rahuSid = normalize360(meanNodeLongitude(julianDay(now)) - ayanamsa);
	const rahuSign = signOf(rahuSid).signIndex;
	out.push({ planet: 'Rahu', signIndex: rahuSign, sign: RASHI[rahuSign] });
	out.push({ planet: 'Ketu', signIndex: (rahuSign + 6) % 12, sign: RASHI[(rahuSign + 6) % 12] });
	return out;
}

export interface BirthInput {
	fullName: string;
	dateOfBirth: string; // YYYY-MM-DD
	timeOfBirth: string; // HH:MM
	placeOfBirth: string;
	birthState?: string;
	birthCountry?: string;
	birthTimeAccuracy: string; // exact | approximate | unknown
}

export interface CalculationResult {
	data: KundliCalculationData;
	promptVersion: string;
}

/**
 * Validates the submitted birth details before any external request is made.
 * Throws a message intended for the admin job log when something is missing or
 * impossible (an unparseable date, a future birth date, 25:90 as a time).
 */
function validateBirthInput(input: BirthInput): { dateStr: string; timeStr: string } {
	if (!input.fullName?.trim() || input.fullName.trim().length < 2) {
		throw new Error('Full name is required (at least 2 characters).');
	}

	if (!input.placeOfBirth?.trim() || input.placeOfBirth.trim().length < 2) {
		throw new Error('Place of birth is required so the chart can be calculated.');
	}

	// PocketBase returns date fields as full ISO strings, so take the leading
	// YYYY-MM-DD / HH:MM before splitting.
	const dateStr = (input.dateOfBirth || '').slice(0, 10);
	const timeStr = (input.timeOfBirth || '').slice(0, 5);

	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		throw new Error(`Date of birth is invalid ("${input.dateOfBirth}"). Expected YYYY-MM-DD.`);
	}

	if (!/^\d{2}:\d{2}$/.test(timeStr)) {
		throw new Error(`Time of birth is invalid ("${input.timeOfBirth}"). Expected HH:MM.`);
	}

	const [y, m, d] = dateStr.split('-').map(Number);
	const [hh, mm] = timeStr.split(':').map(Number);
	const wallClock = new Date(Date.UTC(y, m - 1, d, hh, mm));

	if (
		wallClock.getUTCFullYear() !== y
		|| wallClock.getUTCMonth() !== m - 1
		|| wallClock.getUTCDate() !== d
		|| wallClock.getUTCHours() !== hh
		|| wallClock.getUTCMinutes() !== mm
	) {
		throw new Error(`Birth date/time is not a real calendar date and time ("${dateStr} ${timeStr}").`);
	}

	if (y < 1800) {
		throw new Error('Date of birth must be after 1800 for reliable ephemeris calculations.');
	}

	if (wallClock.getTime() > Date.now()) {
		throw new Error('Date of birth cannot be in the future.');
	}

	return { dateStr, timeStr };
}

/**
 * Runs the full Vedic calculation pipeline. Throws when the birthplace cannot
 * be resolved or the timezone is unavailable — the caller flags the request
 * for administrator review instead of producing an uncertain chart.
 */
export async function calculateKundli(input: BirthInput): Promise<CalculationResult> {
	const limitations: string[] = [];
	const { dateStr, timeStr } = validateBirthInput(input);
	const [y, m, d] = dateStr.split('-').map(Number);
	const [hh, mm] = timeStr.split(':').map(Number);

	const placeQuery = [input.placeOfBirth, input.birthState, input.birthCountry].filter(Boolean).join(', ');
	const geo = await geocode(placeQuery || input.placeOfBirth);
	if (!geo) {
		throw new Error(`Could not resolve birthplace coordinates for "${placeQuery}". Flag for administrator review.`);
	}

	let utcDate: Date;
	try {
		utcDate = localToUtc(geo.timezone, y, m, d, hh, mm);
	} catch (err) {
		throw new Error(`Could not resolve historical timezone "${geo.timezone}" for the birth date (${err instanceof Error ? err.message : String(err)}). Flag for administrator review.`);
	}

	const time = new AstroTime(utcDate);
	const jd = julianDay(utcDate);
	const ayanamsa = lahiriAyanamsa(jd);

	let validationStatus: KundliCalculationData['validationStatus'] = 'validated';
	if (input.birthTimeAccuracy === 'unknown') {
		validationStatus = 'unknown_time';
		limitations.push('Birth time is unknown. Ascendant, house and divisional-chart calculations cannot be determined reliably and are not presented as exact. Please confirm the birth time for a complete chart.');
		throw new Error('Birth time is unknown — cannot reliably calculate the ascendant or houses. Flag for administrator review and request the birth time from the customer.');
	} else if (input.birthTimeAccuracy === 'approximate') {
		validationStatus = 'approximate_time';
		limitations.push('Birth time is approximate. Ascendant and house placements may shift; interpretations involving the ascendant or divisional charts should be treated as indicative, not exact.');
	}

	// Ascendant (tropical of date, then sidereal).
	const ascTropical = ascendantLongitude(time, geo.latitude, geo.longitude);
	const ascSidereal = normalize360(ascTropical - ayanamsa);
	const ascSign = signOf(ascSidereal);
	const ascNak = nakshatraOf(ascSidereal);

	// Planets.
	const planets: PlanetPlacement[] = [];
	for (const { key, body } of PLANET_BODIES) {
		const tropical = tropicalLongitude(body, time);
		const sidereal = normalize360(tropical - ayanamsa);
		planets.push(buildPlacement(key, sidereal, ascSign.signIndex, isRetrograde(body, time)));
	}

	// Rahu (mean node) and Ketu.
	const rahuTropical = meanNodeLongitude(jd);
	const rahuSidereal = normalize360(rahuTropical - ayanamsa);
	const ketuSidereal = normalize360(rahuSidereal + 180);
	planets.push(buildPlacement('Rahu', rahuSidereal, ascSign.signIndex, true)); // nodes are always retrograde
	planets.push(buildPlacement('Ketu', ketuSidereal, ascSign.signIndex, true));

	const moon = planets.find(p => p.name === 'Moon')!;
	const sun = planets.find(p => p.name === 'Sun')!;

	// Houses (whole sign).
	const houses = Array.from({ length: 12 }, (_, i) => {
		const si = (ascSign.signIndex + i) % 12;
		return { index: i + 1, signIndex: si, sign: RASHI[si] };
	});

	// Navamsa summary.
	const navamsa = planets.map(p => ({ planet: p.name, navamsaSignIndex: p.navamsaSignIndex, navamsaSign: p.navamsaSign }));

	// Dashas.
	const dashas = computeDashas(moon.longitude, utcDate);

	// Yogas & doshas.
	const yogas = findYogas(planets, moon.signIndex, ascSign.signIndex);
	const doshas = findDoshas(planets);

	// Transits for the reference date.
	const transits = computeTransits();

	const data: KundliCalculationData = {
		engineName: ENGINE_NAME,
		engineVersion: ENGINE_VERSION,
		ayanamsa: 'lahiri',
		ayanamsaValue: Math.round(ayanamsa * 10000) / 10000,
		chartStyle: 'north',
		houseSystem: 'whole_sign',
		birthplaceName: geo.name,
		latitude: Math.round(geo.latitude * 10000) / 10000,
		longitude: Math.round(geo.longitude * 10000) / 10000,
		timezone: geo.timezone,
		utcTime: utcDate.toISOString(),
		validationStatus,
		ascendant: {
			longitude: Math.round(ascSidereal * 10000) / 10000,
			signIndex: ascSign.signIndex,
			sign: RASHI[ascSign.signIndex],
			nakshatra: NAKSHATRAS[ascNak.index],
			nakshatraIndex: ascNak.index,
			pada: ascNak.pada,
		},
		moonSign: moon.sign,
		moonSignIndex: moon.signIndex,
		sunSign: sun.sign,
		sunSignIndex: sun.signIndex,
		janmaNakshatra: moon.nakshatra,
		janmaNakshatraIndex: moon.nakshatraIndex,
		nakshatraPada: moon.pada,
		planets,
		houses,
		navamsa,
		dashas,
		yogas,
		doshas,
		transits,
		birthTimeAccuracy: input.birthTimeAccuracy,
		referenceDate: new Date().toISOString(),
		limitations,
	};

	return { data, promptVersion: PROMPT_VERSION };
}
