import type { ChartStyle, KundliCalculationData, PlanetPlacement } from '@/lib/kundli/types';

/**
 * Real birth-chart diagrams drawn from the calculated planetary positions.
 * Two traditional layouts:
 *  - North Indian: houses are fixed, the ascendant house sits at the top and
 *    the signs rotate clockwise from it.
 *  - South Indian: signs are fixed in a 4x4 grid, planets sit in their sign.
 */

const PLANET_ABBR: Record<string, string> = {
	Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
	Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

const SIGN_SHORT = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

// House 1..12 -> { signNumber: [x, y], planets: [x, y] } in a 400x400 viewBox.
const NORTH_POS: { sign: [number, number]; planets: [number, number] }[] = [
	{ sign: [200, 32], planets: [200, 100] },
	{ sign: [100, 22], planets: [100, 62] },
	{ sign: [22, 100], planets: [62, 100] },
	{ sign: [32, 200], planets: [100, 200] },
	{ sign: [22, 300], planets: [62, 300] },
	{ sign: [100, 378], planets: [100, 338] },
	{ sign: [200, 368], planets: [200, 300] },
	{ sign: [300, 378], planets: [300, 338] },
	{ sign: [378, 300], planets: [338, 300] },
	{ sign: [368, 200], planets: [300, 200] },
	{ sign: [378, 100], planets: [338, 100] },
	{ sign: [300, 22], planets: [300, 62] },
];

// South Indian grid: sign index -> [column, row].
const SOUTH_POS: Record<number, [number, number]> = {
	11: [0, 0], 0: [1, 0], 1: [2, 0], 2: [3, 0],
	10: [0, 1], 3: [3, 1],
	9: [0, 2], 4: [3, 2],
	8: [0, 3], 7: [1, 3], 6: [2, 3], 5: [3, 3],
};

function PlanetStack({ planets, x, y }: { planets: PlanetPlacement[]; x: number; y: number }) {
	if (!planets.length) return null;
	const lines = planets.map(p => `${PLANET_ABBR[p.name] ?? p.name}${p.retrograde ? 'R' : ''} ${Math.floor(p.degreeInSign)}°`);
	const lineHeight = lines.length > 4 ? 10 : 12;
	const fontSize = lines.length > 4 ? 7.5 : 9;
	const startY = y - ((lines.length - 1) * lineHeight) / 2 + fontSize / 3;

	return (
		<text x={x} y={startY} textAnchor="middle" fontSize={fontSize} fill="#eee9e1" fontFamily="Manrope, sans-serif">
			{lines.map((line, i) => (
				<tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>{line}</tspan>
			))}
		</text>
	);
}

function NorthChart({ chart }: { chart: KundliCalculationData }) {
	const ascSign = chart.ascendant.signIndex;

	return (
		<svg viewBox="0 0 400 400" className="fk-chart-svg" role="img" aria-label="North Indian birth chart">
			<rect x="1" y="1" width="398" height="398" rx="2" fill="#0e1225" stroke="#dabb7a" strokeWidth="1.4" />
			<g stroke="#dabb7a" strokeOpacity="0.55" strokeWidth="1" fill="none">
				<line x1="1" y1="1" x2="399" y2="399" />
				<line x1="399" y1="1" x2="1" y2="399" />
				<polygon points="200,1 399,200 200,399 1,200" />
			</g>
			{NORTH_POS.map((pos, i) => {
				const house = i + 1;
				const signIndex = (ascSign + i) % 12;
				const planets = chart.planets.filter(p => p.house === house);
				return (
					<g key={house}>
						<text
							x={pos.sign[0]}
							y={pos.sign[1]}
							textAnchor="middle"
							fontSize="9"
							fontWeight="700"
							fill="#dabb7a"
							fontFamily="Manrope, sans-serif"
						>
							{signIndex + 1}
						</text>
						{house === 1 && (
							<text x={pos.sign[0]} y={pos.sign[1] + 11} textAnchor="middle" fontSize="7" fill="#a8adc4" fontFamily="Manrope, sans-serif">
								Asc
							</text>
						)}
						<PlanetStack planets={planets} x={pos.planets[0]} y={pos.planets[1]} />
					</g>
				);
			})}
		</svg>
	);
}

function SouthChart({ chart }: { chart: KundliCalculationData }) {
	const cell = 100;
	const ascSign = chart.ascendant.signIndex;

	return (
		<svg viewBox="0 0 400 400" className="fk-chart-svg" role="img" aria-label="South Indian birth chart">
			<rect x="1" y="1" width="398" height="398" rx="2" fill="#0e1225" stroke="#dabb7a" strokeWidth="1.4" />
			<g stroke="#dabb7a" strokeOpacity="0.5" strokeWidth="1">
				<line x1="100" y1="1" x2="100" y2="399" />
				<line x1="200" y1="1" x2="200" y2="399" />
				<line x1="300" y1="1" x2="300" y2="399" />
				<line x1="1" y1="100" x2="399" y2="100" />
				<line x1="1" y1="200" x2="399" y2="200" />
				<line x1="1" y1="300" x2="399" y2="300" />
			</g>
			<rect x="101" y="101" width="198" height="198" fill="#161a2e" stroke="#dabb7a" strokeOpacity="0.5" />
			<text x="200" y="196" textAnchor="middle" fontSize="11" fill="#dabb7a" fontFamily="Manrope, sans-serif" fontWeight="700">
				Rashi Chart
			</text>
			<text x="200" y="214" textAnchor="middle" fontSize="8" fill="#a8adc4" fontFamily="Manrope, sans-serif">
				South Indian
			</text>

			{Object.entries(SOUTH_POS).map(([signKey, [col, row]]) => {
				const signIndex = Number(signKey);
				const x = col * cell;
				const y = row * cell;
				const planets = chart.planets.filter(p => p.signIndex === signIndex);
				return (
					<g key={signIndex}>
						<text x={x + 6} y={y + 14} fontSize="9" fontWeight="700" fill="#dabb7a" fontFamily="Manrope, sans-serif">
							{SIGN_SHORT[signIndex]} {signIndex + 1}
						</text>
						{signIndex === ascSign && (
							<text x={x + cell - 26} y={y + 14} fontSize="7" fill="#a8adc4" fontFamily="Manrope, sans-serif">
								Asc
							</text>
						)}
						<PlanetStack planets={planets} x={x + cell / 2} y={y + 56} />
					</g>
				);
			})}
		</svg>
	);
}

export function KundliChart({ chart, style }: { chart: KundliCalculationData; style: ChartStyle }) {
	return (
		<div className="fk-chart">
			{style === 'south' ? <SouthChart chart={chart} /> : <NorthChart chart={chart} />}
			<p className="fk-chart-note">
				{style === 'south'
					? 'South Indian chart — signs stay fixed; planets appear in the sign they occupy. Asc marks your ascendant sign.'
					: 'North Indian chart — house 1 (top) is your ascendant; signs rotate clockwise from it. Numbers are Vedic signs (1 = Aries … 12 = Pisces).'}
				{' '}R marks a retrograde planet.
			</p>
		</div>
	);
}
