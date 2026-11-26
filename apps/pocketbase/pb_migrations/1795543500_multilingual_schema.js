/// <reference path="../pb_data/types.d.ts" />

// Multilingual platform schema: preferred language on users and leads, report
// language on Kundli requests, delivery languages on courses, and a
// content_translations collection for reviewed AI/manual translations.
// Non-destructive: every new field is optional with no required flip.
migrate(
  (app) => {
    // --- users: preferredLanguage (display language, saved after login) ---
    const users = app.findCollectionByNameOrId('users');
    if (!users.fields.getByName('preferredLanguage')) {
      users.fields.add(new TextField({ name: 'preferredLanguage', max: 10 }));
    }
    app.save(users);

    // --- astro_inquiries: preferredLanguage (lead CRM language tracking) ---
    const inquiries = app.findCollectionByNameOrId('astro_inquiries');
    if (!inquiries.fields.getByName('preferredLanguage')) {
      inquiries.fields.add(new TextField({ name: 'preferredLanguage', max: 10 }));
    }
    app.save(inquiries);

    // --- kundli_requests: reportLanguage (narrative language for the PDF) ---
    const kundli = app.findCollectionByNameOrId('kundli_requests');
    if (!kundli.fields.getByName('reportLanguage')) {
      kundli.fields.add(new TextField({ name: 'reportLanguage', max: 10 }));
    }
    app.save(kundli);

    // --- courses: deliveryLanguages (JSON array of locale codes the course is
    //     actually taught in — distinct from the site display language) ---
    const courses = app.findCollectionByNameOrId('courses');
    if (!courses.fields.getByName('deliveryLanguages')) {
      courses.fields.add(new JSONField({ name: 'deliveryLanguages', maxSize: 2000 }));
    }
    app.save(courses);

    // --- content_translations: reviewed translations of dynamic content ---
    try {
      app.findCollectionByNameOrId('content_translations');
    } catch (_) {
      app.save(
        new Collection({
          name: 'content_translations',
          type: 'base',
          listRule: "@request.auth.role = 'admin'",
          viewRule: "@request.auth.role = 'admin'",
          createRule: "@request.auth.role = 'admin'",
          updateRule: "@request.auth.role = 'admin'",
          deleteRule: "@request.auth.role = 'admin'",
          fields: [
            { name: 'contentType', type: 'text', required: true, max: 50 },
            { name: 'recordId', type: 'text', required: true, max: 50 },
            { name: 'field', type: 'text', required: true, max: 100 },
            { name: 'locale', type: 'text', required: true, max: 10 },
            { name: 'sourceText', type: 'text', max: 50000 },
            { name: 'translatedText', type: 'text', max: 50000 },
            {
              name: 'status',
              type: 'select',
              maxSelect: 1,
              values: ['pending', 'generated', 'approved', 'rejected'],
            },
            { name: 'method', type: 'select', maxSelect: 1, values: ['ai', 'manual'] },
            { name: 'reviewedBy', type: 'relation', maxSelect: 1, collectionId: users.id },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            "CREATE UNIQUE INDEX idx_content_trans_unique ON content_translations (contentType, recordId, field, locale)",
            'CREATE INDEX idx_content_trans_locale ON content_translations (locale)',
            'CREATE INDEX idx_content_trans_status ON content_translations (status)',
          ],
        }),
      );
    }

    // --- site_languages: single config record for enabled languages + default ---
    try {
      app.findCollectionByNameOrId('site_languages');
    } catch (_) {
      app.save(
        new Collection({
          name: 'site_languages',
          type: 'base',
          listRule: '',
          viewRule: '',
          createRule: "@request.auth.role = 'admin'",
          updateRule: "@request.auth.role = 'admin'",
          deleteRule: "@request.auth.role = 'admin'",
          fields: [
            { name: 'defaultLanguage', type: 'text', max: 10 },
            { name: 'enabledLanguages', type: 'json', maxSize: 2000 },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        }),
      );
      // Seed default config: English default, all verified languages enabled.
      const seedId = (key) => $security.sha256(key).substring(0, 15);
      const col = app.findCollectionByNameOrId('site_languages');
      const rec = new Record(col, { id: seedId('site_languages:default') });
      rec.set('defaultLanguage', 'en');
      rec.set('enabledLanguages', JSON.stringify([
        'en','hi','bn','te','mr','ta','gu','kn','ml','or','pa','as',
        'sa','ur','sd','brx','doi','ks','kok','mai','mni','ne','sat',
      ]));
      app.save(rec);
    }
  },
  (app) => {
    for (const name of ['content_translations', 'site_languages']) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* gone */ }
    }
    for (const [colName, fieldName] of [
      ['users', 'preferredLanguage'],
      ['astro_inquiries', 'preferredLanguage'],
      ['kundli_requests', 'reportLanguage'],
      ['courses', 'deliveryLanguages'],
    ]) {
      try {
        const c = app.findCollectionByNameOrId(colName);
        c.fields.removeByName(fieldName);
        app.save(c);
      } catch (_) { /* gone */ }
    }
  },
);
