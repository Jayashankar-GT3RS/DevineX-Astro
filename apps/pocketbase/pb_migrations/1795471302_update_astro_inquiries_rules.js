/// <reference path="../pb_data/types.d.ts" />

// Opens lead (astro_inquiries) read and update access to authenticated
// administrators so the admin panel can list, filter, export and manage leads.
// Public submission (createRule) remains consent-gated; reads are admin-only,
// so visitor contact details are never exposed publicly.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('astro_inquiries');
    collection.listRule = "@request.auth.role = 'admin'";
    collection.viewRule = "@request.auth.role = 'admin'";
    collection.updateRule = "@request.auth.role = 'admin'";
    collection.deleteRule = "@request.auth.role = 'admin'";
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('astro_inquiries');
    collection.listRule = null;
    collection.viewRule = null;
    collection.updateRule = null;
    collection.deleteRule = null;
    app.save(collection);
  },
);
