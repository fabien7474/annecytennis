export default async function handler(req, res) {
    const payload = req.body;
    const payoadJson = JSON.stringify(payload, null, 2);
    console.log("Notification reçue de HelloAsso :", payoadJson);
  
    // Ex: envoyer un email, enregistrer dans un Google Sheet, etc.
  
    res.status(200).json({ received: true });
  }
  