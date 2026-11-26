/// <reference path="../pb_data/types.d.ts" />

// The Kundli interpretation engine now runs on Groq. The settings record was
// seeded with the previous placeholder model id; replace it with Groq's current
// production model so the admin panel reflects what actually generates reports.
// GROQ_MODEL in the server environment still takes precedence at runtime.
migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('kundli_settings', "id != ''", '', 10, 0);
      for (const record of records) {
        const current = record.getString('aiModel');
        if (!current || current === 'integrated-ai') {
          record.set('aiModel', 'openai/gpt-oss-120b');
          app.save(record);
        }
      }
    } catch (_) {
      // Settings collection not present yet; the engine's built-in default applies.
    }
  },
  (app) => {
    try {
      const records = app.findRecordsByFilter('kundli_settings', "id != ''", '', 10, 0);
      for (const record of records) {
        if (record.getString('aiModel') === 'openai/gpt-oss-120b') {
          record.set('aiModel', 'integrated-ai');
          app.save(record);
        }
      }
    } catch (_) {
      // Nothing to revert.
    }
  },
);
