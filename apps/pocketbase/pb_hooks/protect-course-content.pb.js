/// <reference path="../pb_data/types.d.ts" />

// Hides protected course content from users who are not enrolled in the
// lesson's or live class's course. Admins and the trainer assigned to the
// course always see everything. Enrolled students (enrollment status 'active'
// or 'completed') receive the full record including video URLs, notes,
// resources and meeting links.
//
// This is the access-control layer for paid course materials and class meeting
// links: the fields never reach a non-enrolled visitor's browser, even though
// the records themselves are listable by any authenticated user (so the
// curriculum outline and class schedule remain visible).

onRecordEnrich((e) => {
  const auth = e.requestInfo.auth;
  const courseId = e.record.get('course');
  let canSee = false;
  if (auth && courseId) {
    const role = auth.get('role');
    if (role === 'admin') {
      canSee = true;
    } else if (role === 'trainer') {
      try {
        const course = $app.findRecordById('courses', courseId);
        canSee = course.get('assignedTrainer') === auth.id;
      } catch (_) { canSee = false; }
    } else {
      try {
        const records = $app.findRecordsByFilter(
          'enrollments',
          'student = {:student} && course = {:course} && (status = \'active\' || status = \'completed\')',
          '',
          1,
          0,
          { student: auth.id, course: courseId },
        );
        canSee = records.length > 0;
      } catch (_) { canSee = false; }
    }
  }
  if (!canSee) {
    e.record.hide('videoUrl', 'notes', 'resources');
  }
  e.next();
}, 'lessons');

onRecordEnrich((e) => {
  const auth = e.requestInfo.auth;
  const courseId = e.record.get('course');
  let canSee = false;
  if (auth && courseId) {
    const role = auth.get('role');
    if (role === 'admin') {
      canSee = true;
    } else if (role === 'trainer') {
      try {
        const course = $app.findRecordById('courses', courseId);
        canSee = course.get('assignedTrainer') === auth.id;
      } catch (_) { canSee = false; }
    } else {
      try {
        const records = $app.findRecordsByFilter(
          'enrollments',
          'student = {:student} && course = {:course} && (status = \'active\' || status = \'completed\')',
          '',
          1,
          0,
          { student: auth.id, course: courseId },
        );
        canSee = records.length > 0;
      } catch (_) { canSee = false; }
    }
  }
  if (!canSee) {
    e.record.hide('meetingUrl', 'recordingUrl');
  }
  e.next();
}, 'live_classes');
