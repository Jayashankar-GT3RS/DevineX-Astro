/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('astro_inquiries');
    collection.fields.add(new TextField({ name: 'city', max: 100 }));
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('astro_inquiries');
    collection.fields.removeByName('city');
    app.save(collection);
  },
);
