import { apiError, json, readJsonBody, withApi } from '@/lib/api.server';
import { buildInstantChart, type ChartPayload } from '@/lib/kundli/preview.server';

/**
 * Public, unauthenticated instant chart calculation used by /free-kundli.
 * Returns the same astronomically calculated chart the paid report is built
 * from; no interpretation is generated here and nothing is stored.
 */
export const action = withApi(async ({ request }) => {
	const payload = await readJsonBody<ChartPayload>(request);

	try {
		const result = await buildInstantChart(payload);
		return json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not calculate this chart.';
		return apiError(422, message);
	}
});
