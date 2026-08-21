import { jest } from '@jest/globals';
import { normalizePhoneNumber, sendBrevoSms } from './brevo-sms.js';

describe('Brevo SMS client', () => {
  it.each([
    ['0628227095', '33628227095'],
    ['+33 6 28 22 70 95', '33628227095'],
    ['0033628227095', '33628227095'],
  ])('normalise %s au format Brevo', (phoneNumber, expected) => {
    expect(normalizePhoneNumber(phoneNumber)).toBe(expected);
  });

  it('refuse un numéro invalide', () => {
    expect(normalizePhoneNumber('invalide')).toBeNull();
  });

  it('envoie un SMS transactionnel au format Brevo', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 123456 }),
    });

    await expect(sendBrevoSms({
      apiKey: 'test-api-key',
      sender: 'AnnecyTC',
      recipient: '33628227095',
      content: 'Votre code PIN est 123456789.',
      fetchImpl,
    })).resolves.toBe(123456);

    expect(fetchImpl).toHaveBeenCalledWith('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': 'test-api-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: 'AnnecyTC',
        recipient: '33628227095',
        content: 'Votre code PIN est 123456789.',
        type: 'transactional',
      }),
    });
  });
});