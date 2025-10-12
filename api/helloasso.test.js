import handler from './helloasso.js';

describe('helloasso handler', () => {
    // Optionally, mock environment variables here
    beforeEach(() => {
        process.env.ENABLE_CODE_PIN_GENERATION = "1";
        process.env.SMTP_HOST = "smtp.gmail.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "annecypadel74@gmail.com";
        process.env.SMTP_PASS = "xcvsvpszouwvaxtw";
        process.env.IGLOO_DEVICE_ID = "IGK330c7db37";
        process.env.IGLOO_CLIENT_ID = "cqgor3q88x3q78x8polmlhmidr";
        process.env.IGLOO_CLIENT_SECRET = "l01pqmza6dlrx1hlth9yxheil5kbcqh5ouehevj4fxq5sf4sc6j";
        process.env.FROM_EMAIL = "annecypadel74@gmail.com";
        process.env.SUPPORT_EMAIL = "fabien7474@gmail.com";
        process.env.ACCUEIL_EMAIL = "fabien7474@gmail.com";
    });

    it('should respond with sent: true for a valid payload', async () => {
        // Location dans le passé mais encore valide
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
        const timeStr = `${pad(now.getHours())}:00`;

        const req = {
            method: 'POST',
            body: {
                data: {
                    payer: {
                        email: "fabien7474@gmail.com",
                        country: "FRA",
                        firstName: "fa",
                        lastName: "beni"
                    },
                    items: [
                        {
                            name: "Location d'une raquette de padel",
                            tierId: 16987683,
                            state: "Processed",
                            customFields: [
                                { name: "Jour de la location", answer: dateStr },
                                { name: "Début de la location", answer: timeStr }
                            ],
                            options: [
                                {
                                    name: "Je récupère les raquettes à l'accueil",
                                    amount: 0,
                                    priceCategory: "Free",
                                    isRequired: false,
                                    customFields: [],
                                    optionId: 18137239
                                }
                            ],

                        }
                    ],
                    "id": 151244957,
                    "date": "2025-10-01T23:21:42.4950753+02:00",
                    formSlug: "location-de-raquettes-de-padel",
                }
            }
        };

        // Mock res object
        const res = {
            statusCode: null,
            jsonObj: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(obj) {
                this.jsonObj = obj;
                return obj;
            }
        };

        await handler(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.jsonObj).toHaveProperty('sent', true);
    }, 20000);

    it('should reject if location is 2 hours in the past', async () => {
        // Location 2 heures dans le passé (> 75 minutes)
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 2);
        const pad = (n) => n.toString().padStart(2, '0');
        const dateStr = `${pad(pastDate.getDate())}/${pad(pastDate.getMonth() + 1)}/${pastDate.getFullYear()}`;
        const timeStr = `${pad(pastDate.getHours())}:00`;

        const req = {
            method: 'POST',
            body: {
                data: {
                    payer: {
                        email: "fabien7474@gmail.com",
                        country: "FRA",
                        firstName: "fa",
                        lastName: "beni"
                    },
                    items: [
                        {
                            name: "Location d'une raquette de padel",
                            tierId: 16987683,
                            state: "Processed",
                            customFields: [
                                { name: "Jour de la location", answer: dateStr },
                                { name: "Début de la location", answer: timeStr }
                            ],
                        }
                    ],
                    "id": 151244957,
                    formSlug: "location-de-raquettes-de-padel",
                }
            }
        };

        const res = {
            statusCode: null,
            jsonObj: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(obj) {
                this.jsonObj = obj;
                return obj;
            }
        };

        await expect(handler(req, res)).rejects.toThrow("Debut de location est dans le passé");
    }, 20000);
});