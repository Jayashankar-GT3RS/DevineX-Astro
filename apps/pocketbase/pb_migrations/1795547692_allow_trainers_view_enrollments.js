/// <reference path="../pb_data/types.d.ts" />

// Allows trainers to list and view enrollment records so they can see the
// students enrolled in their assigned courses. The trainer portal filters
// client-side to assigned courses; the rule follows the same pattern already
// used for submissions and lesson_progress. Admins retain full access and
// students still see only their own enrollments.
migrate(
  (app) => {
    const enrollments = app.findCollectionByNameOrId('enrollments');
    enrollments.listRule =
      "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin' || @request.auth.role = 'trainer')";
    enrollments.viewRule =
      "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin' || @request.auth.role = 'trainer')";
    app.save(enrollments);
  },
  (app) => {
    const enrollments = app.findCollectionByNameOrId('enrollments');
    enrollments.listRule =
      "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin')";
    enrollments.viewRule =
      "@request.auth.id != '' && (@request.auth.id = student || @request.auth.role = 'admin')";
    app.save(enrollments);
  },
);
