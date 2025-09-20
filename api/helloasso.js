/**
 * Dépendances :
 *   npm install nodemailer
 *
 * Variables d’environnement à définir dans Vercel :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  ➜ paramètres SMTP de ton fournisseur
 *   FROM_EMAIL                                ➜ adresse « expéditeur » (ex. noreply@annecy-tennis.fr)
 */

import nodemailer from "nodemailer";
import { logItems, detectItem } from "./utils.js";
import { SMTP_CONFIG } from './smtpConfig.js';

export default async function handler(req, res) {

  // 1) Refuser tout sauf POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  // 2) Payload JSON déjà parsé par Vercel
  const payload = req.body;
  logItems(payload?.data?.items);

  // 3) Detect specific items
  const nomDeCampagne = "Location de raquettes de padel";
  const match = detectItem(payload?.data?.items, nomDeCampagne);
  logMatchAndPayload();
  if (!match) {
    return res.status(200).json({ ignored: true });
  }

  // 4) Récupérer l’email du payeur (sécuriser un minimum)
  const email = payload?.data?.payer?.email;
  if (!email) {
    console.error("Aucune adresse e‑mail trouvée dans le payload");
    return res.status(400).json({ message: "Email manquant" });
  }

  // 5) Générer un code aléatoire à 4 chiffres (1000‑9999)
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

Nous avons bien enregistré votre « ${nomDeCampagne} ».

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

  function logMatchAndPayload() {
    console.log(`match = ${match}; campagneName = ${nomDeCampagne};`);
    const payoadJson = JSON.stringify(payload, null, 2);
    if (!match) {
      // Rien à faire : on répond 200 pour ne pas que HelloAsso retente
      console.log("Notification non traitée :", payoadJson);
    } else {
      console.log("Notification à traiter :", payoadJson);
    }
  }
}
