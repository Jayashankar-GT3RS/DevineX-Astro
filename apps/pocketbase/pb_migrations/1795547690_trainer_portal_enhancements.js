/// <reference path="../pb_data/types.d.ts" />

// Trainer Portal enhancements:
// 1. Adds an `assignedTrainer` relation to `courses` so administrators can
//    assign courses to specific trainers (server-side scoping). This is
//    separate from the existing `trainer` text field which holds a display name.
// 2. Extends the `trainers` profile collection with a `user` link, languages,
//    availability and admin-only bank/payment information.
// 3. Allows a trainer to update their own linked profile (public fields only —
//    bankInfo is hidden from non-admins by the protect-trainer-bankinfo hook).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    // 1. Assign courses to trainers via a relation field.
    const courses = app.findCollectionByNameOrId('courses');
    if (!courses.fields.getByName('assignedTrainer')) {
      courses.fields.add(
        new RelationField({
          name: 'assignedTrainer',
          maxSelect: 1,
          collectionId: users.id,
        }),
      );
      app.save(courses);
    }

    // 2. Extend trainer profiles.
    const trainers = app.findCollectionByNameOrId('trainers');
    if (!trainers.fields.getByName('user')) {
      trainers.fields.add(
        new RelationField({
          name: 'user',
          maxSelect: 1,
          collectionId: users.id,
        }),
      );
    }
    if (!trainers.fields.getByName('languages')) {
      trainers.fields.add(new TextField({ name: 'languages', max: 500 }));
    }
    if (!trainers.fields.getByName('availability')) {
      trainers.fields.add(new TextField({ name: 'availability', max: 1000 }));
    }
    if (!trainers.fields.getByName('bankInfo')) {
      // Sensitive — visible only to admins (see protect-trainer-bankinfo.pb.js).
      trainers.fields.add(new TextField({ name: 'bankInfo', max: 2000 }));
    }
    // A trainer may update their own linked profile; admins may update any.
    trainers.updateRule = "@request.auth.role = 'admin' || @request.auth.id = user";
    app.save(trainers);
  },
  (app) => {
    const courses = app.findCollectionByNameOrId('courses');
    try { courses.fields.removeByName('assignedTrainer'); } catch (_) { /* gone */ }
    app.save(courses);

    const trainers = app.findCollectionByNameOrId('trainers');
    for (const f of ['user', 'languages', 'availability', 'bankInfo']) {
      try { trainers.fields.removeByName(f); } catch (_) { /* gone */ }
    }
    trainers.updateRule = "@request.auth.role = 'admin'";
    app.save(trainers);
  },
);
