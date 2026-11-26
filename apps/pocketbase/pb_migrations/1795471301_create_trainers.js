/// <reference path="../pb_data/types.d.ts" />

// Creates the trainers collection for editable trainer profile templates.
// No fictional profiles are seeded — the collection starts empty and is
// populated by administrators only when genuine faculty information exists.
migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId('trainers');
    } catch (_) {
      collection = new Collection({
        type: 'base',
        name: 'trainers',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'fullName', type: 'text', required: true, max: 200 },
          { name: 'slug', type: 'text', required: true, max: 200 },
          { name: 'specialization', type: 'text', max: 300 },
          { name: 'experience', type: 'text', max: 500 },
          { name: 'biography', type: 'text', max: 10000 },
          { name: 'qualifications', type: 'text', max: 5000 },
          { name: 'coursesTaught', type: 'text', max: 2000 },
          { name: 'socialLinks', type: 'text', max: 2000 },
          { name: 'photo', type: 'file', maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'] },
          { name: 'status', type: 'select', maxSelect: 1, values: ['draft', 'published'] },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('trainers');
      app.delete(collection);
    } catch (_) { /* already gone */ }
  },
);
