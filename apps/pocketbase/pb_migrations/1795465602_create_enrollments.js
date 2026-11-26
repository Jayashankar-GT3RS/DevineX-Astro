/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const courses = app.findCollectionByNameOrId('courses');

    let collection;
    try {
      collection = app.findCollectionByNameOrId('enrollments');
    } catch (_) {
      collection = new Collection({
        name: 'enrollments',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin')",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.student",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'student',
            type: 'relation',
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          {
            name: 'course',
            type: 'relation',
            required: true,
            maxSelect: 1,
            collectionId: courses.id,
            cascadeDelete: true,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['pending', 'active', 'completed', 'cancelled'],
          },
          { name: 'notes', type: 'text', max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_enrollments_student ON enrollments (student)',
          'CREATE INDEX idx_enrollments_course ON enrollments (course)',
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('enrollments'));
    } catch (_) {
      /* already gone */
    }
  },
);
