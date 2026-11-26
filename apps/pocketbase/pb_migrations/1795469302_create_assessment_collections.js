/// <reference path="../pb_data/types.d.ts" />

// Assessment, certification and administration collections: assignments,
// submissions, quizzes, quiz_attempts, certificates, announcements and
// payments (offline, admin-managed, audit logged). Depends on the collections
// created in 1795469301_create_lms_learning_collections.js.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const courses = app.findCollectionByNameOrId('courses');
    const lessons = app.findCollectionByNameOrId('lessons');
    const batches = app.findCollectionByNameOrId('batches');
    const enrollments = app.findCollectionByNameOrId('enrollments');

    const staffWrite =
      "@request.auth.role = 'admin' || @request.auth.role = 'trainer'";
    const staffRead =
      "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin' || @request.auth.role = 'trainer')";

    // assignments
    try {
      app.findCollectionByNameOrId('assignments');
    } catch (_) {
      app.save(
        new Collection({
          name: 'assignments',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: staffWrite,
          updateRule: staffWrite,
          deleteRule: staffWrite,
          fields: [
            { name: 'course', type: 'relation', required: true, maxSelect: 1, collectionId: courses.id, cascadeDelete: true },
            { name: 'lesson', type: 'relation', maxSelect: 1, collectionId: lessons.id },
            { name: 'title', type: 'text', required: true, max: 300 },
            { name: 'description', type: 'text', max: 5000 },
            { name: 'instructions', type: 'text', max: 10000 },
            { name: 'deadline', type: 'date' },
            { name: 'maxMarks', type: 'number', min: 0 },
            { name: 'status', type: 'select', maxSelect: 1, values: ['draft', 'published'] },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_assignments_course ON assignments (course)'],
        }),
      );
    }

    // submissions — student work + trainer feedback
    try {
      app.findCollectionByNameOrId('submissions');
    } catch (_) {
      const assignmentsCollection = app.findCollectionByNameOrId('assignments');
      app.save(
        new Collection({
          name: 'submissions',
          type: 'base',
          listRule: staffRead,
          viewRule: staffRead,
          createRule: "@request.auth.id != '' && @request.auth.id = @request.body.student",
          updateRule: staffWrite,
          deleteRule: "@request.auth.role = 'admin'",
          fields: [
            { name: 'assignment', type: 'relation', required: true, maxSelect: 1, collectionId: assignmentsCollection.id, cascadeDelete: true },
            { name: 'student', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
            { name: 'content', type: 'text', max: 20000 },
            { name: 'fileUrl', type: 'text', max: 1000 },
            { name: 'submittedAt', type: 'date' },
            { name: 'marks', type: 'number', min: 0 },
            { name: 'feedback', type: 'text', max: 10000 },
            { name: 'status', type: 'select', maxSelect: 1, values: ['submitted', 'reviewed', 'returned'] },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE UNIQUE INDEX idx_submissions_assignment_student ON submissions (assignment, student)',
          ],
        }),
      );
    }

    // quizzes — MCQ banks with configurable passing criteria
    try {
      app.findCollectionByNameOrId('quizzes');
    } catch (_) {
      app.save(
        new Collection({
          name: 'quizzes',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: staffWrite,
          updateRule: staffWrite,
          deleteRule: staffWrite,
          fields: [
            { name: 'course', type: 'relation', required: true, maxSelect: 1, collectionId: courses.id, cascadeDelete: true },
            { name: 'lesson', type: 'relation', maxSelect: 1, collectionId: lessons.id },
            { name: 'title', type: 'text', required: true, max: 300 },
            { name: 'description', type: 'text', max: 3000 },
            { name: 'questions', type: 'text', max: 100000 },
            { name: 'passingScore', type: 'number', min: 0, max: 100 },
            { name: 'maxAttempts', type: 'number', min: 0 },
            { name: 'status', type: 'select', maxSelect: 1, values: ['draft', 'published'] },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_quizzes_course ON quizzes (course)'],
        }),
      );
    }

    // quiz_attempts — scored attempt history
    try {
      app.findCollectionByNameOrId('quiz_attempts');
    } catch (_) {
      const quizzesCollection = app.findCollectionByNameOrId('quizzes');
      app.save(
        new Collection({
          name: 'quiz_attempts',
          type: 'base',
          listRule: staffRead,
          viewRule: staffRead,
          createRule: "@request.auth.id != '' && @request.auth.id = @request.body.student",
          updateRule: "@request.auth.role = 'admin'",
          deleteRule: "@request.auth.role = 'admin'",
          fields: [
            { name: 'quiz', type: 'relation', required: true, maxSelect: 1, collectionId: quizzesCollection.id, cascadeDelete: true },
            { name: 'student', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
            { name: 'answers', type: 'text', max: 50000 },
            { name: 'score', type: 'number', min: 0, max: 100 },
            { name: 'passed', type: 'bool' },
            { name: 'attemptedAt', type: 'date' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts (quiz)',
            'CREATE INDEX idx_quiz_attempts_student ON quiz_attempts (student)',
          ],
        }),
      );
    }

    // certificates — issued only after template approval + completion criteria
    try {
      app.findCollectionByNameOrId('certificates');
    } catch (_) {
      app.save(
        new Collection({
          name: 'certificates',
          type: 'base',
          listRule:
            "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin')",
          viewRule:
            "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin')",
          createRule: "@request.auth.role = 'admin'",
          updateRule: "@request.auth.role = 'admin'",
          deleteRule: "@request.auth.role = 'admin'",
          fields: [
            { name: 'student', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
            { name: 'course', type: 'relation', required: true, maxSelect: 1, collectionId: courses.id, cascadeDelete: true },
            { name: 'certificateNumber', type: 'text', max: 100 },
            { name: 'studentName', type: 'text', max: 200 },
            { name: 'courseTitle', type: 'text', max: 300 },
            { name: 'completionDate', type: 'date' },
            { name: 'signatory', type: 'text', max: 200 },
            { name: 'templateApproved', type: 'bool' },
            { name: 'status', type: 'select', maxSelect: 1, values: ['pending', 'issued', 'revoked'] },
            { name: 'issuedAt', type: 'date' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            "CREATE UNIQUE INDEX idx_certificates_number ON certificates (certificateNumber) WHERE certificateNumber != ''",
          ],
        }),
      );
    }

    // announcements — course/batch/global notices
    try {
      app.findCollectionByNameOrId('announcements');
    } catch (_) {
      app.save(
        new Collection({
          name: 'announcements',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: staffWrite,
          updateRule: staffWrite,
          deleteRule: staffWrite,
          fields: [
            { name: 'course', type: 'relation', maxSelect: 1, collectionId: courses.id, cascadeDelete: true },
            { name: 'batch', type: 'relation', maxSelect: 1, collectionId: batches.id },
            { name: 'title', type: 'text', required: true, max: 300 },
            { name: 'message', type: 'text', required: true, max: 10000 },
            { name: 'author', type: 'relation', maxSelect: 1, collectionId: users.id },
            { name: 'audience', type: 'select', maxSelect: 1, values: ['course', 'batch', 'all'] },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_announcements_course ON announcements (course)'],
        }),
      );
    }

    // payments — offline payment records, admin-managed, audit logged
    try {
      app.findCollectionByNameOrId('payments');
    } catch (_) {
      app.save(
        new Collection({
          name: 'payments',
          type: 'base',
          listRule: "@request.auth.role = 'admin'",
          viewRule: "@request.auth.role = 'admin'",
          createRule: "@request.auth.role = 'admin'",
          updateRule: "@request.auth.role = 'admin'",
          deleteRule: "@request.auth.role = 'admin'",
          fields: [
            { name: 'enrollment', type: 'relation', maxSelect: 1, collectionId: enrollments.id },
            { name: 'student', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
            { name: 'course', type: 'relation', required: true, maxSelect: 1, collectionId: courses.id, cascadeDelete: true },
            { name: 'amount', type: 'number', required: true, min: 0 },
            { name: 'method', type: 'select', maxSelect: 1, values: ['offline_cash', 'offline_upi', 'offline_bank', 'other'] },
            { name: 'transactionRef', type: 'text', max: 200 },
            { name: 'status', type: 'select', maxSelect: 1, values: ['pending', 'verified', 'rejected'] },
            { name: 'recordedBy', type: 'relation', maxSelect: 1, collectionId: users.id },
            { name: 'notes', type: 'text', max: 5000 },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_payments_student ON payments (student)',
            'CREATE INDEX idx_payments_course ON payments (course)',
          ],
        }),
      );
    }
  },
  (app) => {
    for (const name of [
      'payments',
      'announcements',
      'certificates',
      'quiz_attempts',
      'quizzes',
      'submissions',
      'assignments',
    ]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {
        /* already gone */
      }
    }
  },
);
