import { apiError, readJsonBody, withApi } from '@/lib/api.server';
import { generateChartPdf } from '@/lib/kundli/pdf.server';
import { buildInstantChart, type ChartPayload } from '@/lib/kundli/preview.server';

/** Public instant chart PDF: the calculated chart, positions, panchang and dashas. */
export const action = withApi(async ({ request }) => {
	const payload = await readJsonBody<ChartPayload>(request);

	let result;
	try {
		result = await buildInstantChart(payload);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not calculate this chart.';
		return apiError(422, message);
	}

	const pdf = await generateChartPdf({
		calc: result.chart,
		fullName: String(payload.fullName ?? '').trim() || 'Seeker',
		gender: String(payload.gender ?? '').trim(),
	});

	const name = `DevineXAstro_Kundli_Chart_${result.chart.utcTime.slice(0, 10)}.pdf`;

	return new Response(new Uint8Array(pdf), {
		status: 200,
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${name}"`,
			'Cache-Control': 'no-store',
		},
	});
});
