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

export default async function handler(req, res) {

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

    // 1) Refuser tout sauf POST
    if (req.method !== "POST") {
      return res.status(200).json({ message: `Méthode ${req.method} non autorisée` });
    }

    // 2) Payload JSON déjà parsé par Vercel
    const payload = req.body;
    const payoadJson = JSON.stringify(payload, null, 2);
    const payloadData = payload?.data;
    const matchFormSlug = payloadData?.formSlug == "location-de-raquettes-de-padel"
    if (!matchFormSlug) {
      console.log("Notification non traitée (formSlug non géré) :", payoadJson);
      return res.status(200).json({ ignored: true });
    }

    // 3) Extract un des items "Location d'une ou plusieurs raquettes de padel"
    const tierIdItemUneRaquette = 16987683;
    const tierIdItemDeuxRaquettes = 18135283;
    const tierIdItemTroisOuQuatreRaquettes = 18135558;
    const stateItem = "Processed";
    const matchedItem = payloadData?.items?.find((item) =>
      (item?.tierId === tierIdItemUneRaquette ||
        item?.tierId === tierIdItemDeuxRaquettes ||
        item?.tierId === tierIdItemTroisOuQuatreRaquettes) &&
      item?.state === stateItem
    );
    if (!matchedItem) {
      console.log("Notification non traitée (item non géré) :", payoadJson);
      return res.status(200).json({ ignored: true });
    }
    console.log("Notification à traiter :", payoadJson);

    const transporter = nodemailer.createTransport({
      host: CONFIG.host,
      port: Number(CONFIG.port || 587),
      secure: Number(CONFIG.port) === 465, // true si port 465
      auth: {
        user: CONFIG.user,
        pass: CONFIG.pass,
      },
    });

    // 4) Récupérer l’email du payeur (sécuriser un minimum)
    const nameItem = matchedItem?.name;
    const email = payloadData?.payer?.email;
    if (!email) {
      console.error("Aucune adresse e‑mail trouvée dans le payload");
      await transporter.sendMail({
        from: CONFIG.fromEmail,
        to: CONFIG.supportEmail,
        subject: "[Erreur API HelloAsso] Email manquant dans le payload",
        text: `Aucune adresse e-mail n'a été trouvée dans le payload reçu:\n\n${payoadJson}`
      });
      return res.status(200).json({ message: "Email manquant" });
    }

    // 5) Générer un code PIN
    let customFields, jourLocation, heureLocation, debutPinCode, finPinCode, codePin, locationDateStr;
    try {
      const accessToken = await getIgloohomeAccessToken();
      customFields = matchedItem?.customFields || [];
      jourLocation = customFields.find(f => f.name === "Jour de la location");
      heureLocation = customFields.find(f => f.name === "Début de la location");
      locationDateStr = `${jourLocation.answer} à ${heureLocation.answer}`;
      debutPinCode = await CalculerDebutPinCode(jourLocation, heureLocation);
      finPinCode = calculerFinPinCode(debutPinCode);
      codePin = await createHourlyPin(accessToken, CONFIG.iglooDeviceId, debutPinCode, finPinCode);
    } catch (err) {
      console.error("Erreur lors de la génération du code PIN :", err);
      await transporter.sendMail({
        from: CONFIG.fromEmail,
        to: CONFIG.supportEmail,
        subject: "[Erreur API HelloAsso] Échec de la génération du code PIN",
        text: `Une erreur est survenue lors de la génération du code PIN pour la réservation suivante :\n\n${payoadJson}\n\nErreur : ${err.message}`
      });
      return res.status(200).json({ status: "error", message: "Erreur lors de la génération du code PIN" });
    }
    console.log(`Code PIN généré pour ${email} : ${codePin}`);

    // 6) Envoyer le code PIN au payeur
    const nombreRaquettes = (matchedItem?.tierId === tierIdItemUneRaquette) ? 1 :
      (matchedItem?.tierId === tierIdItemDeuxRaquettes) ? 2 : 3; // 3 ou 4 raquettes  
    await transporter.sendMail({
      from: CONFIG.fromEmail,
      to: email,
      subject: "Votre code PIN pour la location de raquettes de padel",
      text: `Bonjour,

  Voici votre code PIN « ${nameItem} »: ${codePin}

  Date et heure de la location : ${locationDateStr} (le code PIN sera valide un peu avant et plusieurs heures après le début de la location)

  Nombre de raquettes louées : ${nombreRaquettes}

  Voici les instructions pour utiliser les raquettes de padel :
  1- Allez au local matériel (à côté du panneau des lumières)
  2- Sur le coffret électronique, entrez le code PIN à 9 chiffres, appuyez sur l'icone de dévérouillage pour valider, tirez sur le cadenas pour l’ouvrir et récupérer la clé du placard à raquettes
  3- Ouvrez le placard avec la clé et prenez la ou les raquettes de padel que vous avez réservées
  4- Remettez la clé dans le coffret et refermez-le
  5- À la fin de votre créneau de location, remettez les raquettes dans le placard et refermez le coffret (avec le même code PIN)

  Nous vous remercions de votre confiance et restons à votre disposition pour toute question.

  À très bientôt sur les pistes !

  Sportivement,

  Le club Annecy Tennis`,
    });
    console.log(`E‑mail envoyé à ${email} (codePin: ${codePin})`);
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
  - Email : ${email}
  - Date et heure : ${locationDateStr}
  - Nombre de raquettes louées : ${nombreRaquettes}

  Sportivement,

  P.S : Ce message est généré automatiquement par l'API HelloAsso.`,
      });
    }

    // 7) Répondre à HelloAsso
    await sendLogToLogflare({
      level: "info",
      message: "Code PIN généré et e‑mail envoyé",
      metadata: { email, locationDateStr, nombreRaquettes, codePin }
    });
    return res.status(200).json({ sent: true });

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

    async function EnvoyerEmailAuPayeurCarDateDebutIncorrecte() {
      const emailErreurReservation = {
        from: CONFIG.fromEmail,
        subject: "Erreur sur la réservation de raquettes de padel",
        text: `Bonjour,

        Votre demande de location de raquettes de padel n'a pas pu être traitée car la date et l'heure de début de location (${locationDateStr}) sont trop anciennes ou incorrectes.

        Vous pouvez essayer de soumettre une nouvelle demande avec des informations de location avec des date/heure valides. 
        
        Nous vous rembourserons cette location erronée.

        Sportivement,
        Le club Annecy Tennis`
      };
      emailErreurReservation.to = email;
      await transporter.sendMail(emailErreurReservation);
    }

    async function CalculerDebutPinCode(jourLocation, heureLocation) {
      if (!jourLocation || !heureLocation) {
        EnvoyerEmailAuPayeurCarDateDebutIncorrecte();
        throw new Error(`Missing custom fields Jour/Heure in payload (jourLocation : ${jourLocation}, heureLocation : ${heureLocation})`);
      }
      const [day, month, year] = jourLocation.answer.split("/").map(Number);
      const [hour, minute] = heureLocation.answer.split(":").map(Number);
      const timeZone = "Europe/Paris";
      //  Converts the Date as if it's Paris time and convert to UTC
      const debutLocation = fromZonedTime(new Date(year, month - 1, day, hour, minute, 0), timeZone);
      const nowParisTZ = new Date(); //current time already in UTC
      const diffMinutes = (nowParisTZ.getTime() - debutLocation.getTime()) / (1000 * 60);
      console.log(`nowParisTZ : ${nowParisTZ.toString()}  - debutLocation : ${debutLocation.toString()} = diffMinutes: ${diffMinutes}`);
      if (diffMinutes >= 75) {
        EnvoyerEmailAuPayeurCarDateDebutIncorrecte();
        throw new Error(`Debut de location est trop dans le passé de ${diffMinutes} minutes (nowParisTZ: ${nowParisTZ.toString()}  - debutLocation : ${debutLocation.toString()})`);
      }
      const debutPinCode = new Date(debutLocation);
      if (diffMinutes >= 0) {
        // début de location dans le passé mais encore en cours
        console.warn("Début de location est dans le passé mais encore en cours");
        debutPinCode.setHours(nowParisTZ.getHours());
      } else { // La location est dans le futur
        if (debutLocation.getMinutes() == 0) {
          debutPinCode.setHours(debutLocation.getHours() - 1);
        }
      }
      debutPinCode.setMinutes(0);
      return debutPinCode;
    }

    function calculerFinPinCode(debutPinCode) {
      // Valid for 5 hours
      const finPinCode = new Date(debutPinCode);
      finPinCode.setHours(debutPinCode.getHours() + 5);
      return finPinCode;
    }

    async function createHourlyPin(accessToken, deviceId, startDateParisTZ, endDateParisTZ) {

      // Helper to format date as YYYY-MM-DDTHH:00:00+hh:mm
      function formatIglooDate(date) {
        const pad = n => n.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hour = pad(date.getHours());
        // Format: YYYY-MM-DDTHH:00:00+02:00 (Paris time, including offset)
        const offset = -date.getTimezoneOffset();
        const sign = offset >= 0 ? "+" : "-";
        const absOffset = Math.abs(offset);
        const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        return `${year}-${month}-${day}T${hour}:00:00${sign}${offsetHours}:00`;
      }

      // log the request details
      const startIgloo = formatIglooDate(startDateParisTZ);
      const endIgloo = formatIglooDate(endDateParisTZ);
      console.log(`Requesting PIN for device ${deviceId} from ${startIgloo} to ${endIgloo}`);
      const resp = await fetch(`https://api.igloodeveloper.co/igloohome/devices/${deviceId}/algopin/hourly`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variance: 1,
          startDate: startIgloo,
          endDate: endIgloo,
          accessName: email,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        await transporter.sendMail({
          from: CONFIG.fromEmail,
          to: CONFIG.supportEmail,
          subject: "[Erreur API HelloAsso] Erreur lors de la création du code PIN",
          text: `Erreur lors de la création du code PIN via l'API Igloohome:\n\nStatus: ${resp.status}\nRéponse: ${JSON.stringify(data, null, 2)}\n\nPayload:\n${payoadJson}`
        });
        throw new Error(`PIN creation failed: ${resp.status} ${JSON.stringify(data)}`);
      }

      // log the response details
      console.log(`Igloohome response: ${JSON.stringify(data)}`);

      // Verify that the pin exists in the response and contains 9 digits
      if (!data.pin || !/^\d{9}$/.test(data.pin)) {
        throw new Error(`Unexpected PIN format: ${JSON.stringify(data)}`);
      }
      return data.pin;
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

  } catch (err) {
    console.error("Erreur inattendue dans le handler :", err);
    return res.status(200).json({ error: "Internal Server Error" });
  }
}


