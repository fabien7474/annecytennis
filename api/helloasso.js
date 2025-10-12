/**
 * Dépendances :
 *   npm install nodemailer
 *
 * Variables d’environnement à définir dans Vercel :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  ➜ paramètres SMTP de ton fournisseur
 *   FROM_EMAIL                                ➜ adresse « expéditeur » (ex. noreply@annecy-tennis.fr)
 */

import nodemailer from "nodemailer";
import util from "util";
import fetch from "node-fetch";
import * as dateFnsTz from 'date-fns-tz';
const { fromZonedTime } = dateFnsTz;

export default async function handler(req, res) {
  // 0 Sortir si pas enabled
  if (!process.env.ENABLE_CODE_PIN_GENERATION || process.env.ENABLE_CODE_PIN_GENERATION !== "1") {
    return res.status(503).json({ message: "API désactivée" });
  }

  // 1) Refuser tout sauf POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
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
  const matchItem = Boolean(matchedItem);
  if (!matchItem) {
    console.log("Notification non traitée (item non géré) :", payoadJson);
    return res.status(200).json({ ignored: true });
  }

  console.log("Notification à traiter :", payoadJson);

  /**
   * Helper to send error report email to admin
   */
  const SMTP_CONFIG = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL,
    accueilEmail: process.env.ACCUEIL_EMAIL || process.env.FROM_EMAIL,
    supportEmail: process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL
  };

  const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: Number(SMTP_CONFIG.port || 587),
    secure: Number(SMTP_CONFIG.port) === 465, // true si port 465
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass,
    },
  });

  // 4) Récupérer l’email du payeur (sécuriser un minimum)
  const nameItem = matchedItem?.name;
  const email = payloadData?.payer?.email;
  if (!email) {
    console.error("Aucune adresse e‑mail trouvée dans le payload");
    await transporter.sendMail({
      from: SMTP_CONFIG.fromEmail,
      to: SMTP_CONFIG.supportEmail,
      subject: "[Erreur API HelloAsso] Email manquant dans le payload",
      text: `Aucune adresse e-mail n'a été trouvée dans le payload reçu:\n\n${payoadJson}`
    });
    return res.status(400).json({ message: "Email manquant" });
  }

  // Vérifier si l'option "optionId": 18137239 est présente dans l'item sélectionné
  const optionAccueil = 18137239;
  const hasOptionAccueil = matchedItem?.options?.some(opt => opt.optionId === optionAccueil) || false;
  console.log(`Option accueil : ${hasOptionAccueil ? "OUI" : "NON"}`);
  const nombreRaquettes = (matchedItem?.tierId === tierIdItemUneRaquette) ? 1 :
    (matchedItem?.tierId === tierIdItemDeuxRaquettes) ? 2 : 3; // 3 ou 4 raquettes  

  // 5) Générer un code PIN

  // Récupération du token OAuth2 pour l’API Igloohome
  const accessToken = await getIgloohomeAccessToken();
  async function getIgloohomeAccessToken() {
    const resp = await fetch("https://auth.igloohome.co/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.IGLOO_CLIENT_ID,
        client_secret: process.env.IGLOO_CLIENT_SECRET,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(`OAuth2 failed: ${resp.status} ${JSON.stringify(data)}`);
    }
    return data.access_token;
  }
  console.log("Igloohome access token obtenu");

  // Création du code PIN horaire via l’API Igloohome
  async function SendErrorEmailToPayerAndSupport() {
    const emailErreurReservation = {
      from: SMTP_CONFIG.fromEmail,
      subject: "Erreur sur la réservation de raquettes de padel",
      text: `Bonjour,

        Votre demande de location de raquettes de padel n'a pas pu être traitée car la date de début de location est trop ancienne ou incorrecte.

        Vous pouvez essayer de soumettre une nouvelle demande avec des informations de location avec des date/heure valides. 

        Nous vous rembourserons cette location erronée.

        Sportivement,
        Le club Annecy Tennis`
    };
    emailErreurReservation.to = email;
    await transporter.sendMail(emailErreurReservation);
    emailErreurReservation.to = SMTP_CONFIG.supportEmail;
    emailErreurReservation.text += `

        Détails techniques pour le support :
        ${payoadJson}`;

    await transporter.sendMail(emailErreurReservation);
  }
  async function CalculerDebutPinCode(jourLocation, heureLocation) {
    if (!jourLocation || !heureLocation) {
      SendErrorEmailToPayerAndSupport();
      throw new Error("Missing custom fields Jour/Heure in payload");
    }
    const [day, month, year] = jourLocation.answer.split("/").map(Number);
    const [hour, minute] = heureLocation.answer.split(":").map(Number);
    const timeZone = "Europe/Paris";
    const debutLocation = fromZonedTime(new Date(year, month - 1, day, hour, minute, 0), timeZone);
    const nowParisTZ = fromZonedTime(new Date(), timeZone);
    const diffMinutes = (nowParisTZ.getTime() - debutLocation.getTime()) / (1000 * 60);
    console.log(`nowParisTZ : ${nowParisTZ.toString()}  - debutLocation : ${debutLocation.toString()} = diffMinutes: ${diffMinutes}`);
    if (diffMinutes >= 75) {
      SendErrorEmailToPayerAndSupport();
      throw new Error("Debut de location est dans le passé");
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
        from: SMTP_CONFIG.fromEmail,
        to: SMTP_CONFIG.supportEmail,
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

  const customFields = matchedItem?.customFields || [];
  const jourLocation = customFields.find(f => f.name === "Jour de la location");
  const heureLocation = customFields.find(f => f.name === "Début de la location");
  const debutPinCode = await CalculerDebutPinCode(jourLocation, heureLocation);
  const finPinCode = calculerFinPinCode(debutPinCode);
  const codePin = await createHourlyPin(accessToken, process.env.IGLOO_DEVICE_ID, debutPinCode, finPinCode);
  console.log(`Code PIN généré : ${codePin}`);

  // 6) Configurer le transport SMTP (Nodemailer) et envoyer l'email
  try {
    // Format date and time for email (ex: "20/09/2022 à 07:30")
    const locationDateStr = `${jourLocation.answer} à ${heureLocation.answer}`;

    await transporter.sendMail({
      from: SMTP_CONFIG.fromEmail,
      to: email,
      subject: "Votre code PIN pour la location de raquettes de padel",
      text: `Bonjour,

  Nous avons bien enregistré votre « ${nameItem} ».

  Date et heure de la location : ${locationDateStr}

  Voici votre code PIN associé à votre réservation : ${codePin}.

  Voici les instructions pour utiliser les raquettes de padel :
  1- Allez au local matériel (à côté du panneau des lumières)
  2- Sur le coffret électronique, entrez le code PIN à 9 chiffres : ${codePin}, appuyez sur l'icone de dévérouillage pour valider, tirez sur le cadenas pour l’ouvrir et récupérer la clé du placard à raquettes
  3- Ouvrez le placard avec la clé et prenez la ou les raquettes de padel que vous avez réservées
  4- Remettez la clé dans le coffret et refermez-le
  5- À la fin de votre créneau de location, remettez les raquettes dans le placard et refermez le coffret (avec le même code PIN)

  Nous vous remercions de votre confiance et restons à votre disposition pour toute question.

  À très bientôt sur les pistes !

  Sportivement,

  Le club Annecy Tennis`,
    });
    console.log(`E‑mail envoyé à ${email} (codePin: ${codePin})`);

    if (optionAccueil) {
      console.log("Option accueil demandée, envoi d’un e‑mail à l’accueil");
      await transporter.sendMail({
        from: SMTP_CONFIG.fromEmail,
        to: SMTP_CONFIG.accueilEmail,
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

  } catch (err) {
    console.error("Erreur d’envoi d’e‑mail :", err);
    return res.status(500).json({ error: "Email not sent" });
  }

  // 7) Répondre à HelloAsso
  return res.status(200).json({ sent: true });

  /**
 * Logs detailed information about items.
 * @param {Array} items - Array of items to log.
 */
  function logItems(items) {
    if (Array.isArray(items)) {
      items.forEach((item, idx) => {
        console.log(`\nItem #${idx}:`);
        console.log(util.inspect(item, { depth: null, colors: true }));
      });
    } else {
      console.log("items est absent ou n'est pas un tableau");
    }
  }

}
