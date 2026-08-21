# Integration HelloAsso / Igloo Home

## How to run unit tests

### Debug

1. Open VS Code
2. Open debug panel
3. Execute "Debg Jest Test" => it will execute helloasso.test.js using launch.json configuration

## Test local d'envoi SMS Brevo

Le test `api/brevo-sms.local.test.js` appelle uniquement l'API SMS transactionnelle de Brevo. Il n'exécute pas le handler HelloAsso, Igloohome ou SMTP.

1. Renseigner `BREVO_API_KEY`, `BREVO_SMS_SENDER` et `BREVO_SMS_RECIPIENT` dans `.env`.
	L'expéditeur doit faire de 3 à 11 caractères alphanumériques, par exemple `AnnecyTC`.
	Le destinataire doit être au format E.164 sans le signe `+`, par exemple `33612345678`.
2. Mettre `RUN_BREVO_SMS_TEST=1` dans `.env` pour autoriser l'envoi réel.
3. Lancer `npm run test:brevo:sms`.

Par défaut, `RUN_BREVO_SMS_TEST=0` : le test est ignoré et aucun SMS n'est envoyé.

## How to test manually Igloohome API
1. Ourvir Git Bash
2. dans le dossier scripts, exécuter ``bash commandes.sh`` 


