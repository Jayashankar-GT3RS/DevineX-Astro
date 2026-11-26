/**
 * Instant (unregistered) chart requests.
 *
 * Shared by `POST /api/kundli/chart` (JSON for the on-screen chart) and
 * `POST /api/kundli/chart-pdf` (downloadable chart PDF). Both run the same
 * astronomy pipeline as the full report, so the free chart can never disagree
 * with a paid report for the same birth details.
 */
import { calculateKundli } from './calculation.server';
import type { ChartStyle, KundliCalculationData } from './types';

const RASHI = [
	'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
	'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const NAKSHATRAS = [
	'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
	'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
	'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
	'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
	'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

export interface ChartPayload {
	fullName?: string;
	gender?: string;
	dateOfBirth?: string;
	timeOfBirth?: string;
	placeOfBirth?: string;
	birthState?: string;
	birthCountry?: string;
	birthTimeAccuracy?: string;
	latitude?: number | string | null;
	longitude?: number | string | null;
	timezone?: string;
	chartStyle?: string;
	knownRashi?: string;
	knownNakshatra?: string;
}

export interface ChartResult {
	chart: KundliCalculationData;
	verification: string[];
}

const toNumber = (value: unknown): number | undefined => {
	if (value === null || value === undefined || value === '') return undefined;
	const parsed = typeof value === 'number' ? value : Number(String(value).trim());
	return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Runs the chart calculation for an untrusted request body.
 * Throws an Error with a user-facing message for invalid input.
 */
export async function buildInstantChart(payload: ChartPayload): Promise<ChartResult> {
	if (!payload || typeof payload !== 'object') {
		throw new Error('Birth details are required.');
	}

	const fullName = String(payload.fullName ?? '').trim().slice(0, 200);
	const dateOfBirth = String(payload.dateOfBirth ?? '').trim();
	const timeOfBirth = String(payload.timeOfBirth ?? '').trim();
	const placeOfBirth = String(payload.placeOfBirth ?? '').trim().slice(0, 500);

	const knownRashi = RASHI.includes(String(payload.knownRashi ?? '').trim())
		? String(payload.knownRashi).trim()
		: '';
	const knownNakshatra = NAKSHATRAS.includes(String(payload.knownNakshatra ?? '').trim())
		? String(payload.knownNakshatra).trim()
		: '';

	const { data } = await calculateKundli({
		fullName: fullName || 'Seeker',
		dateOfBirth,
		timeOfBirth,
		placeOfBirth,
		birthState: String(payload.birthState ?? '').trim().slice(0, 200),
		birthCountry: String(payload.birthCountry ?? '').trim().slice(0, 200),
		birthTimeAccuracy: payload.birthTimeAccuracy === 'approximate' ? 'approximate' : 'exact',
		latitude: toNumber(payload.latitude),
		longitude: toNumber(payload.longitude),
		timezone: String(payload.timezone ?? '').trim().slice(0, 100) || undefined,
		chartStyle: (payload.chartStyle === 'south' ? 'south' : 'north') satisfies ChartStyle,
	});

	const verification: string[] = [];
	if (knownRashi) {
		verification.push(
			knownRashi === data.moonSign
				? `Your remembered zodiac sign matches the calculation: Chandra Rashi (Moon sign) is ${data.moonSign}.`
				: `You entered ${knownRashi} as your zodiac sign, but the calculated Chandra Rashi (Moon sign) is ${data.moonSign}. In Vedic astrology "your sign" is usually the Moon sign; the Sun sign here is ${data.sunSign}. Please re-check your birth time and place if this looks wrong.`,
		);
	}
	if (knownNakshatra) {
		verification.push(
			knownNakshatra === data.janmaNakshatra
				? `Your remembered birth star matches: Janma Nakshatra is ${data.janmaNakshatra} (Pada ${data.nakshatraPada}).`
				: `You entered ${knownNakshatra} as your birth star, but the calculated Janma Nakshatra is ${data.janmaNakshatra} (Pada ${data.nakshatraPada}). A small difference in birth time or place can shift the nakshatra.`,
		);
	}

	return { chart: data, verification };
}
