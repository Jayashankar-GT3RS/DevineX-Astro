/// <reference path="../pb_data/types.d.ts" />

// Extends astro_inquiries into a lightweight admissions CRM: lead status,
// counsellor assignment, follow-up notes and last-contacted tracking. Public
// submissions still only need consent; the CRM fields are admin-managed.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('astro_inquiries');

    const has = (name) => {
      try { collection.fields.getByName(name); return true; } catch (_) { return false; }
    };

    if (!has('state')) {
      collection.fields.add(new TextField({ name: 'state', max: 100 }));
    }
    if (!has('experienceLevel')) {
      collection.fields.add(new SelectField({
        name: 'experienceLevel',
        maxSelect: 1,
        values: ['Beginner', 'Intermediate', 'Advanced', 'Just curious'],
      }));
    }
    if (!has('leadSource')) {
      collection.fields.add(new TextField({ name: 'leadSource', max: 120 }));
    }
    if (!has('assignedCounsellor')) {
      collection.fields.add(new TextField({ name: 'assignedCounsellor', max: 200 }));
    }
    if (!has('leadStatus')) {
      collection.fields.add(new SelectField({
        name: 'leadStatus',
        maxSelect: 1,
        values: ['New', 'Contacted', 'Interested', 'Follow-Up', 'Payment Pending', 'Enrolled', 'Not Interested'],
      }));
    }
    if (!has('leadNotes')) {
      collection.fields.add(new TextField({ name: 'leadNotes', max: 10000 }));
    }
    if (!has('lastContactedDate')) {
      collection.fields.add(new DateField({ name: 'lastContactedDate' }));
    }

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('astro_inquiries');
    for (const name of ['lastContactedDate', 'leadNotes', 'leadStatus', 'assignedCounsellor', 'leadSource', 'experienceLevel', 'state']) {
      try { collection.fields.removeByName(name); } catch (_) { /* already gone */ }
    }
    app.save(collection);
  },
);
