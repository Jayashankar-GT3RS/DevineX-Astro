/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    // Add role field (privileged — locked below)
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          maxSelect: 1,
          values: ['student', 'admin'],
        }),
      );
    }

    // Add phone field for student contact
    if (!users.fields.getByName('phone')) {
      users.fields.add(new TextField({ name: 'phone', max: 20 }));
    }

    // Enable OTP (hybrid — password auth stays on as fallback)
    users.otp.enabled = true;
    users.otp.duration = 300; // 5 minutes
    users.otp.length = 6;

    // Lock role: public signup may only create a student (or omit role);
    // only admins may change role.
    users.createRule = "@request.body.role:isset = false || @request.body.role = 'student'";
    users.updateRule =
      "(id = @request.auth.id && @request.body.role:changed = false) || @request.auth.role = 'admin'";

    app.save(users);

    // Backfill existing users with the student role.
    const existing = app.findAllRecords('users');
    for (const u of existing) {
      if (!u.get('role')) {
        u.set('role', 'student');
        app.save(u);
      }
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.otp.enabled = false;
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    app.save(users);
  },
);
