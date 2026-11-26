import { apiError, json, withApi } from '@/lib/api.server';
import { pocketbaseAsUser } from '@/lib/pocketbase-public.server';
import { pocketbaseAdmin } from '@/lib/pocketbase-client.server';
import type { KundliRequest } from '@/lib/types';

/**
 * Links Kundli requests submitted with the caller's email to their verified
 * account. Called by the /my-kundli dashboard after login so a customer sees
 * the request they submitted before registering. The caller is verified via
 * their PocketBase token (email-OTP login proves email ownership), so linking
 * by email is safe: only the email's true owner can claim its requests.
 */
export const action = withApi(async ({ request }) => {
	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
	const caller = await pocketbaseAsUser(request, token);

	if (!caller) {
		return apiError(401, 'Sign in first');
	}

	const result = await pocketbaseAdmin.listRecords<KundliRequest>('kundli_requests', {
		filter: pocketbaseAdmin.filter('email = {:email}', { email: caller.user.email }),
		perPage: 100,
	});

	let linked = 0;
	for (const req of result.items) {
		if (!req.customer) {
			await pocketbaseAdmin.updateRecord('kundli_requests', req.id, { customer: caller.user.id });
			linked += 1;
		}
	}

	return json({ linked });
});
