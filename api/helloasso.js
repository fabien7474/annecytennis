/**
 * Dépendances :
 *   npm install nodemailer
 *
 * Variables d’environnement à définir dans Vercel :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  ➜ paramètres SMTP de ton fournisseur
 *   FROM_EMAIL                                ➜ adresse « expéditeur » (ex. noreply@annecy-tennis.fr)
 */

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // 1) Refuser tout sauf POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  /** 2) Payload JSON déjà parsé par Vercel (sinon : JSON.parse(req.body) ) */
  const payload = req.body;

  const campagneName = "Location d'une raquette de padel";

  /** 3) Détecter les items "Location d'une raquette de padel" */
  const match = payload?.data?.items?.some(
    (item) =>
      item?.name === campagneName &&
      item?.state === "Processed" &&
      Number(item?.tierId) === 16987683
  );

  const payoadJson = JSON.stringify(payload, null, 2);

  if (!match) {
    // Rien à faire : on répond 200 pour ne pas que HelloAsso retente
    console.log("Notification non traitée :", payoadJson);
    return res.status(200).json({ ignored: true });
  }

  console.log("Notification à traiter :", payoadJson);

  /** 4) Récupérer l’email du payeur (sécuriser un minimum) */
  const email = payload?.data?.payer?.email;
  if (!email) {
    console.error("Aucune adresse e‑mail trouvée dans le payload");
    return res.status(400).json({ message: "Email manquant" });
  }

  /** 5) Générer un code aléatoire à 4 chiffres (1000‑9999) */
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  /** 6) Configurer le transport SMTP (Nodemailer) */
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // true si port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  /** 7) Envoyer l’e‑mail */
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Votre code pour Annecy Tennis",
      text: `Bonjour,

Nous avons bien enregistré votre « ${campagneName} ».

Voici votre code personnel : ${code}

À très bientôt sur les pistes !
Le club Annecy Tennis`,
    });

    console.log(`E‑mail envoyé à ${email} (code : ${code})`);
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error("Erreur d’envoi d’e‑mail :", err);
    return res.status(500).json({ error: "Email not sent" });
  }
}
