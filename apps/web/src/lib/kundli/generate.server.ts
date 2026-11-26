/**
 * Kundli generation orchestrator.
 *
 * Runs the full pipeline for one request: validate birth details → calculate
 * the chart → generate the AI interpretation → build the PDF → store everything
 * privately and link it to the customer's request. Idempotent: a request that
 * already has a completed report is not regenerated.
 *
 * All PocketBase writes use the superuser client because the calculation,
 * report and job collections are admin-only and this runs as a server-side job
 * (triggered by a PocketBase hook or an administrator), not as a visitor.
 */
import { pocketbaseAdmin } from '@/lib/pocketbase-client.server';
import logger from '@/lib/logger.server';
import { calculateKundli, ENGINE_NAME, ENGINE_VERSION, PROMPT_VERSION } from './calculation.server';
import { generateInterpretation } from './interpretation.server';
import { generateKundliPdf } from './pdf.server';
import { groqModel, isGroqConfigured } from './groq.server';
import type { KundliSettings, KundliCalculationData } from './types';

interface KundliRequestRecord {
	id: string;
	fullName: string;
	email: string;
	dateOfBirth: string;
	timeOfBirth: string;
	placeOfBirth: string;
	birthState: string;
	birthCountry: string;
	birthTimeAccuracy: string;
	customer: string;
	status: string;
	reportPdf: string;
	reportApproved: boolean;
	reportReleased: boolean;
}

async function loadSettings(): Promise<KundliSettings | null> {
	try {
		const { items } = await pocketbaseAdmin.listRecords<KundliSettings>('kundli_settings', { perPage: 1 });
		return items[0] ?? null;
	} catch {
		return null;
	}
}

async function updateRequest(id: string, patch: Record<string, unknown>): Promise<void> {
	await pocketbaseAdmin.updateRecord('kundli_requests', id, patch);
}

async function findJob(requestId: string) {
	const { items } = await pocketbaseAdmin.listRecords<{ id: string; processingStatus: string; attempts: number }>('generation_jobs', {
		filter: pocketbaseAdmin.filter('request = {:id}', { id: requestId }),
		perPage: 1,
		sort: '-created',
	});
	return items[0] ?? null;
}

/**
 * Runs the generation pipeline for a request. Returns a summary of what happened.
 * Throws on failure; the caller is expected to record the error on the job.
 */
