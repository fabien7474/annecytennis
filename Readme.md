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
2. Le test est exclu de `npm test` et `RUN_BREVO_SMS_TEST=0` par défaut : aucun SMS ne part durant les tests locaux.
	Mettre temporairement `RUN_BREVO_SMS_TEST=1` uniquement pour autoriser un envoi manuel volontaire.
3. Lancer `npm run test:brevo:sms`.

Par défaut, `RUN_BREVO_SMS_TEST=0` : le test est ignoré et aucun SMS n'est envoyé.

## Envoi du code PIN par SMS

L'API envoie toujours le code PIN par e-mail. Elle envoie également un SMS Brevo au numéro renseigné dans le champ HelloAsso `Téléphone` lorsque les variables suivantes sont définies dans les variables d'environnement Vercel :

- `ENABLE_BREVO_SMS=1`
- `BREVO_API_KEY` : clé API Brevo de l'organisation disposant de crédits SMS ;
- `BREVO_SMS_SENDER` : expéditeur alphanumérique de 3 à 11 caractères, par exemple `AnnecyTC`.

Les numéros français sont convertis automatiquement de `06…` en format international Brevo `336…`. Si le téléphone, la configuration Brevo ou l'envoi SMS est invalide, l'e-mail reste envoyé et l'erreur SMS est inscrite dans les logs.

## How to test manually Igloohome API
1. Ourvir Git Bash
2. dans le dossier scripts, exécuter ``bash commandes.sh`` 


