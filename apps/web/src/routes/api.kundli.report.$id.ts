import { apiError, json, withApi } from '@/lib/api.server';
import { pocketbaseAsUser } from '@/lib/pocketbase-public.server';
import { pocketbaseAdmin } from '@/lib/pocketbase-client.server';
import type { KundliRequest } from '@/lib/types';
import type { KundliCalculationRecord, KundliReportRecord } from '@/lib/kundli/types';

/**
 * Returns the AI interpretation for one Kundli request to its owner (or an
 * admin) as structured sections, so the existing /my-kundli dashboard can
 * render it in the page instead of only offering the PDF.
 *
 * POST, not GET: the response is per-user, and the platform edge cache stores
 * GET /api/* responses by URL for every visitor. Authentication and the
 * ownership check mirror the PDF download route; the report itself stays in an
 * admin-only PocketBase collection and is read here with the server client
 * after the check passes.
 */
export const action = withApi(async ({ request, params }) => {
	const id = params.id;
	if (!id) {
		return apiError(422, 'Request id is required');
	}

	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
	const caller = await pocketbaseAsUser(request, token);

	if (!caller) {
		return apiError(401, 'Sign in first');
	}

	const kundliRequest = await pocketbaseAdmin
		.getRecord<KundliRequest>('kundli_requests', id)
		.catch(() => null);

	if (!kundliRequest) {
		return apiError(404, 'Kundli request not found');
	}

	const isOwner = kundliRequest.customer === caller.user.id;
	const isAdmin = caller.user.role === 'admin';
	if (!isOwner && !isAdmin) {
		return apiError(403, 'You are not authorized to view this interpretation');
	}

	const { items: reports } = await pocketbaseAdmin.listRecords<KundliReportRecord>('kundli_reports', {
		filter: pocketbaseAdmin.filter('request = {:id}', { id }),
		perPage: 1,
		sort: '-created',
	});
	const report = reports[0];

	if (!report) {
		return json({
			available: false,
			requestId: kundliRequest.requestId,
			status: kundliRequest.status,
		});
	}

	const { items: calculations } = await pocketbaseAdmin.listRecords<KundliCalculationRecord>('kundli_calculations', {
		filter: pocketbaseAdmin.filter('request = {:id}', { id }),
		perPage: 1,
		sort: '-created',
	});
	const calculation = calculations[0];
	const calc = calculation?.calculationData;

	const sections = (report.interpretationData?.sections ?? [])
		.filter(section => section && typeof section.title === 'string' && typeof section.body === 'string')
		.slice(0, 30);

	return json({
		available: true,
		requestId: kundliRequest.requestId,
		status: kundliRequest.status,
		aiModel: report.aiModel,
		reportStatus: report.reportStatus,
		generatedAt: report.generatedAt,
		sections,
		chart: calc
			? {
				ascendant: calc.ascendant.sign,
				ascendantNakshatra: calc.ascendant.nakshatra,
				moonSign: calc.moonSign,
				sunSign: calc.sunSign,
				janmaNakshatra: calc.janmaNakshatra,
				nakshatraPada: calc.nakshatraPada,
				ayanamsa: calc.ayanamsa,
				planets: calc.planets.map(planet => ({
					name: planet.name,
					sign: planet.sign,
					degreeInSign: planet.degreeInSign,
					house: planet.house,
					nakshatra: planet.nakshatra,
					pada: planet.pada,
					retrograde: planet.retrograde,
					dignity: planet.dignity,
				})),
			}
			: null,
		limitations: calc?.limitations ?? [],
	});
});
