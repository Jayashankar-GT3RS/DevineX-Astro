/// <reference path="../pb_data/types.d.ts" />

// Automated AI Kundli generation engine — schema additions.
// Adds granular processing statuses to kundli_requests, an AI-processing
// consent flag and birth state/country fields, plus three new admin-only
// collections (kundli_calculations, kundli_reports, generation_jobs) and a
// single-record kundli_settings config collection seeded with automatic
// generation and release DISABLED (manual review on) until an administrator
// validates chart accuracy.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const kundliRequests = app.findCollectionByNameOrId('kundli_requests');

    // --- Extend kundli_requests: granular statuses + AI consent + state/country ---
    const statusField = kundliRequests.fields.getByName('status');
    if (statusField) {
      statusField.values = [
        'submitted',
        'validating',
        'calculating',
        'interpreting',
        'creating_pdf',
        'awaiting_review',
        'in_progress',
        'under_review',
        'ready',
        'completed',
        'failed',
      ];
    }
    if (!kundliRequests.fields.getByName('aiConsent')) {
      kundliRequests.fields.add(new BoolField({ name: 'aiConsent' }));
    }
    if (!kundliRequests.fields.getByName('birthState')) {
      kundliRequests.fields.add(new TextField({ name: 'birthState', max: 200 }));
    }
    if (!kundliRequests.fields.getByName('birthCountry')) {
      kundliRequests.fields.add(new TextField({ name: 'birthCountry', max: 200 }));
    }
    app.save(kundliRequests);

    const adminRule = "@request.auth.role = 'admin'";

    // --- kundli_calculations ---
    try {
      app.findCollectionByNameOrId('kundli_calculations');
    } catch (_) {
      app.save(
        new Collection({
          name: 'kundli_calculations',
          type: 'base',
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: 'request', type: 'relation', required: true, maxSelect: 1, collectionId: kundliRequests.id, cascadeDelete: true },
            { name: 'engineName', type: 'text', max: 100 },
            { name: 'engineVersion', type: 'text', max: 100 },
            { name: 'ayanamsa', type: 'text', max: 50 },
            { name: 'ayanamsaValue', type: 'number' },
            { name: 'chartStyle', type: 'text', max: 50 },
            { name: 'houseSystem', type: 'text', max: 50 },
            { name: 'birthplaceName', type: 'text', max: 300 },
            { name: 'latitude', type: 'number' },
            { name: 'longitude', type: 'number' },
            { name: 'timezone', type: 'text', max: 100 },
            { name: 'utcTime', type: 'date' },
            { name: 'validationStatus', type: 'text', max: 50 },
            { name: 'calculationData', type: 'json', maxSize: 2000000 },
            { name: 'limitations', type: 'text', max: 5000 },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_kundli_calc_request ON kundli_calculations (request)'],
        }),
      );
    }

    // --- kundli_reports ---
    try {
      app.findCollectionByNameOrId('kundli_reports');
    } catch (_) {
      app.save(
        new Collection({
          name: 'kundli_reports',
          type: 'base',
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: 'request', type: 'relation', required: true, maxSelect: 1, collectionId: kundliRequests.id, cascadeDelete: true },
            { name: 'calculation', type: 'relation', maxSelect: 1, collectionId: app.findCollectionByNameOrId('kundli_calculations').id },
            { name: 'aiModel', type: 'text', max: 100 },
            { name: 'promptVersion', type: 'text', max: 50 },
            { name: 'interpretationData', type: 'json', maxSize: 2000000 },
            { name: 'reportStatus', type: 'select', maxSelect: 1, values: ['draft', 'generated', 'approved', 'rejected', 'released'] },
            { name: 'generatedAt', type: 'date' },
            { name: 'approvedAt', type: 'date' },
            { name: 'releasedAt', type: 'date' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_kundli_reports_request ON kundli_reports (request)'],
        }),
      );
    }

    // --- generation_jobs ---
    try {
      app.findCollectionByNameOrId('generation_jobs');
    } catch (_) {
      app.save(
        new Collection({
          name: 'generation_jobs',
          type: 'base',
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: 'request', type: 'relation', required: true, maxSelect: 1, collectionId: kundliRequests.id, cascadeDelete: true },
            { name: 'processingStatus', type: 'select', maxSelect: 1, values: ['queued', 'processing', 'completed', 'failed'] },
            { name: 'attempts', type: 'number', min: 0 },
            { name: 'errorMessage', type: 'text', max: 5000 },
            { name: 'startedAt', type: 'date' },
            { name: 'completedAt', type: 'date' },
            { name: 'estimatedApiCost', type: 'number' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_gen_jobs_request ON generation_jobs (request)'],
        }),
      );
    }

    // --- kundli_settings (single config record, admin-only) ---
    try {
      app.findCollectionByNameOrId('kundli_settings');
    } catch (_) {
      app.save(
        new Collection({
          name: 'kundli_settings',
          type: 'base',
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: 'autoGenerationEnabled', type: 'bool' },
            { name: 'autoReleaseEnabled', type: 'bool' },
            { name: 'manualReviewRequired', type: 'bool' },
            { name: 'ayanamsa', type: 'text', max: 50 },
            { name: 'chartStyle', type: 'text', max: 50 },
            { name: 'houseSystem', type: 'text', max: 50 },
            { name: 'reportLanguage', type: 'text', max: 10 },
            { name: 'aiModel', type: 'text', max: 100 },
            { name: 'calculationProvider', type: 'text', max: 100 },
            { name: 'pdfTemplate', type: 'text', max: 100 },
            { name: 'lastErrorLog', type: 'text', max: 10000 },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // Seed the default settings record (auto-generation + auto-release OFF).
    const seedId = (key) => $security.sha256(key).substring(0, 15);
    const settingsId = seedId('kundli_settings:default');
    let settings;
    try {
      settings = app.findRecordById('kundli_settings', settingsId);
    } catch (_) {
      const col = app.findCollectionByNameOrId('kundli_settings');
      settings = new Record(col, { id: settingsId });
    }
    settings.set('autoGenerationEnabled', false);
    settings.set('autoReleaseEnabled', false);
    settings.set('manualReviewRequired', true);
    settings.set('ayanamsa', 'lahiri');
    settings.set('chartStyle', 'north');
    settings.set('houseSystem', 'whole_sign');
    settings.set('reportLanguage', 'en');
    settings.set('aiModel', 'integrated-ai');
    settings.set('calculationProvider', 'astronomy-engine');
    settings.set('pdfTemplate', 'devinex-default');
    settings.set('lastErrorLog', '');
    app.save(settings);
  },
  (app) => {
    for (const name of ['generation_jobs', 'kundli_reports', 'kundli_calculations', 'kundli_settings']) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* already gone */ }
    }
  },
);
