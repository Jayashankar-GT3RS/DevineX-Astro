/// <reference path="../pb_data/types.d.ts" />

// Sends a notification email to the DevineX Astro team when a new enquiry
// (lead) is submitted through the public inquiry form. Best-effort: a mail
// failure never aborts the record creation.
onRecordAfterCreateSuccess((e) => {
  const name = e.record.get('name') || 'A visitor';
  const email = e.record.get('email') || '';
  const phone = e.record.get('phone') || '';
  const course = e.record.get('course') || '';
  const intent = e.record.get('intent') || '';
  const city = e.record.get('city') || '';
  const message = e.record.get('message') || '';

  const subject = 'New course enquiry from ' + name;

  const html = [
    '<h2>New enquiry received</h2>',
    '<p>A new lead has been submitted through the DevineX Astro website.</p>',
    '<table cellpadding="6" style="font-size:14px;">',
    '<tr><td><strong>Name:</strong></td><td>' + name + '</td></tr>',
    '<tr><td><strong>Email:</strong></td><td>' + email + '</td></tr>',
    '<tr><td><strong>Phone:</strong></td><td>' + phone + '</td></tr>',
    '<tr><td><strong>City:</strong></td><td>' + city + '</td></tr>',
    '<tr><td><strong>Course interest:</strong></td><td>' + course + '</td></tr>',
    '<tr><td><strong>Intent:</strong></td><td>' + intent + '</td></tr>',
    message ? '<tr><td><strong>Message:</strong></td><td>' + message + '</td></tr>' : '',
    '</table>',
    '<p style="font-size:12px;color:#888;">Review and manage this lead from the admin panel under Lead Management.</p>',
  ].join('');

  try {
    const message2 = new MailerMessage({
      from: { name: 'DevineX Astro Enquiries' },
      to: [{ address: 'contact@devinexastro.com' }],
      subject: subject,
      html: html,
    });
    $app.newMailClient().send(message2);
  } catch (err) {
    $app.logger().error('lead notification email failed', 'err', String(err));
  }

  e.next();
}, 'astro_inquiries');
