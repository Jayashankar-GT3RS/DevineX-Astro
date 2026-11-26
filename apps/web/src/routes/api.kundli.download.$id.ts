import { apiError, withApi } from '@/lib/api.server';
import { pocketbaseAsUser } from '@/lib/pocketbase-public.server';
import { pocketbaseAdmin } from '@/lib/pocketbase-client.server';
import type { KundliRequest } from '@/lib/types';

const POCKETBASE_URL = () => process.env.POCKETBASE_URL || 'http://localhost:8090';

/**
 * Secure Kundli PDF download. Verifies the caller, checks ownership and that
 * the report has been approved and released, then proxies the protected file
 * bytes from PocketBase. The file never has a public URL — only this
 * authenticated, ownership-checked endpoint can serve it.
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

	const req = await pocketbaseAdmin.getRecord<KundliRequest>('kundli_requests', id);

	// Ownership check: only the linked customer or an admin may download.
	const isOwner = req.customer === caller.user.id;
	const isAdmin = caller.user.role === 'admin';
	if (!isOwner && !isAdmin) {
		return apiError(403, 'You are not authorized to download this report');
	}

	// The report must be approved and released before download.
	if (!req.reportReleased || req.status !== 'ready') {
		return apiError(403, 'Your report is not yet available for download');
	}

	const filename = req.reportPdf;
	if (!filename) {
		return apiError(404, 'No report file is attached to this request');
	}

	// Fetch the protected file from PocketBase using a short-lived admin token.
	const fileToken = await pocketbaseAdmin.getFileToken();
	const fileUrl = `${POCKETBASE_URL()}/api/files/kundli_requests/${id}/${encodeURIComponent(filename)}?token=${fileToken}`;
	const upstream = await fetch(fileUrl);

	if (!upstream.ok) {
		throw new Error(`kundli file fetch failed: ${upstream.status} ${upstream.statusText}`);
	}

	const buffer = Buffer.from(await upstream.arrayBuffer());

	// Audit log the download.
	await pocketbaseAdmin.updateRecord('kundli_requests', id, {
		downloadCount: (req.downloadCount || 0) + 1,
		lastDownloadAt: new Date().toISOString(),
	});

	const safeName = (req.requestId || id).replace(/[^a-zA-Z0-9-]/g, '');

	return new Response(buffer, {
		status: 200,
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="DevineX-Astro-Kundli-${safeName}.pdf"`,
			'Cache-Control': 'private, no-store',
		},
	});
});
