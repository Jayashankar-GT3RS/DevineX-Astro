import { timingSafeEqual } from 'node:crypto';

/**
 * Verifies that a request comes from a PocketBase hook (or another trusted
 * server-side caller) by comparing its `X-Internal-Secret` header against the
 * shared `INTERNAL_REQUEST_SECRET` environment variable. Used by routes that a
 * hook calls to authenticate the server-side job without a user session.
 */
export function isInternalRequest(request: Request): boolean {
	const expected = process.env.INTERNAL_REQUEST_SECRET;

	if (!expected) {
		throw new Error('INTERNAL_REQUEST_SECRET is not set');
	}

	const given = Buffer.from(request.headers.get('x-internal-secret') ?? '');
	const wanted = Buffer.from(expected);

	return given.length === wanted.length && timingSafeEqual(given, wanted);
}
