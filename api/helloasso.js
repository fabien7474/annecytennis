/**
 * Dépendances :
 *   npm install nodemailer
 *
 * Variables d’environnement à définir dans Vercel :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  ➜ paramètres SMTP de ton fournisseur
 *   FROM_EMAIL                                ➜ adresse « expéditeur » (ex. noreply@annecy-tennis.fr)
 */

import nodemailer from "nodemailer";
import { SMTP_CONFIG } from './smtpConfig.js';
import util from "util";
import { parse } from "date-fns";
import fetch from "node-fetch";

export default async function handler(req, res) {

  // 1) Refuser tout sauf POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  // 2) Payload JSON déjà parsé par Vercel
  const payload = req.body;
  logItems(payload?.data?.items);

  // 3) Extract item "Location d'une raquette de padel"
  const nameItem = "Location d'une raquette de padel";
  const tierIdItem = 16987683;
  const stateItem = "Processed";
  const matchedItem = payload?.data?.items?.find((item) =>
    item?.name?.trim() === nameItem &&
    item?.tierId === tierIdItem &&
    item?.state === stateItem
  );
  const match = Boolean(matchedItem);

  // Logging pour debug
  console.log(`match = ${match}; campagneName = ${nameItem};`);
  const payoadJson = JSON.stringify(payload, null, 2);
  if (!match) {
    console.log("Notification non traitée :", payoadJson);
  } else {
    console.log("Notification à traiter :", payoadJson);
  }

  if (!match) {
    return res.status(200).json({ ignored: true });
  }

  // 4) Récupérer l’email du payeur (sécuriser un minimum)
  const email = payload?.data?.payer?.email;
  if (!email) {
    console.error("Aucune adresse e‑mail trouvée dans le payload");
    return res.status(400).json({ message: "Email manquant" });
  }

  // 4b) Récupérer la date et heure de la location
  const customFields = matchedItem?.customFields || [];
  const dayField = customFields.find(f => f.name === "Jour de la location");
  const timeField = customFields.find(f => f.name === "Début de la location");

  if (!dayField || !timeField) {
    throw new Error("Missing custom fields Jour/Heure in payload");
  }

  // Example formats: "20/09/2022" and "07:30"
  const dateStr = `${dayField.answer} ${timeField.answer}`;
  const startDate = parse(dateStr, "dd/MM/yyyy HH:mm", new Date());


  // 5) Générer un code
  const token = await getIgloohomeToken();

  async function getIgloohomeToken() {
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

  const code = Math.floor(1000 + Math.random() * 9000).toString();



  // 6) Configurer le transport SMTP (Nodemailer) et envoyer l'email
  const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: Number(SMTP_CONFIG.port || 587),
    secure: Number(SMTP_CONFIG.port) === 465, // true si port 465
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Votre code pour la location de raquettes de padel",
      text: `Bonjour,

Nous avons bien enregistré votre « ${nameItem} ».

Voici votre code personnel : ${code}.

Ce code unique vous permet d'ouvrir le cadenas électronique pour récupérer la clé des raquettes de location.

À très bientôt sur les pistes !
Le club Annecy Tennis`,
    });

    console.log(`E‑mail envoyé à ${email} (code : ${code})`);

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