export async function generateKundliForRequest(requestId: string): Promise<{ status: string; message: string }> {
	const req = await pocketbaseAdmin.getRecord<KundliRequestRecord>('kundli_requests', requestId);
	const settings = await loadSettings();

	// Idempotency: skip if a report PDF is already attached and released/approved.
	if (req.reportPdf && req.reportApproved) {
		return { status: 'skipped', message: 'Report already generated and approved for this request.' };
	}

	// Fail before any calculation is stored when the LLM is not configured: the
	// admin job log then names the missing setting instead of a generic failure.
	if (!isGroqConfigured()) {
		throw new Error(
			'GROQ_API_KEY is not configured on the server. Add it to apps/web/.env (or the host secret store) before generating AI interpretations.',
		);
	}

	const aiModel = groqModel(settings?.aiModel);

	// Create or update the generation job.
	let job = await findJob(requestId);
	const attempts = (job?.attempts ?? 0) + 1;
	if (job) {
		await pocketbaseAdmin.updateRecord('generation_jobs', job.id, {
			processingStatus: 'processing', attempts, errorMessage: '', startedAt: new Date().toISOString(), completedAt: '',
		});
	} else {
		job = await pocketbaseAdmin.createRecord<{ id: string; processingStatus: string; attempts: number }>('generation_jobs', {
			request: requestId, processingStatus: 'processing', attempts, startedAt: new Date().toISOString(),
		});
	}

	try {
		// Step 1-2: validate + calculate.
		await updateRequest(requestId, { status: 'validating' });
		await updateRequest(requestId, { status: 'calculating' });
		const { data: calc, promptVersion } = await calculateKundli({
			fullName: req.fullName,
			dateOfBirth: req.dateOfBirth,
			timeOfBirth: req.timeOfBirth,
			placeOfBirth: req.placeOfBirth,
			birthState: req.birthState,
			birthCountry: req.birthCountry,
			birthTimeAccuracy: req.birthTimeAccuracy || 'exact',
		});

		// Store the calculation.
		const calcRecord = await pocketbaseAdmin.createRecord<{ id: string }>('kundli_calculations', {
			request: requestId,
			engineName: ENGINE_NAME,
			engineVersion: ENGINE_VERSION,
			ayanamsa: calc.ayanamsa,
			ayanamsaValue: calc.ayanamsaValue,
			chartStyle: calc.chartStyle,
			houseSystem: calc.houseSystem,
			birthplaceName: calc.birthplaceName,
			latitude: calc.latitude,
			longitude: calc.longitude,
			timezone: calc.timezone,
			utcTime: calc.utcTime,
			validationStatus: calc.validationStatus,
			calculationData: calc as unknown as Record<string, unknown>,
			limitations: calc.limitations.join('\n'),
		});

		// Step 3: AI interpretation.
		await updateRequest(requestId, { status: 'interpreting' });
		const interpretation = await generateInterpretation(calc, { model: aiModel });

		const reportRecord = await pocketbaseAdmin.createRecord<{ id: string }>('kundli_reports', {
			request: requestId,
			calculation: calcRecord.id,
			aiModel,
			promptVersion,
			interpretationData: interpretation as unknown as Record<string, unknown>,
			reportStatus: 'generated',
			generatedAt: new Date().toISOString(),
		});

		// Step 4: PDF.
		await updateRequest(requestId, { status: 'creating_pdf' });
		const pdfBuffer = await generateKundliPdf({
			calc,
			report: interpretation,
			customerName: req.fullName,
			dateOfBirth: req.dateOfBirth,
			timeOfBirth: req.timeOfBirth,
			placeOfBirth: req.placeOfBirth,
			requestId: requestId,
		});

		// Upload the PDF as a protected file on the request.
		const fd = new FormData();
		fd.append('reportPdf', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), `DevineXAstro_Kundli_${requestId}.pdf`);
		await pocketbaseAdmin.updateRecord('kundli_requests', requestId, fd);

		// Decide release.
		const autoRelease = settings?.autoReleaseEnabled === true;
		if (autoRelease) {
			await pocketbaseAdmin.updateRecord('kundli_reports', reportRecord.id, {
				reportStatus: 'released', releasedAt: new Date().toISOString(),
			});
			await updateRequest(requestId, {
				status: 'ready', reportApproved: true, reportReleased: true,
			});
		} else {
			await updateRequest(requestId, { status: 'awaiting_review' });
		}

		// Complete the job.
		await pocketbaseAdmin.updateRecord('generation_jobs', job.id, {
			processingStatus: 'completed', completedAt: new Date().toISOString(), errorMessage: '',
		});

		logger.info(`Kundli generated for request ${requestId} (autoRelease=${autoRelease})`);
		return { status: autoRelease ? 'ready' : 'awaiting_review', message: 'Kundli generated successfully.' };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Kundli generation failed for ${requestId}: ${message}`);
		await updateRequest(requestId, { status: 'failed' });
		await pocketbaseAdmin.updateRecord('generation_jobs', job.id, {
			processingStatus: 'failed', completedAt: new Date().toISOString(), errorMessage: message,
		});
		// Record the last error on settings for admin visibility.
		if (settings?.id) {
			await pocketbaseAdmin.updateRecord('kundli_settings', settings.id, {
				lastErrorLog: `[${new Date().toISOString()}] ${requestId}: ${message}`.slice(0, 10000),
			}).catch(() => {});
		}
		throw error;
	}
}

/** Regenerates only the AI interpretation for an existing calculation (admin action). */
export async function regenerateInterpretation(requestId: string): Promise<void> {
	if (!isGroqConfigured()) {
		throw new Error('GROQ_API_KEY is not configured on the server. Add it before regenerating interpretations.');
	}

	const { items } = await pocketbaseAdmin.listRecords<{ id: string; calculationData: KundliCalculationData }>('kundli_calculations', {
		filter: pocketbaseAdmin.filter('request = {:id}', { id: requestId }), perPage: 1,
	});
	const calcRec = items[0];
	if (!calcRec) throw new Error('No calculation found for this request. Run a full generation first.');
	const settings = await loadSettings();
	const interpretation = await generateInterpretation(calcRec.calculationData, { model: groqModel(settings?.aiModel) });

	const { items: reports } = await pocketbaseAdmin.listRecords<{ id: string }>('kundli_reports', {
		filter: pocketbaseAdmin.filter('request = {:id}', { id: requestId }), perPage: 1, sort: '-created',
	});
	if (reports[0]) {
		await pocketbaseAdmin.updateRecord('kundli_reports', reports[0].id, {
			interpretationData: interpretation as unknown as Record<string, unknown>,
			reportStatus: 'generated', generatedAt: new Date().toISOString(),
		});
	}
}
