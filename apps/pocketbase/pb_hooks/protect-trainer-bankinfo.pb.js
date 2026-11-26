/// <reference path="../pb_data/types.d.ts" />

// Hides the sensitive `bankInfo` field on trainer profiles from everyone
// except administrators. Trainers can view and edit their own public profile
// fields (biography, photo, languages, availability) but bank and payment
// information is visible only to authorized admin personnel.
onRecordEnrich((e) => {
  const auth = e.requestInfo.auth;
  const isAdmin = !!auth && auth.get('role') === 'admin';
  if (!isAdmin) {
    e.record.hide('bankInfo');
  }
  e.next();
}, 'trainers');
