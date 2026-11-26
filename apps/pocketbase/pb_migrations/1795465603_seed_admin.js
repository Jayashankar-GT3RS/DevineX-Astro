/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const seedId = (key) => $security.sha256(key).substring(0, 15);
    const id = seedId('users:admin');

    try {
      app.findRecordById('users', id);
      return;
    } catch (_) {
      /* create below */
    }

    const record = new Record(users);
    record.set('id', id);
    record.setEmail('admin@devinexastro.com');
    record.setPassword($security.randomString(32));
    record.set('role', 'admin');
    record.set('verified', true);
    record.set('name', 'DevineX Astro Admin');
    app.save(record);
  },
  (app) => {
    const seedId = (key) => $security.sha256(key).substring(0, 15);
    try {
      app.delete(app.findRecordById('users', seedId('users:admin')));
    } catch (_) {
      /* already gone */
    }
  },
);
