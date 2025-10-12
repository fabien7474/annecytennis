import handler from './helloasso.js';

describe('helloasso handler', () => {

    // Shared variables accessible to all tests
    let mockRes;

    // Helper function to create a standard response mock
    const createMockResponse = () => ({
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
    });

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
        process.env.LOGFLARE_API_KEY = "KIlcuqX-6Agi";
        process.env.LOGFLARE_SOURCE = "d55db3ef-26e0-4e89-a7d8-1dc276575d31";

        // Reset shared variables before each test
        mockRes = createMockResponse();
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

        await handler(req, mockRes);
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes.jsonObj).toHaveProperty('sent', true);
    }, 60000);

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

        await handler(req, mockRes);
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes.jsonObj.message).toMatch(/Erreur lors de la génération du code PIN/);
    }, 60000);

    it('should return 200 with "API désactivée" when ENABLE_CODE_PIN_GENERATION is not "1"', async () => {
        process.env.ENABLE_CODE_PIN_GENERATION = "0";
        const req = {
            method: 'POST',
            body: {
                data: {
                    formSlug: "location-de-raquettes-de-padel",
                    payer: { email: "test@example.com" },
                    items: []
                }
            }
        };
        await handler(req, mockRes);
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes.jsonObj).toHaveProperty('message', 'API désactivée');
    }, 60000);

    it('should return 200 and ignored:true if formSlug is not "location-de-raquettes-de-padel"', async () => {
      const req = {
        method: 'POST',
        body: {
          data: {
            formSlug: "autre-formulaire",
            payer: { email: "test@example.com" },
            items: []
          }
        }
      };
      await handler(req, mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonObj).toHaveProperty('ignored', true);
    }, 60000);

    it('should return 200 and ignored:true if no matching item is found', async () => {
      const req = {
        method: 'POST',
        body: {
          data: {
            formSlug: "location-de-raquettes-de-padel",
            payer: { email: "test@example.com" },
            items: [
              {
                name: "Autre produit",
                tierId: 123456,
                state: "Processed"
              }
            ]
          }
        }
      };
      await handler(req, mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonObj).toHaveProperty('ignored', true);
    }, 60000);

    it('should return 200 and message "Email manquant" if payer email is missing', async () => {
      const req = {
        method: 'POST',
        body: {
          data: {
            formSlug: "location-de-raquettes-de-padel",
            payer: {},
            items: [
              {
                name: "Location d'une raquette de padel",
                tierId: 16987683,
                state: "Processed",
                customFields: [
                  { name: "Jour de la location", answer: "01/01/2025" },
                  { name: "Début de la location", answer: "10:00" }
                ]
              }
            ]
          }
        }
      };
      await handler(req, mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonObj).toHaveProperty('message', 'Email manquant');
    }, 60000);

    it('should return 200 and message for non-POST methods', async () => {
      const req = {
        method: 'GET',
        body: {}
      };
      await handler(req, mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonObj).toHaveProperty('message');
      expect(mockRes.jsonObj.message).toMatch(/Méthode GET non autorisée/);
    }, 60000);

    it('should return 200 and error on unexpected exception', async () => {
      // Simulate error by deleting process.env.SMTP_HOST
      const oldHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      const req = {
        method: 'POST',
        body: {
          data: {
            formSlug: "location-de-raquettes-de-padel",
            payer: { email: "test@example.com" },
            items: [
              {
                name: "Location d'une raquette de padel",
                tierId: 16987683,
                state: "Processed",
                customFields: [
                  { name: "Jour de la location", answer: "01/01/2025" },
                  { name: "Début de la location", answer: "10:00" }
                ]
              }
            ]
          }
        }
      };

      await handler(req, mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonObj).toHaveProperty('error', 'Internal Server Error');

      process.env.SMTP_HOST = oldHost;
    }, 60000);
});