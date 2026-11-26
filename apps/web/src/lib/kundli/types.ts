// Shared types for the automated AI Kundli generation engine.

export type PlanetKey =
	| 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter'
	| 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

export interface PlanetPlacement {
	name: PlanetKey;
	longitude: number; // sidereal ecliptic longitude 0-360
	signIndex: number; // 0-11 (Aries..Pisces)
	sign: string;
	degreeInSign: number; // 0-30
	house: number; // 1-12 (whole sign from ascendant)
	nakshatraIndex: number; // 0-26
	nakshatra: string;
	pada: number; // 1-4
	retrograde: boolean;
	dignity: string; // Exalted, Debilitated, Own, Friendly, Neutral, etc.
	navamsaSign: string;
	navamsaSignIndex: number;
}

export interface DashaPeriod {
	lord: string;
	start: string; // ISO date
	end: string; // ISO date
	antardashas: { lord: string; start: string; end: string }[];
}

export interface YogaFinding {
	name: string;
	description: string;
}

export type ChartStyle = 'north' | 'south';

export interface PanchangInfo {
	tithi: string; // e.g. "Shukla Panchami"
	tithiIndex: number; // 1-30
	paksha: 'Shukla' | 'Krishna';
	yoga: string;
	karana: string;
	weekday: string;
}

export interface KundliCalculationData {
	engineName: string;
	engineVersion: string;
	ayanamsa: string;
	ayanamsaValue: number;
	chartStyle: string;
	houseSystem: string;
	birthplaceName: string;
	latitude: number;
	longitude: number;
	timezone: string;
	utcTime: string;
	validationStatus: 'validated' | 'approximate_time' | 'unknown_time' | 'unresolved_location';
	ascendant: { longitude: number; signIndex: number; sign: string; nakshatra: string; nakshatraIndex: number; pada: number };
	moonSign: string;
	moonSignIndex: number;
	sunSign: string;
	sunSignIndex: number;
	janmaNakshatra: string;
	janmaNakshatraIndex: number;
	nakshatraPada: number;
	planets: PlanetPlacement[];
	houses: { index: number; signIndex: number; sign: string }[];
	navamsa: { planet: PlanetKey; navamsaSignIndex: number; navamsaSign: string }[];
	dashas: DashaPeriod[];
	yogas: YogaFinding[];
	doshas: YogaFinding[];
	transits: { planet: PlanetKey; signIndex: number; sign: string }[];
	birthTimeAccuracy: string;
	referenceDate: string;
	panchang?: PanchangInfo;
	limitations: string[];
}

export interface KundliCalculationRecord {
	id: string;
	request: string;
	engineName: string;
	engineVersion: string;
	ayanamsa: string;
	ayanamsaValue: number;
	chartStyle: string;
	houseSystem: string;
	birthplaceName: string;
	latitude: number;
	longitude: number;
	timezone: string;
	utcTime: string;
	validationStatus: string;
	calculationData: KundliCalculationData;
	limitations: string;
	created: string;
	updated: string;
}

export interface KundliReportRecord {
	id: string;
	request: string;
	calculation: string;
	aiModel: string;
	promptVersion: string;
	interpretationData: InterpretationReport;
	reportStatus: string;
	generatedAt: string;
	approvedAt: string;
	releasedAt: string;
	created: string;
	updated: string;
}

export interface InterpretationReport {
	sections: { title: string; body: string }[];
	rawText: string;
}

export interface GenerationJobRecord {
	id: string;
	request: string;
	processingStatus: string;
	attempts: number;
	errorMessage: string;
	startedAt: string;
	completedAt: string;
	estimatedApiCost: number;
	created: string;
	updated: string;
}

export interface KundliSettings {
	id: string;
	autoGenerationEnabled: boolean;
	autoReleaseEnabled: boolean;
	manualReviewRequired: boolean;
	ayanamsa: string;
	chartStyle: string;
	houseSystem: string;
	reportLanguage: string;
	aiModel: string;
	calculationProvider: string;
	pdfTemplate: string;
	lastErrorLog: string;
}

export const kundliEngineStatusLabel: Record<string, string> = {
	submitted: 'Submitted',
	validating: 'Validating Birth Details',
	calculating: 'Calculating Birth Chart',
	interpreting: 'Generating AI Interpretation',
	creating_pdf: 'Creating PDF',
	awaiting_review: 'Awaiting Review',
	in_progress: 'In Progress',
	under_review: 'Under Review',
	ready: 'Ready for Download',
	completed: 'Completed',
	failed: 'Failed — Needs Attention',
};

export const reportStatusLabel: Record<string, string> = {
	draft: 'Draft',
	generated: 'Generated',
	approved: 'Approved',
	rejected: 'Rejected',
	released: 'Released',
};

export const jobStatusLabel: Record<string, string> = {
	queued: 'Queued',
	processing: 'Processing',
	completed: 'Completed',
	failed: 'Failed',
};
