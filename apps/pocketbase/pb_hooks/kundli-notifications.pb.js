/// <reference path="../pb_data/types.d.ts" />

// Sends transactional email notifications for Kundli requests:
// 1. On create — "request received" confirmation to the customer.
// 2. On update — "report ready" notification when the admin releases the PDF.
// Private Kundli PDFs are never attached to emails; the customer downloads
// securely from their dashboard. Best-effort: a mail failure never aborts the
// record operation.
onRecordAfterCreateSuccess((e) => {
  const email = e.record.get('email');
  const name = e.record.get('fullName') || 'there';
  const requestId = e.record.get('requestId') || '';

  if (!email) {
    e.next();
    return;
  }

  const html =
    '<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#2a2440;">' +
    '<h2 style="color:#0c1023;">Dear ' + name + ',</h2>' +
    '<p>Thank you for submitting your Kundli details to DevineX Astro.</p>' +
    '<p>Your request has been received successfully.</p>' +
    '<p><strong>Request ID:</strong> ' + requestId + '</p>' +
    '<p>Our astrology team will review your details and prepare your personalized report.</p>' +
    '<p>You can check its status by logging into your account at ' +
    '<a href="https://www.devinexastro.com/my-kundli" style="color:#b8893b;">www.devinexastro.com/my-kundli</a>.</p>' +
    '<p style="margin-top:24px;">Warm Regards,<br/>Team DevineX Astro<br/>www.devinexastro.com</p>' +
    '</div>';

  try {
    const message = new MailerMessage({
      from: { name: 'DevineX Astro' },
      to: [{ address: email }],
      subject: 'Your DevineX Astro Kundli Request Has Been Received',
      html: html,
    });
    $app.newMailClient().send(message);
  } catch (err) {
    $app.logger().error('kundli received email failed', 'to', email, 'err', String(err));
  }

  e.next();
}, 'kundli_requests');

onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get('status');
  const released = e.record.get('reportReleased');
  const notified = e.record.get('readyNotified');
  const email = e.record.get('email');
  const name = e.record.get('fullName') || 'there';

  // Send the "ready" email exactly once, when the report is released.
  if (status === 'ready' && released && !notified && email) {
    const html =
      '<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#2a2440;">' +
      '<h2 style="color:#0c1023;">Dear ' + name + ',</h2>' +
      '<p>Your personalized Vedic Kundli report is now ready.</p>' +
      '<p>Log in to your DevineX Astro account to securely download your report.</p>' +
      '<p><a href="https://www.devinexastro.com/my-kundli" style="color:#b8893b;">Download: https://www.devinexastro.com/my-kundli</a></p>' +
      '<p style="margin-top:24px;">Warm Regards,<br/>Team DevineX Astro<br/>www.devinexastro.com</p>' +
      '</div>';

    try {
      const message = new MailerMessage({
        from: { name: 'DevineX Astro' },
        to: [{ address: email }],
        subject: 'Your DevineX Astro Kundli Is Ready!',
        html: html,
      });
      $app.newMailClient().send(message);

      // Mark as notified so the email is not sent again on later updates.
      e.record.set('readyNotified', true);
      e.app.save(e.record);
    } catch (err) {
      $app.logger().error('kundli ready email failed', 'to', email, 'err', String(err));
    }
  }

  e.next();
}, 'kundli_requests');
