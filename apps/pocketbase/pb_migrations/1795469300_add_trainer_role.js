/// <reference path="../pb_data/types.d.ts" />

// Adds the `trainer` role to the users auth collection so trainers can be
// granted scoped access to assigned courses, batches, lessons and live
// classes without unrestricted administrative access.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const field = users.fields.getByName('role');
    field.values = ['student', 'trainer', 'admin'];
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const field = users.fields.getByName('role');
    field.values = ['student', 'admin'];
    app.save(users);
  },
);
