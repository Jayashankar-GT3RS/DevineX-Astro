/**
 * Groq API client for Kundli interpretations.
 *
 * Server-only: reads GROQ_API_KEY and must never be imported from a component,
 * route loader for the browser, or any client bundle. The build fails on a
 * client import of a `*.server.ts` module.
 *
 * Groq exposes an OpenAI-compatible Chat Completions endpoint, so this is a
 * focused fetch wrapper rather than a dependency on the Groq SDK: one request
 * shape, explicit timeouts, a single retry for rate limits/transient failures,
 * and errors that read usefully in the admin job log.
 */
import logger from '@/lib/logger.server';

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Groq's current production general-purpose model. Llama 3.3 70B Versatile was
 * retired for developer-tier usage on 16 August 2026; GPT-OSS 120B is Groq's
 * recommended replacement and is strong at long-form structured writing.
 * Override with GROQ_MODEL (see .env) without touching application code.
 */
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 2;
const MAX_RETRY_DELAY_MS = 15_000;
const ERROR_BODY_PREVIEW_CHARS = 300;

/** Legacy/placeholder values stored by the previous Integrated AI engine. */
const LEGACY_MODEL_IDS = new Set(['integrated-ai', '']);

export class GroqError extends Error {
	readonly status?: number;
	readonly retryable: boolean;

	constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
		super(message);
		this.name = 'GroqError';
		this.status = options.status;
		this.retryable = options.retryable ?? false;
	}
}

/** True when a key is present, so callers can fail fast with a clear message. */
export const isGroqConfigured = (): boolean => Boolean(process.env.GROQ_API_KEY?.trim());

/**
 * Model resolution order: GROQ_MODEL env var → a model saved in the admin
 * settings (unless it is a legacy placeholder) → the built-in default.
 */
export const groqModel = (configuredModel?: string | null): string => {
	const fromEnv = process.env.GROQ_MODEL?.trim();
	if (fromEnv) {
		return fromEnv;
	}

	const fromSettings = configuredModel?.trim();
	if (fromSettings && !LEGACY_MODEL_IDS.has(fromSettings)) {
		return fromSettings;
	}

	return DEFAULT_GROQ_MODEL;
};

const timeoutMs = (): number => {
	const raw = Number(process.env.GROQ_TIMEOUT_MS);
	return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelayMs = (response: Response, attempt: number): number => {
	const retryAfter = Number(response.headers.get('retry-after'));
	if (Number.isFinite(retryAfter) && retryAfter > 0) {
		return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS);
	}
	return Math.min(1000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
};

const describeFailure = (status: number, details: string): string => {
	switch (status) {
		case 400:
		case 422:
			return `Groq rejected the interpretation request (${status}): ${details || 'invalid request payload'}`;
		case 401:
		case 403:
			return `Groq rejected the API key (${status}). Check that GROQ_API_KEY in apps/web/.env is valid and active.`;
		case 404:
			return `Groq could not find the configured model (${status}). Set GROQ_MODEL to a model your Groq account can use.`;
		case 413:
			return `Groq rejected the request as too large (413): ${details || 'token limit exceeded'}. Groq counts the maximum completion budget against the per-minute token limit; raise the account tier or lower GROQ_MAX_COMPLETION_TOKENS.`;
		case 429:
			return 'Groq rate limit reached (429). Automatic retry did not clear it; try again in a minute.';
		default:
			if (status >= 500) {
				return `Groq is temporarily unavailable (${status}). Please retry the generation.${details ? ` ${details}` : ''}`;
			}
			return `Groq request failed (${status})${details ? `: ${details}` : ''}`;
	}
};

const isRetryableStatus = (status: number): boolean => status === 429 || status >= 500;

interface GroqChatCompletion {
	choices?: { message?: { content?: string | null }; finish_reason?: string }[];
	error?: { message?: string; type?: string; code?: string };
	usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export interface GroqTextRequest {
	system: string;
	user: string;
	model?: string;
	temperature?: number;
	maxCompletionTokens?: number;
}

/**
 * Groq reserves `max_completion_tokens` against the model's tokens-per-minute
 * budget, so a large ceiling can make even a modest prompt fail with 413 on
 * smaller plans. 4096 is ample for the ~14 report sections.
 */
const defaultMaxCompletionTokens = (): number => {
	const raw = Number(process.env.GROQ_MAX_COMPLETION_TOKENS);
	return Number.isFinite(raw) && raw > 0 ? raw : 4096;
};

/**
 * Sends one system + user turn to Groq and returns the assistant's text.
 *
 * Retries once on 429 and 5xx responses, and on timeouts/network errors. A bad
 * key or an unknown model fails immediately instead of being retried.
 */
export async function generateGroqText({
	system,
	user,
	model = groqModel(),
	temperature = 0.5,
	maxCompletionTokens = defaultMaxCompletionTokens(),
}: GroqTextRequest): Promise<string> {
	const apiKey = process.env.GROQ_API_KEY?.trim();

	if (!apiKey) {
		throw new GroqError(
			'GROQ_API_KEY is not set. Add it to the server environment (apps/web/.env locally, or the host secret store) and retry.',
		);
	}

	const url = process.env.GROQ_API_URL?.trim() || GROQ_CHAT_COMPLETIONS_URL;
	const requestTimeoutMs = timeoutMs();
	let lastError: GroqError | null = null;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		const startedAt = Date.now();

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: user },
					],
					temperature,
					max_completion_tokens: maxCompletionTokens,
					// GPT-OSS is a reasoning model; low effort keeps hidden reasoning
					// from eating the completion budget meant for the report.
					...(model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
					stream: false,
				}),
				signal: AbortSignal.timeout(requestTimeoutMs),
			});

			if (!response.ok) {
				const details = (await response.text().catch(() => '')).slice(0, ERROR_BODY_PREVIEW_CHARS).trim();
				const error = new GroqError(describeFailure(response.status, details), {
					status: response.status,
					retryable: isRetryableStatus(response.status),
				});

				if (error.retryable && attempt < MAX_ATTEMPTS) {
					lastError = error;
					await sleep(retryDelayMs(response, attempt));
					continue;
				}

				throw error;
			}

			const payload = (await response.json()) as GroqChatCompletion;

			if (payload.error?.message) {
				throw new GroqError(`Groq returned an error: ${payload.error.message}`);
			}

			const content = payload.choices?.[0]?.message?.content;

			if (typeof content !== 'string' || !content.trim()) {
				throw new GroqError('Groq returned an empty interpretation. The model may have hit its output limit; retry the generation.', {
					retryable: true,
				});
			}

			logger.info(
				`Groq interpretation generated with ${model} in ${Date.now() - startedAt}ms`
					+ (payload.usage?.total_tokens ? ` (${payload.usage.total_tokens} tokens)` : ''),
			);

			return content.trim();
		} catch (error) {
			if (error instanceof GroqError) {
				if (error.retryable && attempt < MAX_ATTEMPTS) {
					lastError = error;
					await sleep(retryDelayMs(new Response(null), attempt));
					continue;
				}

				throw error;
			}

			const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
			const wrapped = new GroqError(
				timedOut
					? `Groq did not respond within ${Math.round(requestTimeoutMs / 1000)}s. Please retry the generation.`
					: `Could not reach Groq: ${error instanceof Error ? error.message : String(error)}`,
				{ retryable: true },
			);

			if (attempt < MAX_ATTEMPTS) {
				lastError = wrapped;
				await sleep(retryDelayMs(new Response(null), attempt));
				continue;
			}

			throw wrapped;
		}
	}

	throw lastError ?? new GroqError('Groq request failed after retries.');
}
