import handler from './helloasso.js';

describe('helloasso handler', () => {
    it('should respond with sent: true for a valid payload', async () => {
        // Mock payload similar to your local example
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

        const req = {
            method: 'POST',
            body: {
            data: {
                payer: { email: "fabien7474@gmail.com" },
                items: [
                {
                    name: "Location d'une raquette de padel",
                    tierId: 16987683,
                    state: "Processed",
                    customFields: [
                    { name: "Jour de la location", answer: dateStr },
                    { name: "Début de la location", answer: timeStr }
                    ]
                }
                ]
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

        // Optionally, mock environment variables here
        process.env.ENABLE_CODE_PIN_GENERATION = "1";
        process.env.SMTP_HOST = "smtp.gmail.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "annecypadel74@gmail.com";
        process.env.SMTP_PASS = "xcvsvpszouwvaxtw";
        process.env.FROM_EMAIL = "noreply@example.com";
        process.env.IGLOO_DEVICE_ID = "IGK330c7db37";
        process.env.IGLOO_CLIENT_ID = "cqgor3q88x3q78x8polmlhmidr";
        process.env.IGLOO_CLIENT_SECRET = "l01pqmza6dlrx1hlth9yxheil5kbcqh5ouehevj4fxq5sf4sc6j";
        process.env.FROM_EMAIL = "annecypadel74@gmail.com";

        console.log('Handler started');
        await handler(req, res);
        console.log('Handler about to return:', { statusCode: res.statusCode, responseObj: res.jsonObj });

        expect(res.statusCode).toBe(200);
        expect(res.jsonObj).toHaveProperty('sent', true);
    }, 20000);
});