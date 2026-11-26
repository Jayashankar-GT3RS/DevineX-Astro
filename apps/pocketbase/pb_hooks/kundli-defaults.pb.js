/// <reference path="../pb_data/types.d.ts" />

// Generates a unique display request ID and sets the initial status when a
// new Kundli request is created through the public form.
onRecordCreateRequest((e) => {
  if (!e.record.get('requestId')) {
    e.record.set('requestId', 'DXK-' + $security.randomString(8).toUpperCase());
  }
  if (!e.record.get('status')) {
    e.record.set('status', 'submitted');
  }
  if (!e.record.get('downloadCount')) {
    e.record.set('downloadCount', 0);
  }
  e.next();
}, 'kundli_requests');
