import fetch from 'node-fetch';

const BREVO_SMS_ENDPOINT = 'https://api.brevo.com/v3/transactionalSMS/sms';

export function normalizePhoneNumber(phoneNumber) {
  const digits = String(phoneNumber || '').trim().replace(/[^\d+]/g, '');
  const internationalNumber = digits.startsWith('+')
    ? digits.slice(1)
    : digits.startsWith('00')
      ? digits.slice(2)
      : digits;
  const normalizedNumber = /^0[1-9]\d{8}$/.test(internationalNumber)
    ? `33${internationalNumber.slice(1)}`
    : internationalNumber;

  return /^\d{8,15}$/.test(normalizedNumber) ? normalizedNumber : null;
}

export async function sendBrevoSms({ apiKey, sender, recipient, content, fetchImpl = fetch }) {
  if (!apiKey) {
    throw new Error('BREVO_API_KEY manquante');
  }
  if (!/^[A-Za-z0-9]{3,11}$/.test(sender || '')) {
    throw new Error('BREVO_SMS_SENDER doit contenir entre 3 et 11 caractères alphanumériques');
  }
  if (!/^\d{8,15}$/.test(recipient || '')) {
    throw new Error('Numéro de téléphone destinataire Brevo invalide');
  }

  const response = await fetchImpl(BREVO_SMS_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sender, recipient, content, type: 'transactional' }),
  });
  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Échec de l'envoi SMS Brevo (${response.status}): ${JSON.stringify(responseBody)}`);
  }
  if (!responseBody.messageId) {
    throw new Error('Réponse Brevo invalide : messageId manquant');
  }

  return responseBody.messageId;
}