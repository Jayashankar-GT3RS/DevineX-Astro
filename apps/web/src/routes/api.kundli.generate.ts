import { apiError, json, readJsonBody, withApi } from '@/lib/api.server';
import { pocketbaseAsUser } from '@/lib/pocketbase-public.server';
import { generateKundliForRequest } from '@/lib/kundli/generate.server';
import { isInternalRequest } from '@/lib/internal-request.server';

/**
 * Triggers automated Kundli generation for a request. Called either by the
 * PocketBase `kundli-auto-generate` hook (proven by the internal request
 * secret) when automatic generation is enabled, or by an administrator
 * (proven by their PocketBase token + admin role) for a manual trigger.
 */
export const action = withApi(async ({ request }) => {
	const { requestId } = await readJsonBody<{ requestId?: string }>(request);
	if (!requestId) return apiError(422, 'requestId is required');

	const isHook = isInternalRequest(request);
	if (!isHook) {
		const authHeader = request.headers.get('Authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
		const caller = await pocketbaseAsUser(request, token);
		if (!caller) return apiError(401, 'Sign in first');
		if (caller.user.role !== 'admin') return apiError(403, 'Admins only');
	}

	try {
		const result = await generateKundliForRequest(requestId);
		return json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return json({ status: 'failed', message }, { status: 500 });
	}
});
