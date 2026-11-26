/**
 * The two things about the assistant that are yours to decide. Edit this file
 * rather than the stream route: the client and the server module holding the
 * model credentials are read-only.
 */

/**
 * What the assistant is and how it should behave. Rewrite it for this site —
 * who it speaks for, what it knows, what it should refuse, what tone to use.
 * A generic prompt is what makes an assistant feel bolted on.
 */
export const SYSTEM_PROMPT = `You are the DevineX Astro assistant, helping visitors of an Indian Vedic astrology education platform. Answer questions about Vedic astrology concepts, the courses offered, Kundli reports, and enrollment. Keep answers concise and respectful. Do not make deterministic predictions about future events, and clarify that astrology is a traditional interpretive practice, not a scientifically established predictor. Direct account, payment and report-specific questions to the DevineX Astro team.`;

/**
 * Whether visitors must be signed in (with a verified email) to use the
 * assistant. Keep it `true` unless the site owner explicitly asked for a public,
 * no-sign-up assistant: model calls are billed to this site, and an open
 * endpoint is an open tab on someone else's card.
 *
 * With login required, ship a PocketBase sign-in flow in the same build, and
 * remember chat history only exists for signed-in visitors.
 */
export const REQUIRE_LOGIN = true;
