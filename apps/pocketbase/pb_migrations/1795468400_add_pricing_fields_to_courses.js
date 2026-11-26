/// <reference path="../pb_data/types.d.ts" />

// Adds pricing, tax, discount and payment-enablement fields to the courses
// collection so administrators can manage the full pricing/enrollment matrix
// from the admin panel. Tax configuration stays "pending" by default — the
// platform must not assume whether proposed fees include or exclude GST.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('courses');

    // Tax configuration status — pending approval until the owner confirms
    // GST treatment. Never default to included/excluded.
    if (!collection.fields.getByName('taxConfig')) {
      collection.fields.add(
        new SelectField({
          name: 'taxConfig',
          maxSelect: 1,
          values: ['pending', 'included', 'excluded', 'exempt'],
        }),
      );
    }

    // Applicable tax rate as a percentage (e.g. 18 for 18% GST). Optional —
    // only meaningful once taxConfig moves off "pending".
    if (!collection.fields.getByName('taxRate')) {
      collection.fields.add(
        new NumberField({ name: 'taxRate', min: 0, max: 100 }),
      );
    }

    // Discount amount in INR (flat). Optional.
    if (!collection.fields.getByName('discount')) {
      collection.fields.add(new NumberField({ name: 'discount', min: 0 }));
    }

    // Optional human label for the discount (e.g. "Early bird").
    if (!collection.fields.getByName('discountLabel')) {
      collection.fields.add(new TextField({ name: 'discountLabel', max: 100 }));
    }

    // Whether paid enrollment (checkout) is enabled for this course. Off by
    // default — enrollment stays enquiry-only until a payment gateway is
    // configured and server-side verification is tested.
    if (!collection.fields.getByName('paymentEnabled')) {
      collection.fields.add(new BoolField({ name: 'paymentEnabled' }));
    }

    // Payment gateway / checkout status for display.
    if (!collection.fields.getByName('paymentStatus')) {
      collection.fields.add(
        new SelectField({
          name: 'paymentStatus',
          maxSelect: 1,
          values: ['disabled', 'pending', 'configured', 'tested'],
        }),
      );
    }

    app.save(collection);

    // Backfill existing course records with safe defaults.
    const existing = app.findRecordsByFilter('courses', '1=1');
    for (const c of existing) {
      let changed = false;
      if (!c.get('taxConfig')) { c.set('taxConfig', 'pending'); changed = true; }
      if (c.get('taxRate') === null) { c.set('taxRate', 0); changed = true; }
      if (c.get('discount') === null) { c.set('discount', 0); changed = true; }
      if (c.get('paymentEnabled') === null) { c.set('paymentEnabled', false); changed = true; }
      if (!c.get('paymentStatus')) { c.set('paymentStatus', 'disabled'); changed = true; }
      if (changed) app.save(c);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('courses');
    for (const name of ['taxConfig', 'taxRate', 'discount', 'discountLabel', 'paymentEnabled', 'paymentStatus']) {
      try { collection.fields.removeByName(name); } catch (_) { /* already gone */ }
    }
    app.save(collection);
  },
);
