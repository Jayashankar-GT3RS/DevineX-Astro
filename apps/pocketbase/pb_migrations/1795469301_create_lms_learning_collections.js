/// <reference path="../pb_data/types.d.ts" />

// Learning-interface collections: batches, lessons, lesson_progress and
// live_classes. Lesson video/notes/resources and live-class meeting/recording
// links are protected by the `protect-course-content.pb.js` enrich hook —
// only enrolled students, trainers and admins receive those fields.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const courses = app.findCollectionByNameOrId('courses');

    const staffWrite =
      "@request.auth.role = 'admin' || @request.auth.role = 'trainer'";

    // batches — a cohort of students taking a course under a trainer
    try {
      app.findCollectionByNameOrId('batches');
    } catch (_) {
      app.save(
        new Collection({
          name: 'batches',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: staffWrite,
          updateRule: staffWrite,
          deleteRule: "@request.auth.role = 'admin'",
          fields: [
            {
              name: 'course',
              type: 'relation',
              required: true,
              maxSelect: 1,
              collectionId: courses.id,
              cascadeDelete: true,
            },
            { name: 'name', type: 'text', required: true, max: 200 },
            { name: 'trainer', type: 'relation', maxSelect: 1, collectionId: users.id },
            { name: 'startDate', type: 'date' },
            { name: 'endDate', type: 'date' },
            { name: 'maxCapacity', type: 'number', min: 0 },
            {
              name: 'status',
              type: 'select',
              maxSelect: 1,
              values: ['planned', 'active', 'completed', 'cancelled'],
            },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_batches_course ON batches (course)'],
        }),
      );
    }

    // lessons — individual lessons within a course, grouped by module
    try {
      app.findCollectionByNameOrId('lessons');
    } catch (_) {
      app.save(
        new Collection({
          name: 'lessons',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: staffWrite,
          updateRule: staffWrite,
          deleteRule: staffWrite,
          fields: [
            {
              name: 'course',
              type: 'relation',
              required: true,
              maxSelect: 1,
              collectionId: courses.id,
              cascadeDelete: true,
            },
            { name: 'module', type: 'text', max: 200 },
            { name: 'title', type: 'text', required: true, max: 300 },
            { name: 'description', type: 'text', max: 5000 },
            { name: 'order', type: 'number', min: 0 },
            { name: 'videoUrl', type: 'text', max: 1000 },
            {
              name: 'videoProvider',
              type: 'select',
              maxSelect: 1,
              values: ['none', 'youtube', 'vimeo', 'uploaded'],
            },
            { name: 'notes', type: 'text', max: 20000 },
            { name: 'resources', type: 'text', max: 20000 },
            { name: 'duration', type: 'text', max: 50 },
            { name: 'isPreview', type: 'bool' },
            { name: 'status', type: 'select', maxSelect: 1, values: ['draft', 'published'] },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_lessons_course ON lessons (course)',
            'CREATE INDEX idx_lessons_order ON lessons (course, `order`)',
          ],
        }),
      );
    }

    // lesson_progress — per-student completion and resume position
    try {
      app.findCollectionByNameOrId('lesson_progress');
    } catch (_) {
      const lessonsCollection = app.findCollectionByNameOrId('lessons');
      app.save(
        new Collection({
          name: 'lesson_progress',
          type: 'base',
          listRule:
            "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin' || @request.auth.role = 'trainer')",
          viewRule:
            "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin' || @request.auth.role = 'trainer')",
          createRule: "@request.auth.id != '' && @request.auth.id = @request.body.student",
          updateRule:
            "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin')",
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
              name: 'lesson',
              type: 'relation',
              required: true,
              maxSelect: 1,
              collectionId: lessonsCollection.id,
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
            { name: 'completed', type: 'bool' },
            { name: 'completedAt', type: 'date' },
            { name: 'position', type: 'number', min: 0 },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE UNIQUE INDEX idx_lesson_progress_student_lesson ON lesson_progress (student, lesson)',
          ],
        }),
      );
    }

    // live_classes — scheduled online sessions with protected meeting links
    try {
      app.findCollectionByNameOrId('live_classes');
    } catch (_) {
      const batchesCollection = app.findCollectionByNameOrId('batches');
      app.save(
        new Collection({
          name: 'live_classes',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: staffWrite,
          updateRule: staffWrite,
          deleteRule: staffWrite,
          fields: [
            {
              name: 'course',
              type: 'relation',
              required: true,
              maxSelect: 1,
              collectionId: courses.id,
              cascadeDelete: true,
            },
            {
              name: 'batch',
              type: 'relation',
              maxSelect: 1,
              collectionId: batchesCollection.id,
            },
            { name: 'title', type: 'text', required: true, max: 300 },
            { name: 'description', type: 'text', max: 3000 },
            { name: 'trainer', type: 'relation', maxSelect: 1, collectionId: users.id },
            { name: 'scheduledAt', type: 'date', required: true },
            { name: 'durationMins', type: 'number', min: 0 },
            { name: 'meetingUrl', type: 'text', max: 1000 },
            {
              name: 'meetingProvider',
              type: 'select',
              maxSelect: 1,
              values: ['none', 'zoom', 'google_meet', 'other'],
            },
            { name: 'recordingUrl', type: 'text', max: 1000 },
            {
              name: 'status',
              type: 'select',
              maxSelect: 1,
              values: ['scheduled', 'live', 'completed', 'cancelled'],
            },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_live_classes_course ON live_classes (course)',
            'CREATE INDEX idx_live_classes_scheduled ON live_classes (scheduledAt)',
          ],
        }),
      );
    }
  },
  (app) => {
    for (const name of ['live_classes', 'lesson_progress', 'lessons', 'batches']) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {
        /* already gone */
      }
    }
  },
);
