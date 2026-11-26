migrate((app) => {
  try { app.findCollectionByNameOrId('astro_inquiries'); return; } catch (_) { /* Create when absent. */ }
  const collection = new Collection({
    name: 'astro_inquiries', type: 'base', listRule: null, viewRule: null,
    createRule: '@request.body.consent = true', updateRule: null, deleteRule: null,
    fields: [
      { name: 'name', type: 'text', required: true, min: 2, max: 100 },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'text', required: true, min: 10, max: 20, pattern: '^[+0-9 ()-]+$' },
      { name: 'course', type: 'text', required: true, max: 200 },
      { name: 'intent', type: 'select', required: true, maxSelect: 1, values: ['Enrollment inquiry', 'Brochure request', 'Callback request', 'WhatsApp inquiry', 'Consultation updates', 'Shop updates'] },
      { name: 'preferred_time', type: 'text', max: 100 },
      { name: 'message', type: 'text', max: 3000 },
      { name: 'consent', type: 'bool', required: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ]
  });
  app.save(collection);
}, (app) => { app.delete(app.findCollectionByNameOrId('astro_inquiries')); });
