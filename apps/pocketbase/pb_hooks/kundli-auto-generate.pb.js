/// <reference path="../pb_data/types.d.ts" />

// Auto-triggers Kundli generation when a new request is created, but ONLY when
// an administrator has enabled automatic generation in the engine settings.
// When automatic generation is disabled (the default), the request stays in
// "submitted" status for an administrator to trigger manually from the panel.
// Calls the site's own /api/kundli/generate route with the internal request
// secret so the route can authenticate the server-side job.
onRecordAfterCreateSuccess((e) => {
  const requestId = e.record.id;

  // Read the engine settings to decide whether to auto-generate.
  let autoGenerate = false;
  try {
    const settings = $app.findFirstRecordByFilter('kundli_settings', "id != ''");
    if (settings) {
      autoGenerate = settings.getBool('autoGenerationEnabled', false);
    }
  } catch (_) {
    // Settings not yet seeded or unavailable — do not auto-generate.
  }

  if (!autoGenerate) {
    e.next();
    return;
  }

  // Fire-and-forget: generation runs independently of the record operation.
  $http.send({
    url: 'http://localhost:3000/api/kundli/generate',
    method: 'POST',
    body: JSON.stringify({ requestId: requestId }),
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': $os.getenv('INTERNAL_REQUEST_SECRET'),
    },
    timeout: 3000,
  });

  e.next();
}, 'kundli_requests');
