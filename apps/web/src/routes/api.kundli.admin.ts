import { apiError, json, readJsonBody, withApi } from '@/lib/api.server';
import { pocketbaseAsUser } from '@/lib/pocketbase-public.server';
import { pocketbaseAdmin } from '@/lib/pocketbase-client.server';
import { generateKundliForRequest, regenerateInterpretation } from '@/lib/kundli/generate.server';
import { groqModel } from '@/lib/kundli/groq.server';
import type { KundliSettings } from '@/lib/kundli/types';

async function requireAdmin(request: Request) {
	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
	const caller = await pocketbaseAsUser(request, token);
	if (!caller) return null;
	if (caller.user.role !== 'admin') return null;
	return caller;
}

/**
 * Admin operations for the Kundli engine: trigger generation, regenerate the AI
 * interpretation, approve/release/reject a report, retry a failed job, and
 * update engine settings. All actions require an administrator session.
 */
export const action = withApi(async ({ request }) => {
	const caller = await requireAdmin(request);
	if (!caller) return apiError(401, 'Admins only');

	const body = await readJsonBody<{ action?: string; requestId?: string; settings?: Partial<KundliSettings> }>(request);
	const { action } = body;

	if (action === 'generate' && body.requestId) {
		try {
			const result = await generateKundliForRequest(body.requestId);
			return json(result);
		} catch (error) {
			return json({ status: 'failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
		}
	}

	if (action === 'regenerate' && body.requestId) {
		try {
			await regenerateInterpretation(body.requestId);
			return json({ status: 'ok', message: 'AI interpretation regenerated.' });
		} catch (error) {
			return json({ status: 'failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
		}
	}

	if (action === 'approve' && body.requestId) {
		await pocketbaseAdmin.updateRecord('kundli_requests', body.requestId, { reportApproved: true });
		const { items } = await pocketbaseAdmin.listRecords<{ id: string }>('kundli_reports', {
			filter: pocketbaseAdmin.filter('request = {:id}', { id: body.requestId }), perPage: 1, sort: '-created',
		});
		if (items[0]) await pocketbaseAdmin.updateRecord('kundli_reports', items[0].id, { reportStatus: 'approved', approvedAt: new Date().toISOString() });
		await pocketbaseAdmin.updateRecord('kundli_requests', body.requestId, { status: 'awaiting_review' });
		return json({ status: 'ok' });
	}

	if (action === 'release' && body.requestId) {
		await pocketbaseAdmin.updateRecord('kundli_requests', body.requestId, {
			status: 'ready', reportApproved: true, reportReleased: true,
		});
		const { items } = await pocketbaseAdmin.listRecords<{ id: string }>('kundli_reports', {
			filter: pocketbaseAdmin.filter('request = {:id}', { id: body.requestId }), perPage: 1, sort: '-created',
		});
		if (items[0]) await pocketbaseAdmin.updateRecord('kundli_reports', items[0].id, { reportStatus: 'released', releasedAt: new Date().toISOString() });
		return json({ status: 'ok' });
	}

	if (action === 'reject' && body.requestId) {
		const { items } = await pocketbaseAdmin.listRecords<{ id: string }>('kundli_reports', {
			filter: pocketbaseAdmin.filter('request = {:id}', { id: body.requestId }), perPage: 1, sort: '-created',
		});
		if (items[0]) await pocketbaseAdmin.updateRecord('kundli_reports', items[0].id, { reportStatus: 'rejected' });
		await pocketbaseAdmin.updateRecord('kundli_requests', body.requestId, { status: 'failed' });
		return json({ status: 'ok' });
	}

	if (action === 'retry' && body.requestId) {
		try {
			const result = await generateKundliForRequest(body.requestId);
			return json(result);
		} catch (error) {
			return json({ status: 'failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
		}
	}

	if (action === 'updateSettings' && body.settings) {
		const { items } = await pocketbaseAdmin.listRecords<{ id: string }>('kundli_settings', { perPage: 1 });
		if (!items[0]) return apiError(404, 'Settings record not found');
		const s = body.settings;
		await pocketbaseAdmin.updateRecord('kundli_settings', items[0].id, {
			autoGenerationEnabled: Boolean(s.autoGenerationEnabled),
			autoReleaseEnabled: Boolean(s.autoReleaseEnabled),
			manualReviewRequired: Boolean(s.manualReviewRequired),
			ayanamsa: s.ayanamsa ?? 'lahiri',
			chartStyle: s.chartStyle ?? 'north',
			houseSystem: s.houseSystem ?? 'whole_sign',
			reportLanguage: s.reportLanguage ?? 'en',
			aiModel: s.aiModel ?? groqModel(),
			calculationProvider: s.calculationProvider ?? 'astronomy-engine',
			pdfTemplate: s.pdfTemplate ?? 'devinex-default',
		});
		return json({ status: 'ok' });
	}

	return apiError(422, 'Unknown action');
});
