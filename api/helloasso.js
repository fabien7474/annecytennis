/**
 * Dépendances :
 *   npm install nodemailer
 *
 * Variables d’environnement à définir dans Vercel :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  ➜ paramètres SMTP de ton fournisseur
 *   FROM_EMAIL                                ➜ adresse « expéditeur » (ex. noreply@annecy-tennis.fr)
 */

import * as dateFnsTz from 'date-fns-tz';
import fetch from "node-fetch";
import nodemailer from "nodemailer";
const { fromZonedTime } = dateFnsTz;

export default async function handler(req, res, {
  createHourlyPin: createHourlyPinOverride,
} = {}) {

  const CONFIG = {
    enabled: process.env.ENABLE_CODE_PIN_GENERATION === "1",
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL,
    accueilEmail: process.env.ACCUEIL_EMAIL || process.env.FROM_EMAIL,
    supportEmail: process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL,
    logflareAPIKey: process.env.LOGFLARE_API_KEY,
    logflareSource: process.env.LOGFLARE_SOURCE,
    iglooDeviceId: process.env.IGLOO_DEVICE_ID,
    iglooClientId: process.env.IGLOO_CLIENT_ID,
    iglooClientSecret: process.env.IGLOO_CLIENT_SECRET,
  };

  try {

    // 0 Sortir si pas enabled
    if (!CONFIG.enabled) {
      return res.status(200).json({ message: "API désactivée" });
    }
    const transporter = nodemailer.createTransport({
      host: CONFIG.host,
      port: Number(CONFIG.port || 587),
      secure: Number(CONFIG.port) === 465, // true si port 465
      auth: {
        user: CONFIG.user,
        pass: CONFIG.pass,
      },
    });

    // 1) Refuser tout sauf POST
    if (req.method !== "POST") {
      const errorMsg = `Méthode ${req.method} non autorisée`;
      await logError(errorMsg);
      return res.status(200).json({ ignored: true, message: errorMsg });
    }

    // 2) Payload JSON déjà parsé par Vercel
    const payload = req.body;
    const payoadJson = JSON.stringify(payload, null, 2);
    const payloadData = payload?.data;
    const matchFormSlug = payloadData?.formSlug == "location-de-raquettes-de-padel"
    if (!matchFormSlug) {
      const errorMsg = `FormSlug non géré : ${payloadData?.formSlug}`;
      await logError(errorMsg);
      return res.status(200).json({ ignored: true, message: errorMsg });
    }

    // 3) Extract un des items "Location d'une ou plusieurs raquettes de padel"
    const tierIdItemUneRaquette = 16987683;
    const tierIdItemDeuxRaquettes = 18135283;
    const tierIdItemTroisRaquettes = 21886993;
    const tierIdItemQuatreRaquettes = 21886986;
    const stateItem = "Processed";
    const matchedItem = payloadData?.items?.find((item) =>
      (item?.tierId === tierIdItemUneRaquette ||
        item?.tierId === tierIdItemDeuxRaquettes ||
        item?.tierId === tierIdItemTroisRaquettes ||
        item?.tierId === tierIdItemQuatreRaquettes) &&
      item?.state === stateItem
    );
    if (!matchedItem) {
      const errorMsg = `Aucun item correspondant trouvé dans le payload (tierId attendu : ${tierIdItemUneRaquette}, ${tierIdItemDeuxRaquettes}, ${tierIdItemTroisRaquettes}, ${tierIdItemQuatreRaquettes} ; state attendu : ${stateItem})`;
      await logError(errorMsg);
      return res.status(200).json({ ignored: true, message: errorMsg });
    }
    console.log("Notification à traiter :", payoadJson);

    // 4) Récupérer l’email du payeur (sécuriser un minimum)
    const nameItem = matchedItem?.name;
    const payerEmail = payloadData?.payer?.email;
    if (!payerEmail) {
      const errorMsg = `Email manquant ou invalide. email = ${payerEmail}`;
      await logError(errorMsg);
      return res.status(200).json({ ignored: true, message: errorMsg });
    }

    // 5) Extraire locationAujourdhui, jourLocationField et heureLocationField depuis matchedItem.customFields
    let customFields, locationJour, locationMois, locationAnnee, codePin, accessToken;
    customFields = matchedItem?.customFields || [];
    const locationAujourdhui = customFields.find(f => f.id === 6960318);
    console.log(`Champ personnalisé "Location aujourd'hui" : ${JSON.stringify(locationAujourdhui)}`);
    const jourLocationField = customFields.find(f => f.name === "Jour de la location (si pas aujourd'hui)");
    console.log(`Champ personnalisé "Jour de la location" : ${JSON.stringify(jourLocationField)}`);
    const heureLocationField = customFields.find(f => f.name === "Début de la location");
    console.log(`Champ personnalisé "Début de la location" : ${JSON.stringify(heureLocationField)}`);

    // Calculer locationAujourduiParis
    const locationAujourdhuiBool = locationAujourdhui?.answer === "Oui";
    // Extraire et calculer heureLocation au format HH:mm
    if (((!jourLocationField) && !locationAujourdhuiBool) || !heureLocationField) {
      const errorMsg = `Champs personnalisés manquants ou invalides. locationAujourdhuiBool = ${locationAujourdhuiBool}, jourLocationField = ${JSON.stringify(jourLocationField)}, heureLocationField = ${JSON.stringify(heureLocationField)}`;
      await logError(errorMsg);
      return res.status(200).json({ ignored: true, message: errorMsg });
    }
    // Calculer locationDate
    //Si locationAujourd'hui égale à "Oui" alors remplacer jourLocation par la date du jour
    const timeZoneParis = "Europe/Paris";
    // On utilise meta.updatedAt du payload (date de traitement HelloAsso) plutôt que l'heure du serveur, avec new Date() en secours si absent
    const nowDate = payloadData?.meta?.updatedAt ? new Date(payloadData.meta.updatedAt) : new Date();
    if (locationAujourdhuiBool) {
      const nowJourParis = Number(nowDate.toLocaleString("fr-FR", { timeZone: timeZoneParis, day: "2-digit" }));
      const nowMoisParis = Number(nowDate.toLocaleString("fr-FR", { timeZone: timeZoneParis, month: "2-digit" }));
      const nowAnneeParis = Number(nowDate.toLocaleString("fr-FR", { timeZone: timeZoneParis, year: "numeric" }));
      locationJour = nowJourParis;
      locationMois = nowMoisParis;
      locationAnnee = nowAnneeParis;
    } else {
      [locationJour, locationMois, locationAnnee] = jourLocationField.answer.split("/").map(Number)
      // Valider que locationJour, locationMois, locationAnnee sont des nombres valides
      if (Number.isNaN(locationJour) || Number.isNaN(locationMois) || Number.isNaN(locationAnnee)) {
        const errorMsg = `Date location format invalide: ${jourLocationField.answer}`;
        await logError(errorMsg);
        return res.status(200).json({ ignored: true, message: errorMsg });
      }
    }
    const [locationHeure, locationMinute] = heureLocationField.answer.split(":").map(Number);
    if (Number.isNaN(locationHeure) || Number.isNaN(locationMinute)) {
      const errorMsg = `Heure location format invalide: ${heureLocationField.answer}`;
      await logError(errorMsg);
      return res.status(200).json({ ignored: true, message: errorMsg });
    }

    const pad2 = n => n.toString().padStart(2, '0');
    const locationDateStr = `${pad2(locationJour)}/${pad2(locationMois)}/${pad2(locationAnnee)} à ${pad2(locationHeure)}:${pad2(locationMinute)}`;

    // 6) Générer un code PIN
    // Calculer diffMinutes entre nowParis et location à partir des variables nowJourParis, nowMoisParis, nowAnneeParis, nowHeureParis, nowMinuteParis et locationJour, locationMois, locationAnnee, locationHeure, locationMinute
    // On passe une chaîne ISO sans offset (et non un objet Date) pour que fromZonedTime interprète les composants
    // directement comme heure de Paris, sans dépendre du fuseau horaire local du serveur (ex. Japon)
    const debutLocation = fromZonedTime(`${locationAnnee}-${pad2(locationMois)}-${pad2(locationJour)}T${pad2(locationHeure)}:${pad2(locationMinute)}:00`, timeZoneParis);
    const diffMinutes = (nowDate.getTime() - debutLocation.getTime()) / (1000 * 60);
    console.log(`nowParisDate : ${nowDate.toString()}  - debutLocation : ${debutLocation.toString()} = diffMinutes: ${diffMinutes}`);
    if (diffMinutes >= 75) { // Début de location dans le passé plus de 1h15 avant l'heure actuelle
      const errorMsg = `Debut de location est trop dans le passé de ${diffMinutes} minutes (nowParisTZ: ${nowDate.toString()}  - debutLocation : ${debutLocation.toString()})`;
      await envoyerEmailAuPayeur(errorMsg);
      await logError(errorMsg);
      return res.status(200).json({ ignored: true, message: errorMsg });
    }

    // Calculer debutPinCode
    let debutPinCode;
    if (diffMinutes >= 0) { // début de location dans le passé mais moins de 1h15 avant l'heure actuelle, donc la partie est encore en cours
      debutPinCode = nowDate; // on prend l'heure actuelle comme début de location
    } else { // la location est dans le futur : on enlève une heure si c'est une heure pleine pour pouvoir retirer les raquettes avant le début de la location
      if (debutLocation.getMinutes() == 0) {
        // debutPinCode = debutLocation - 1 heure
        debutPinCode = new Date(debutLocation.getTime() - 60 * 60 * 1000);
      } else {
        debutPinCode = new Date(debutLocation.getTime());
      }
    }
    // Set minutes and seconds to 0 for debutPinCode
    debutPinCode.setMinutes(0, 0, 0);

    // Récupérer l’access token Igloohome
    try {
      accessToken = await getIgloohomeAccessToken();
    } catch (err) {
      const errorMsg = `Erreur lors de l'acquisition de l'access token Igloohome : ${err.message}`;
      await logError(errorMsg);
      return res.status(200).json({ status: "error", message: errorMsg });
    }

    // Créer le code PIN via l’API Igloohome
    let pinInstructions;
    try {
      const hourlyPinGenerator = createHourlyPinOverride || createHourlyPin;
      codePin = await hourlyPinGenerator(accessToken, debutPinCode, payerEmail);
      pinInstructions = `Voici votre code PIN à utiliser pour ouvrir et refermer le coffret : ${codePin}`;
    } catch (err) {
      // On essaie à nouveau avec un one-time algoPIN code pour ouvrir et un autre one-time algoPIN code pour fermer.
      // On utilise https://api.igloodeveloper.co/igloohome/devices/{deviceId}/algopin/onetime
      // avec une startDate = start of the current hour in ISO Format.
      try {
        const startOfCurrentHour = removeMinutes(nowDate);
        const nextHour = new Date(startOfCurrentHour.getTime() + 60 * 60 * 1000);
        const codePinOuverture = await createOneTimePin(
          accessToken,
          startOfCurrentHour,
          payerEmail
        );
        const codePinFermeture = await createOneTimePin(
          accessToken,
          nextHour,
          payerEmail
        );
        codePin = codePinOuverture;
        // Vérifier code PIN ouverture et fermeture sont différents
        if (codePinOuverture === codePinFermeture) {
          const errorMsg = `Erreur : les codes PIN one-time ouverture et fermeture sont identiques : ${codePinOuverture}`;
          await logError(errorMsg);
          return res.status(200).json({ status: "error", message: errorMsg });
        }
        pinInstructions = `Code PIN d'ouverture : ${codePinOuverture} (utilisable une seule fois pour ouvrir le coffret)\n
  Code PIN de fermeture : ${codePinFermeture} (utilisable une seule fois pour refermer le coffret)`;
        console.log(`Codes PIN one-time générés pour ${payerEmail} : ouverture=${codePinOuverture}, fermeture=${codePinFermeture}`);
      } catch (fallbackErr) {
        await logError(`Erreur lors de la création des codes PIN one-time via l'API Igloohome : ${fallbackErr.message}`);
        return res.status(200).json({ status: "error", message: "Erreur lors de la génération du code PIN" });
      }
    }
    console.log(`Code PIN généré pour ${payerEmail} : ${codePin}`);

    // 6) Envoyer le code PIN au payeur
    const nombreRaquettes =
      (matchedItem?.tierId === tierIdItemUneRaquette) ? 1 :
        (matchedItem?.tierId === tierIdItemDeuxRaquettes) ? 2 :
          (matchedItem?.tierId === tierIdItemTroisRaquettes) ? 3 :
            (matchedItem?.tierId === tierIdItemQuatreRaquettes) ? 4 : 3; // 3 ou 4 raquettes
    await transporter.sendMail({
      from: CONFIG.fromEmail,
      to: payerEmail,
      subject: "Votre code PIN pour la location de raquettes de padel",
      text: `Bonjour,

  ${pinInstructions}

  Date et heure de la location : ${locationDateStr}

  Nombre de raquettes louées : ${nombreRaquettes}

  Voici les instructions pour utiliser les raquettes de padel :
  1- Allez au local matériel (à côté du panneau des lumières)
  2- Sur le coffret électronique, entrez le code PIN à 9 chiffres, appuyez sur l'icone de dévérouillage pour valider, tirez sur le cadenas pour l’ouvrir et récupérer la clé du placard à raquettes
  3- Ouvrez le coffre rouge avec la clé et prenez la ou les raquettes de padel que vous avez réservées
  4- Remettez la clé dans le coffret électronique et refermez-le
  5- À la fin de votre créneau de location, remettez les raquettes dans le placard et refermez le coffret avec le code PIN de fermeture indiqué ci-dessus (ou avec le même code PIN s'il n'y en a qu'un)

  Nous vous remercions de votre confiance et restons à votre disposition pour toute question.

  À très bientôt sur les pistes !

  Sportivement,

  Le club Annecy Tennis`,
    });
    console.log(`E‑mail envoyé à ${payerEmail} (codePin: ${codePin})`);
    // Si l’option « Accueil » est cochée, envoyer un e‑mail à l’accueil
    const hasOptionAccueil = matchedItem?.options?.some(opt => opt.optionId === 18137239) || false;
    if (hasOptionAccueil) {
      console.log("Option accueil demandée, envoi d’un e‑mail à l’accueil");
      await transporter.sendMail({
        from: CONFIG.fromEmail,
        to: CONFIG.accueilEmail,
        subject: `Raquettes de padel réservées à retirer à l'accueil`,
        text: `Bonjour,   

  Nous avons enregistré le paiement d'une location de raquettes de padel via HelloAsso à retirer à l'accueil.

  Voici les détails de la location :
  - Email : ${payerEmail}
  - Date et heure : ${locationDateStr}
  - Nombre de raquettes louées : ${nombreRaquettes}

  Sportivement,

  P.S : Ce message est généré automatiquement par l'API HelloAsso.`,
      });
    }

    async function getIgloohomeAccessToken() {
      const resp = await fetch("https://auth.igloohome.co/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: CONFIG.iglooClientId,
          client_secret: CONFIG.iglooClientSecret,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`OAuth2 failed: ${resp.status} ${JSON.stringify(data)}`);
      }
      return data.access_token;
    }

    async function envoyerEmailAuPayeur(raisonMsg) {
      const emailErreurReservation = {
        from: CONFIG.fromEmail,
        subject: "Erreur sur la réservation de raquettes de padel",
        text: `Bonjour,

        Votre demande de location de raquettes de padel n'a pas pu être traitée pour la raison suivante : 
        ${raisonMsg}

        Vous pouvez essayer de soumettre une nouvelle demande avec des informations de location avec des date/heure valides. 
        
        Nous vous rembourserons cette location erronée.

        Sportivement,
        Le club Annecy Tennis`
      };
      emailErreurReservation.to = payerEmail;
      await transporter.sendMail(emailErreurReservation);
    }

    // Helper to format date as YYYY-MM-DDTHH:00:00+hh:mm
    function formatIglooDate(date) {
      const pad = n => n.toString().padStart(2, '0');
      const year = Number(date.toLocaleString("fr-FR", { timeZone: "Europe/Paris", year: "numeric" }));
      const month = pad(Number(date.toLocaleString("fr-FR", { timeZone: "Europe/Paris", month: "2-digit" })));
      const day = pad(Number(date.toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit" })));
      // formatToParts + hourCycle "h23" évite le suffixe littéral "h" que fr-FR ajoute au format heure seule (ex. "23 h"), qui rend Number() NaN
      const hourPart = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" })
        .formatToParts(date)
        .find(p => p.type === "hour")?.value;
      let hourRaw = Number(hourPart);
      if (hourRaw === 24) hourRaw = 0; // Corrige le bug ICU qui retourne "24" au lieu de "00" à minuit
      const hour = pad(hourRaw);
      // Calculer le offset de la timezone Paris au format +02:00 ou +01:00 selon l'heure d'été/hiver
      const offsetPart = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Paris",
        timeZoneName: "shortOffset",
      })
        .formatToParts(date)
        .find((p) => p.type === "timeZoneName")?.value; // ex: "GMT+2"
      const match = offsetPart?.match(/GMT([+-])(\d+)(?::(\d+))?/);
      const sign = match?.[1] || "+";
      const offsetHours = pad(Number(match?.[2] || 1));
      const offsetMinutes = pad(Number(match?.[3] || 0));
      return `${year}-${month}-${day}T${hour}:00:00${sign}${offsetHours}:${offsetMinutes}`;
    }

    function removeMinutes(date) {
      const startOfHour = new Date(date);
      startOfHour.setMinutes(0, 0, 0);
      return startOfHour;
    }

    async function createPin(accessToken, startPinDate, accessName, { endpoint, endPinDate }) {
      const deviceId = CONFIG.iglooDeviceId;
      const startIgloo = formatIglooDate(startPinDate);
      const description = endpoint === "hourly" ? "Requesting hourly PIN" : "Requesting one-time PIN";
      const requestBody = {
        variance: 1,
        startDate: startIgloo,
        accessName: accessName,
      };
      if (endPinDate) {
        requestBody.endDate = formatIglooDate(endPinDate);
      }

      console.log(`${description} for device ${deviceId} from ${startIgloo}${requestBody.endDate ? ` to ${requestBody.endDate}` : ""}`);
      const resp = await fetch(`https://api.igloodeveloper.co/igloohome/devices/${deviceId}/algopin/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const iglooResponseJson = await resp.json();

      const respStatus = resp?.status;
      const respStringifyJson = JSON.stringify(iglooResponseJson, null, 2);
      if (!resp.ok) {
        const errorMsg = `Erreur lors de la création du code PIN via l'API Igloohome : \nIgloo response Status: ${respStatus}\nIgloo response Json: ${respStringifyJson}`;
        logError(errorMsg);
        throw new Error(errorMsg);
      }

      // log the response details
      console.log(`Igloohome response: ${respStringifyJson}`);

      // Verify that the pin exists in the response and contains 6 digits or more
      if (!iglooResponseJson?.pin || !/^\d{6,}$/.test(iglooResponseJson.pin)) {
        const errorMsg = `Unexpected PIN format from Igloohome API: ${respStringifyJson}`;
        logError(errorMsg);
        throw new Error(errorMsg);
      }

      return iglooResponseJson.pin;
    }

    async function createHourlyPin(accessToken, startPinDate, email) {
      const endPinDate = new Date(startPinDate.getTime() + 5 * 60 * 60 * 1000); // +5h en millisecondes, indépendant du fuseau serveur
      return createPin(accessToken, startPinDate, email, {
        endpoint: "hourly",
        endPinDate,
      });
    }

    async function createOneTimePin(accessToken, startPinDate, email) {
      // Create unique accessName using email and timestamp to avoid collisions
      return createPin(accessToken, startPinDate, email, {
        endpoint: "onetime",
      });
    }

    async function logError(errorMsg, emailSubject = "[Erreur HelloAsso2Igloo]") {
      console.error(errorMsg);
      if (!transporter) {
        console.error("Transporteur non initialisé");
        return;
      }
      let message2 = errorMsg;
      if (typeof payloadJson !== "undefined") {
        // Ajouter le payload JSON à l'e-mail de support si disponible
        message2 += `\n\nPayload JSON :\n${payloadJson}`;
      }
      await transporter.sendMail({
        from: CONFIG.fromEmail,
        to: CONFIG.supportEmail,
        subject: emailSubject,
        text: message2,
      });
    }

    async function sendLogToLogflare(entry) {
      // Send log entry to Logflare using their JSON events API
      if (!CONFIG.logflareAPIKey || !CONFIG.logflareSource) {
        console.warn("Logflare credentials missing, skipping log");
        return;
      }
      const response = await fetch(`https://api.logflare.app/logs/json?source=${CONFIG.logflareSource}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-API-KEY": CONFIG.logflareAPIKey
        },
        body: JSON.stringify([entry])
      });
      const data = await response.json();
      console.log("Logflare response:", JSON.stringify(data, null, 2));
      if (!response.ok) {
        console.error(`Logflare request failed: ${response.status} ${response.statusText}`);
      }
    }

    // 7) Répondre à HelloAsso
    return res.status(200).json({ sent: true });


  } catch (err) {
    console.error("Erreur inattendue dans le handler :", err);
    return res.status(200).json({ error: "Internal Server Error" });
  }
}


