import 'dotenv/config';
import fetch from 'node-fetch';

const shouldSendSms = process.env.RUN_BREVO_SMS_TEST === '1';
const testOrSkip = shouldSendSms ? test : test.skip;

describe('Brevo SMS local integration', () => {
  testOrSkip('envoie uniquement un SMS transactionnel via Brevo', async () => {
    const apiKey = process.env.BREVO_API_KEY;
    const sender = process.env.BREVO_SMS_SENDER;
    const recipient = process.env.BREVO_SMS_RECIPIENT;

    expect(apiKey).toBeTruthy();
    expect(sender).toMatch(/^[A-Za-z0-9]{3,11}$/);
    expect(recipient).toMatch(/^\d{8,15}$/);

    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        recipient,
        content: `Test local Brevo SMS (${new Date().toISOString()})`,
        type: 'transactional',
      }),
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Brevo SMS API response error:', responseBody);
    }
    expect(response.ok).toBe(true);
    expect(responseBody).toHaveProperty('messageId');
  }, 30_000);
});