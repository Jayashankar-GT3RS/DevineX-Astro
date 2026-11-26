/// <reference path="../pb_data/types.d.ts" />

// Allows the Super Admin to create user accounts with any role (trainer,
// admin) — required so administrators can create trainer accounts from the
// admin panel. Public sign-up remains restricted to the default 'student'
// role (or omitting role entirely).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.createRule =
      "(@request.body.role:isset = false || @request.body.role = 'student') || @request.auth.role = 'admin'";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.createRule = "@request.body.role:isset = false || @request.body.role = 'student'";
    app.save(users);
  },
);
