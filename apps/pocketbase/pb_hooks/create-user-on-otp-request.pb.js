/// <reference path="../pb_data/types.d.ts" />

// Creates a user record when an OTP is requested for an email that does not
// yet exist. This enables passwordless sign-up: a visitor enters their email,
// receives an OTP, and a student account is created on first request.
onRecordRequestOTPRequest((e) => {
  if (!e.record) {
    const email = e.requestInfo().body['email'];

    const record = new Record(e.collection);
    record.setEmail(email);
    record.setPassword($security.randomString(30));
    record.set('role', 'student');
    record.set('verified', true);

    e.app.save(record);
    e.record = record;
  }

  return e.next();
}, 'users');
