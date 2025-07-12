export default async function handler(req, res) {
    const payload = req.body;
    console.log("Notification reçue de HelloAsso :", payload);
  
    // Ex: envoyer un email, enregistrer dans un Google Sheet, etc.
  
    res.status(200).json({ received: true });
  }
  