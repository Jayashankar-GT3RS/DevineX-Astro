/**
 * Branded Kundli PDF generator.
 *
 * Builds an A4 portrait PDF with DevineX Astro branding (midnight blue, royal
 * purple, gold), a North Indian style birth-chart diagram, a planetary position
 * table, a Vimshottari dasha timeline, and the AI-generated interpretation
 * sections. Returns a Buffer to be stored as a protected file on the request.
 */
import PDFDocument from 'pdfkit';
import type { KundliCalculationData, InterpretationReport } from './types';

const NAVY = '#0c1023';
const PURPLE = '#342154';
const GOLD = '#dabb7a';
const SOFT = '#a8adc4';
const LIGHT = '#eee9e1';
const LINE = '#3a3f5a';

const RASHI_SHORT = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const PLANET_SHORT: Record<string, string> = {
	Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
	Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

export interface PdfInput {
	calc: KundliCalculationData;
	report: InterpretationReport;
	customerName: string;
	dateOfBirth: string;
	timeOfBirth: string;
	placeOfBirth: string;
	requestId: string;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

function heading(doc: PDFKit.PDFDocument, text: string, y: number, size = 14): number {
	doc.fillColor(GOLD).fontSize(size).font('Helvetica-Bold').text(text, MARGIN, y, { width: CONTENT_WIDTH });
	const h = doc.heightOfString(text, { width: CONTENT_WIDTH });
	doc.moveTo(MARGIN, y + h + 4).lineTo(A4_WIDTH - MARGIN, y + h + 4).strokeColor(LINE).lineWidth(0.5).stroke();
	return y + h + 14;
}

function body(doc: PDFKit.PDFDocument, text: string, y: number, color = SOFT): number {
	doc.fillColor(color).fontSize(10).font('Helvetica').text(text, MARGIN, y, { width: CONTENT_WIDTH, lineGap: 4, align: 'justify' });
	return y + doc.heightOfString(text, { width: CONTENT_WIDTH, lineGap: 4, align: 'justify' }) + 12;
}

/** Draws a North Indian style chart square with planets placed by house. */
function drawNorthChart(doc: PDFKit.PDFDocument, calc: KundliCalculationData, x: number, y: number, size: number): void {
	const s = size;
	// Square
	doc.lineWidth(1).strokeColor(GOLD);
	doc.rect(x, y, s, s).stroke();
	// Diagonals
	doc.moveTo(x, y).lineTo(x + s, y + s).stroke();
	doc.moveTo(x + s, y).lineTo(x, y + s).stroke();
	// Diamond (midpoints)
	const cx = x + s / 2, cy = y + s / 2;
	doc.moveTo(x + s / 2, y).lineTo(x + s, y + s / 2).lineTo(x + s / 2, y + s).lineTo(x, y + s / 2).closePath().stroke();

	// 12 house text positions (fraction of s), house number -> position.
	const positions: Record<number, [number, number]> = {
		1: [0.50, 0.20], 2: [0.78, 0.22], 3: [0.85, 0.50], 4: [0.78, 0.78],
		5: [0.50, 0.85], 6: [0.22, 0.78], 7: [0.15, 0.50], 8: [0.22, 0.22],
		9: [0.50, 0.42], 10: [0.60, 0.50], 11: [0.50, 0.58], 12: [0.40, 0.50],
	};

	// Sign in each house (whole sign: house N has sign (ascSign + N - 1) % 12).
	const ascSign = calc.ascendant.signIndex;
	for (let h = 1; h <= 12; h++) {
		const [fx, fy] = positions[h];
		const px = x + fx * s;
		const py = y + fy * s;
		const signIdx = (ascSign + h - 1) % 12;
		doc.fillColor(GOLD).fontSize(8).font('Helvetica-Bold').text(String(signIdx + 1), px - 3, py - 14, { width: 20, align: 'center' });
		// Planets in this house.
		const here = calc.planets.filter(p => p.house === h);
		if (here.length) {
			const labels = here.map(p => PLANET_SHORT[p.name] + (p.retrograde ? '(R)' : '')).join(' ');
			doc.fillColor(LIGHT).fontSize(7).font('Helvetica').text(labels, px - 30, py - 2, { width: 60, align: 'center' });
		}
	}
	// Ascendant marker
	doc.fillColor(GOLD).fontSize(7).font('Helvetica-Bold').text('Asc', x + s / 2 - 30, y + s / 2 - 8, { width: 20, align: 'center' });
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
	if (y + needed > A4_HEIGHT - MARGIN) {
		doc.addPage({ margin: MARGIN });
		addPageHeader(doc);
		return MARGIN + 24;
	}
	return y;
}

function addPageHeader(doc: PDFKit.PDFDocument): void {
	doc.fillColor(SOFT).fontSize(7).font('Helvetica').text('DevineX Astro — Personalized Vedic Kundli Report', MARGIN, 28, { width: CONTENT_WIDTH, align: 'center' });
}

export function generateKundliPdf(input: PdfInput): Promise<Buffer> {
	const { calc, report, customerName, dateOfBirth, timeOfBirth, placeOfBirth, requestId } = input;
	const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });

	const chunks: Buffer[] = [];
	doc.on('data', (c: Buffer) => chunks.push(c));
	const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

	// --- Cover page ---
	doc.rect(0, 0, A4_WIDTH, A4_HEIGHT).fillColor(NAVY).fill();
	doc.fillColor(PURPLE).rect(0, 0, A4_WIDTH, 8).fill();
	doc.fillColor(GOLD).rect(0, A4_HEIGHT - 8, A4_WIDTH, 8).fill();

	doc.fillColor(GOLD).fontSize(11).font('Helvetica-Bold').text('DEVINEX ASTRO', MARGIN, 180, { width: CONTENT_WIDTH, align: 'center' });
	doc.fillColor(LIGHT).fontSize(9).font('Helvetica').text('Ancient Wisdom. Modern Learning.', MARGIN, 200, { width: CONTENT_WIDTH, align: 'center' });

	doc.moveDown(4);
	doc.fillColor(LIGHT).fontSize(22).font('Helvetica-Bold').text('Personalized Vedic', MARGIN, 260, { width: CONTENT_WIDTH, align: 'center' });
	doc.fillColor(GOLD).fontSize(22).font('Helvetica-Bold').text('Kundli Report', MARGIN, 290, { width: CONTENT_WIDTH, align: 'center' });

	const coverDetails = [
		['Name', customerName],
		['Date of Birth', dateOfBirth],
		['Time of Birth', timeOfBirth],
		['Place of Birth', placeOfBirth],
		['Report ID', requestId],
		['Generated On', new Date().toLocaleDateString('en-IN', { timeZone: 'UTC' })],
	];
	let cy = 380;
	for (const [label, value] of coverDetails) {
		doc.fillColor(SOFT).fontSize(10).font('Helvetica').text(label, MARGIN + 120, cy, { width: 150, align: 'left' });
		doc.fillColor(LIGHT).fontSize(10).font('Helvetica-Bold').text(String(value || '—'), MARGIN + 280, cy, { width: 200, align: 'left' });
		cy += 26;
	}

	doc.fillColor(SOFT).fontSize(8).font('Helvetica-Oblique').text(
		'This report is generated using astronomical calculations and traditional Vedic astrological interpretation. It is intended for informational, cultural and personal-interest purposes only.',
		MARGIN, A4_HEIGHT - 90, { width: CONTENT_WIDTH, align: 'center' },
	);

	// --- Page 2: Birth details + profile ---
	doc.addPage({ margin: MARGIN });
	addPageHeader(doc);
	let y = MARGIN + 24;
	y = heading(doc, 'Section 2 — Birth Details Summary', y);
	const settings = [
		['Birthplace (resolved)', calc.birthplaceName],
		['Coordinates', `${calc.latitude}, ${calc.longitude}`],
		['Timezone', calc.timezone],
		['UTC Time', calc.utcTime],
		['Birth time accuracy', calc.birthTimeAccuracy],
		['Calculation engine', `${calc.engineName} ${calc.engineVersion}`],
		['Ayanamsa', `${calc.ayanamsa} (${calc.ayanamsaValue}°)`],
		['Chart style', calc.chartStyle],
		['House system', calc.houseSystem],
		['Validation status', calc.validationStatus],
	];
	for (const [label, value] of settings) {
		doc.fillColor(SOFT).fontSize(10).font('Helvetica').text(label, MARGIN, y, { width: 200 });
		doc.fillColor(LIGHT).fontSize(10).font('Helvetica-Bold').text(String(value || '—'), MARGIN + 210, y, { width: CONTENT_WIDTH - 210 });
		y += 20;
	}
	if (calc.limitations.length) {
		y += 6;
		doc.fillColor('#ff9ca7').fontSize(9).font('Helvetica-Oblique').text('Limitations: ' + calc.limitations.join(' '), MARGIN, y, { width: CONTENT_WIDTH });
		y += 30;
	}

	y = ensureSpace(doc, y, 120);
	y = heading(doc, 'Section 3 — Your Vedic Astrology Profile', y);
	const profile = [
		['Ascendant (Lagna)', `${calc.ascendant.sign} — Nakshatra: ${calc.ascendant.nakshatra} (Pada ${calc.ascendant.pada})`],
		['Moon Sign (Chandra Rashi)', calc.moonSign],
		['Sun Sign (Surya Rashi)', calc.sunSign],
		['Janma Nakshatra', `${calc.janmaNakshatra} (Pada ${calc.nakshatraPada})`],
	];
	for (const [label, value] of profile) {
		doc.fillColor(SOFT).fontSize(10).font('Helvetica').text(label, MARGIN, y, { width: 200 });
		doc.fillColor(LIGHT).fontSize(10).font('Helvetica-Bold').text(value, MARGIN + 210, y, { width: CONTENT_WIDTH - 210 });
		y += 22;
	}

	// --- Chart diagram ---
	y = ensureSpace(doc, y, 260);
	y = heading(doc, 'Section 4 — Janam Kundli Chart (North Indian)', y);
	drawNorthChart(doc, calc, MARGIN + 40, y, 220);
	doc.fillColor(SOFT).fontSize(8).font('Helvetica-Oblique').text(
		'Numbers indicate the Vedic sign (1=Aries … 12=Pisces) in each house. House 1 (top) holds the ascendant. (R) denotes a retrograde planet.',
		MARGIN, y + 230, { width: CONTENT_WIDTH },
	);
	y += 260;

	// --- Planetary table ---
	y = ensureSpace(doc, y, 160);
	y = heading(doc, 'Section 5 — Planetary Position Table', y);
	const cols = ['Planet', 'Sign', 'Degree', 'House', 'Nakshatra', 'Pada', 'Retro'];
	const colX = [MARGIN, MARGIN + 90, MARGIN + 150, MARGIN + 210, MARGIN + 270, MARGIN + 390, MARGIN + 440];
	doc.fillColor(GOLD).fontSize(8).font('Helvetica-Bold');
	cols.forEach((c, i) => doc.text(c, colX[i], y, { width: 60 }));
	y += 16;
	doc.font('Helvetica').fontSize(8).fillColor(LIGHT);
	for (const p of calc.planets) {
		y = ensureSpace(doc, y, 16);
		const row = [p.name, p.sign, p.degreeInSign.toFixed(2) + '°', String(p.house), p.nakshatra, String(p.pada), p.retrograde ? 'Yes' : 'No'];
		row.forEach((c, i) => doc.text(c, colX[i], y, { width: i === 4 ? 110 : 60 }));
		y += 15;
	}

	// --- Interpretation sections ---
	const sectionMap = new Map(report.sections.map(s => [s.title.toLowerCase(), s]));
	const sectionOrder = [
		['Section 6 — Basic Birth Chart Overview', 'basic birth chart overview'],
		['Section 7 — Ascendant (Lagna) Interpretation', 'ascendant (lagna) interpretation'],
		['Section 8 — Moon Sign and Nakshatra', 'moon sign and nakshatra'],
		['Section 9 — Planetary Positions and Interpretations', 'planetary positions and interpretations'],
		['Section 10 — Personality and Characteristics', 'personality and characteristics'],
		['Section 11 — Career and Professional Life', 'career and professional life'],
		['Section 12 — Relationships and Marriage', 'relationships and marriage'],
		['Section 13 — Financial Aspects', 'financial aspects'],
		['Section 14 — General Life Insights', 'general life insights'],
		['Section 15 — Yoga Analysis', 'yoga analysis'],
		['Section 16 — Dosha Analysis', 'dosha analysis'],
		['Section 17 — Mahadasha and Antardasha', 'mahadasha and antardasha'],
		['Section 18 — Traditional Guidance', 'traditional guidance'],
		['Section 19 — Summary', 'summary'],
	];

	const writeSection = (title: string, text: string): void => {
		y = ensureSpace(doc, y, 60);
		y = heading(doc, title, y, 12);
		for (const para of text.split(/\n\n+/)) {
			const h = doc.heightOfString(para, { width: CONTENT_WIDTH, lineGap: 4, align: 'justify' });
			y = ensureSpace(doc, y, h + 12);
			y = body(doc, para, y);
		}
	};

	let matchedSections = 0;
	for (const [title, key] of sectionOrder) {
		const section = sectionMap.get(key);
		if (section) matchedSections += 1;
		writeSection(title, section?.body || 'No data available for this section based on the validated calculations.');
	}

	// Reports generated by the previous engine used different section titles.
	// Render whatever structured sections they stored rather than only placeholders.
	if (matchedSections === 0) {
		for (const section of report.sections) {
			writeSection(section.title, section.body || 'No data available for this section.');
		}
	}

	// --- Dasha timeline (compact) ---
	y = ensureSpace(doc, y, 80);
	y = heading(doc, 'Vimshottari Dasha Timeline', y, 12);
	doc.fillColor(SOFT).fontSize(8).font('Helvetica');
	for (const d of calc.dashas.slice(0, 9)) {
		y = ensureSpace(doc, y, 16);
		const start = d.start.slice(0, 10);
		const end = d.end.slice(0, 10);
		doc.fillColor(GOLD).font('Helvetica-Bold').text(d.lord, MARGIN, y, { width: 80 });
		doc.fillColor(LIGHT).font('Helvetica').text(`${start} → ${end}`, MARGIN + 90, y, { width: 200 });
		doc.fillColor(SOFT).text('Antardashas: ' + d.antardashas.slice(0, 3).map(a => a.lord).join(', '), MARGIN + 300, y, { width: CONTENT_WIDTH - 300 });
		y += 15;
	}

	// --- Disclaimer ---
	y = ensureSpace(doc, y, 80);
	y = heading(doc, 'Section 20 — Disclaimer', y, 12);
	y = body(doc, 'DevineX Astro reports provide traditional Vedic astrology interpretations for informational, cultural and personal-interest purposes. Astrology has not been scientifically established as a reliable predictor of future events. These reports should not replace qualified medical, legal, financial or other professional advice.', y, LIGHT);

	// Page numbers
	const range = doc.bufferedPageRange();
	for (let i = range.start; i < range.start + range.count; i++) {
		doc.switchToPage(i);
		if (i > 0) {
			doc.fillColor(SOFT).fontSize(7).font('Helvetica').text(`Page ${i + 1} of ${range.start + range.count}`, MARGIN, A4_HEIGHT - 30, { width: CONTENT_WIDTH, align: 'center' });
		}
	}

	doc.end();
	return done;
}
