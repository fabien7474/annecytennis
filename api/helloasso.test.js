import { jest } from '@jest/globals';
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

  it('should accept if location is 2 hours in the future', async () => {
    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const createdAtISO = new Date(nowDate.getTime() - 2 * 60000).toISOString();
    const locationDate = new Date(nowDate.getTime() + 120 * 60000);
    // Convertit les dates en heure de Paris pour être indépendant du fuseau horaire de la machine exécutant le test
    const parisFormatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const toParisParts = (date) => parisFormatter.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const locationParisParts = toParisParts(locationDate);
    const nowParts = toParisParts(nowDate);
    const locationParisDateStr = `${locationParisParts.day}/${locationParisParts.month}/${locationParisParts.year}`;
    const locationParisTimeStr = `${locationParisParts.hour}:${locationParisParts.minute}`;
    const nowDateStr = `${nowParts.day}/${nowParts.month}/${nowParts.year}`;
    const nowTimeStr = `${nowParts.hour}:${nowParts.minute}`;

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
              payments: [
                {
                  "id": 88015566,
                  "shareAmount": 500
                }
              ],
              name: "Location d'une raquette de padel",
              priceCategory: "Fixed",
              customFields: [
                {
                  "id": 6055810,
                  "name": "Téléphone",
                  "type": "Phone",
                  "answer": "0628227095"
                },
                {
                  "id": 6960318,
                  "name": "Location pour aujourd'hui ?",
                  "type": "YesNo",
                  "answer": "Non"
                },
                {
                  "id": 6055807,
                  "name": "Jour de la location (si pas aujourd'hui)",
                  "type": "Date",
                  "answer": locationParisDateStr
                },
                {
                  "id": 6055791,
                  "name": "Début de la location",
                  "type": "ChoiceList",
                  "answer": locationParisTimeStr
                },
                {
                  "id": 6055809,
                  "name": "Piste réservée",
                  "type": "ChoiceList",
                  "answer": "Padel 2"
                }

              ],
              qrCode: "MTkzNjYyNDQxOjYzOTIyNDM2MzA0NTY4NTE1OA==",
              tierDescription: "",
              tierId: 16987683,
              id: 193662441,
              amount: 500,
              type: "Product",
              initialAmount: 500,
              state: "Processed"
            }
          ],
          "payments": [
            {
              "items": [
                {
                  "id": 193662441,
                  "shareAmount": 500,
                  "shareItemAmount": 500
                }
              ],
              "cashOutState": "Transfered",
              "paymentReceiptUrl": "https://www.helloasso.com/associations/annecy-tennis/boutiques/location-de-raquettes-de-padel/paiement-attestation/186489718",
              "id": 88015566,
              "amount": 500,
              "date": nowISO,
              "paymentMeans": "Card",
              "installmentNumber": 1,
              "state": "Authorized",
              "meta": {
                "createdAt": createdAtISO,
                "updatedAt": nowISO
              },
              "refundOperations": []
            }
          ],
          "amount": {
            "total": 500,
            "vat": 0,
            "discount": 0
          },
          "id": 151244957,
          "date": nowISO,
          "formSlug": "location-de-raquettes-de-padel",
          "formType": "Shop",
          "organizationName": "Annecy Tennis",
          "organizationSlug": "annecy-tennis",
          "organizationType": "Association1901Rig",
          "organizationIsUnderColucheLaw": false,
          "meta": {
            "createdAt": createdAtISO,
            "updatedAt": nowISO
          },
          "isAnonymous": false,
          "isAmountHidden": false
        }
      }
    };

    await handler(req, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.jsonObj).toHaveProperty('sent', true);
  }, 60000);

  it('should accept if location is 15 minutes in the past', async () => {
    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const createdAtISO = new Date(nowDate.getTime() - 2 * 60000).toISOString();
    const locationDate = new Date(nowDate.getTime() - 15 * 60000);
    // Convertit les dates en heure de Paris pour être indépendant du fuseau horaire de la machine exécutant le test
    const parisFormatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const toParisParts = (date) => parisFormatter.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const locationParisParts = toParisParts(locationDate);
    const nowParts = toParisParts(nowDate);
    const locationParisDateStr = `${locationParisParts.day}/${locationParisParts.month}/${locationParisParts.year}`;
    const locationParisTimeStr = `${locationParisParts.hour}:${locationParisParts.minute}`;
    const nowDateStr = `${nowParts.day}/${nowParts.month}/${nowParts.year}`;
    const nowTimeStr = `${nowParts.hour}:${nowParts.minute}`;

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
              payments: [
                {
                  "id": 88015566,
                  "shareAmount": 500
                }
              ],
              name: "Location d'une raquette de padel",
              priceCategory: "Fixed",
              customFields: [
                {
                  "id": 6055810,
                  "name": "Téléphone",
                  "type": "Phone",
                  "answer": "0628227095"
                },
                {
                  "id": 6960318,
                  "name": "Location pour aujourd'hui ?",
                  "type": "YesNo",
                  "answer": "Non"
                },
                {
                  "id": 6055807,
                  "name": "Jour de la location (si pas aujourd'hui)",
                  "type": "Date",
                  "answer": locationParisDateStr
                },
                {
                  "id": 6055791,
                  "name": "Début de la location",
                  "type": "ChoiceList",
                  "answer": locationParisTimeStr
                },
                {
                  "id": 6055809,
                  "name": "Piste réservée",
                  "type": "ChoiceList",
                  "answer": "Padel 2"
                }

              ],
              qrCode: "MTkzNjYyNDQxOjYzOTIyNDM2MzA0NTY4NTE1OA==",
              tierDescription: "",
              tierId: 16987683,
              id: 193662441,
              amount: 500,
              type: "Product",
              initialAmount: 500,
              state: "Processed"
            }
          ],
          "payments": [
            {
              "items": [
                {
                  "id": 193662441,
                  "shareAmount": 500,
                  "shareItemAmount": 500
                }
              ],
              "cashOutState": "Transfered",
              "paymentReceiptUrl": "https://www.helloasso.com/associations/annecy-tennis/boutiques/location-de-raquettes-de-padel/paiement-attestation/186489718",
              "id": 88015566,
              "amount": 500,
              "date": nowISO,
              "paymentMeans": "Card",
              "installmentNumber": 1,
              "state": "Authorized",
              "meta": {
                "createdAt": createdAtISO,
                "updatedAt": nowISO
              },
              "refundOperations": []
            }
          ],
          "amount": {
            "total": 500,
            "vat": 0,
            "discount": 0
          },
          "id": 151244957,
          "date": nowISO,
          "formSlug": "location-de-raquettes-de-padel",
          "formType": "Shop",
          "organizationName": "Annecy Tennis",
          "organizationSlug": "annecy-tennis",
          "organizationType": "Association1901Rig",
          "organizationIsUnderColucheLaw": false,
          "meta": {
            "createdAt": createdAtISO,
            "updatedAt": nowISO
          },
          "isAnonymous": false,
          "isAmountHidden": false
        }
      }
    };

    await handler(req, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.jsonObj).toHaveProperty('sent', true);
  }, 60000);

  it('should accept if location is 1 hour in the past', async () => {
    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const createdAtISO = new Date(nowDate.getTime() - 2 * 60000).toISOString();
    const locationDate = new Date(nowDate.getTime() - 60 * 60000);
    // Convertit les dates en heure de Paris pour être indépendant du fuseau horaire de la machine exécutant le test
    const parisFormatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const toParisParts = (date) => parisFormatter.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const locationParisParts = toParisParts(locationDate);
    const nowParts = toParisParts(nowDate);
    const locationParisDateStr = `${locationParisParts.day}/${locationParisParts.month}/${locationParisParts.year}`;
    const locationParisTimeStr = `${locationParisParts.hour}:${locationParisParts.minute}`;
    const nowDateStr = `${nowParts.day}/${nowParts.month}/${nowParts.year}`;
    const nowTimeStr = `${nowParts.hour}:${nowParts.minute}`;

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
              payments: [
                {
                  "id": 88015566,
                  "shareAmount": 500
                }
              ],
              name: "Location d'une raquette de padel",
              priceCategory: "Fixed",
              customFields: [
                {
                  "id": 6055810,
                  "name": "Téléphone",
                  "type": "Phone",
                  "answer": "0628227095"
                },
                {
                  "id": 6960318,
                  "name": "Location pour aujourd'hui ?",
                  "type": "YesNo",
                  "answer": "Non"
                },
                {
                  "id": 6055807,
                  "name": "Jour de la location (si pas aujourd'hui)",
                  "type": "Date",
                  "answer": locationParisDateStr
                },
                {
                  "id": 6055791,
                  "name": "Début de la location",
                  "type": "ChoiceList",
                  "answer": locationParisTimeStr
                },
                {
                  "id": 6055809,
                  "name": "Piste réservée",
                  "type": "ChoiceList",
                  "answer": "Padel 2"
                }

              ],
              qrCode: "MTkzNjYyNDQxOjYzOTIyNDM2MzA0NTY4NTE1OA==",
              tierDescription: "",
              tierId: 16987683,
              id: 193662441,
              amount: 500,
              type: "Product",
              initialAmount: 500,
              state: "Processed"
            }
          ],
          "payments": [
            {
              "items": [
                {
                  "id": 193662441,
                  "shareAmount": 500,
                  "shareItemAmount": 500
                }
              ],
              "cashOutState": "Transfered",
              "paymentReceiptUrl": "https://www.helloasso.com/associations/annecy-tennis/boutiques/location-de-raquettes-de-padel/paiement-attestation/186489718",
              "id": 88015566,
              "amount": 500,
              "date": nowISO,
              "paymentMeans": "Card",
              "installmentNumber": 1,
              "state": "Authorized",
              "meta": {
                "createdAt": createdAtISO,
                "updatedAt": nowISO
              },
              "refundOperations": []
            }
          ],
          "amount": {
            "total": 500,
            "vat": 0,
            "discount": 0
          },
          "id": 151244957,
          "date": nowISO,
          "formSlug": "location-de-raquettes-de-padel",
          "formType": "Shop",
          "organizationName": "Annecy Tennis",
          "organizationSlug": "annecy-tennis",
          "organizationType": "Association1901Rig",
          "organizationIsUnderColucheLaw": false,
          "meta": {
            "createdAt": createdAtISO,
            "updatedAt": nowISO
          },
          "isAnonymous": false,
          "isAmountHidden": false
        }
      }
    };

    await handler(req, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.jsonObj).toHaveProperty('sent', true);
  }, 60000);

  it('should reject if location is 2 hours in the past', async () => {
    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const createdAtISO = new Date(nowDate.getTime() - 2 * 60000).toISOString();
    const locationDate = new Date(nowDate.getTime() - 120 * 60000);
    // Convertit les dates en heure de Paris pour être indépendant du fuseau horaire de la machine exécutant le test
    const parisFormatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const toParisParts = (date) => parisFormatter.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const locationParisParts = toParisParts(locationDate);
    const nowParts = toParisParts(nowDate);
    const locationParisDateStr = `${locationParisParts.day}/${locationParisParts.month}/${locationParisParts.year}`;
    const locationParisTimeStr = `${locationParisParts.hour}:${locationParisParts.minute}`;
    const nowDateStr = `${nowParts.day}/${nowParts.month}/${nowParts.year}`;
    const nowTimeStr = `${nowParts.hour}:${nowParts.minute}`;

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
              payments: [
                {
                  "id": 88015566,
                  "shareAmount": 500
                }
              ],
              name: "Location d'une raquette de padel",
              priceCategory: "Fixed",
              customFields: [
                {
                  "id": 6055810,
                  "name": "Téléphone",
                  "type": "Phone",
                  "answer": "0628227095"
                },
                {
                  "id": 6960318,
                  "name": "Location pour aujourd'hui ?",
                  "type": "YesNo",
                  "answer": "Non"
                },
                {
                  "id": 6055807,
                  "name": "Jour de la location (si pas aujourd'hui)",
                  "type": "Date",
                  "answer": locationParisDateStr
                },
                {
                  "id": 6055791,
                  "name": "Début de la location",
                  "type": "ChoiceList",
                  "answer": locationParisTimeStr
                },
                {
                  "id": 6055809,
                  "name": "Piste réservée",
                  "type": "ChoiceList",
                  "answer": "Padel 2"
                }

              ],
              qrCode: "MTkzNjYyNDQxOjYzOTIyNDM2MzA0NTY4NTE1OA==",
              tierDescription: "",
              tierId: 16987683,
              id: 193662441,
              amount: 500,
              type: "Product",
              initialAmount: 500,
              state: "Processed"
            }
          ],
          "payments": [
            {
              "items": [
                {
                  "id": 193662441,
                  "shareAmount": 500,
                  "shareItemAmount": 500
                }
              ],
              "cashOutState": "Transfered",
              "paymentReceiptUrl": "https://www.helloasso.com/associations/annecy-tennis/boutiques/location-de-raquettes-de-padel/paiement-attestation/186489718",
              "id": 88015566,
              "amount": 500,
              "date": nowISO,
              "paymentMeans": "Card",
              "installmentNumber": 1,
              "state": "Authorized",
              "meta": {
                "createdAt": createdAtISO,
                "updatedAt": nowISO
              },
              "refundOperations": []
            }
          ],
          "amount": {
            "total": 500,
            "vat": 0,
            "discount": 0
          },
          "id": 151244957,
          "date": nowISO,
          "formSlug": "location-de-raquettes-de-padel",
          "formType": "Shop",
          "organizationName": "Annecy Tennis",
          "organizationSlug": "annecy-tennis",
          "organizationType": "Association1901Rig",
          "organizationIsUnderColucheLaw": false,
          "meta": {
            "createdAt": createdAtISO,
            "updatedAt": nowISO
          },
          "isAnonymous": false,
          "isAmountHidden": false
        }
      }
    };
    await handler(req, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.jsonObj.message).toContain('Debut de location est trop dans le passé');
  }, 60000);

  it('should accept if location is today and 3 hours in the future', async () => {
    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const createdAtISO = new Date(nowDate.getTime() - 2 * 60000).toISOString();
    const locationDate = new Date(nowDate.getTime() + 180 * 60000);
    // Convertit les dates en heure de Paris pour être indépendant du fuseau horaire de la machine exécutant le test
    const parisFormatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const toParisParts = (date) => parisFormatter.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const locationParisParts = toParisParts(locationDate);
    const nowParts = toParisParts(nowDate);
    const locationParisDateStr = `${locationParisParts.day}/${locationParisParts.month}/${locationParisParts.year}`;
    const locationParisTimeStr = `${locationParisParts.hour}:${locationParisParts.minute}`;
    const nowDateStr = `${nowParts.day}/${nowParts.month}/${nowParts.year}`;
    const nowTimeStr = `${nowParts.hour}:${nowParts.minute}`;

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
              payments: [
                {
                  "id": 88015566,
                  "shareAmount": 500
                }
              ],
              name: "Location d'une raquette de padel",
              priceCategory: "Fixed",
              customFields: [
                {
                  "id": 6055810,
                  "name": "Téléphone",
                  "type": "Phone",
                  "answer": "0628227095"
                },
                {
                  "id": 6960318,
                  "name": "Location pour aujourd'hui ?",
                  "type": "YesNo",
                  "answer": "Oui"
                },
                {
                  "id": 6055791,
                  "name": "Début de la location",
                  "type": "ChoiceList",
                  "answer": locationParisTimeStr
                },
                {
                  "id": 6055809,
                  "name": "Piste réservée",
                  "type": "ChoiceList",
                  "answer": "Padel 2"
                }

              ],
              qrCode: "MTkzNjYyNDQxOjYzOTIyNDM2MzA0NTY4NTE1OA==",
              tierDescription: "",
              tierId: 16987683,
              id: 193662441,
              amount: 500,
              type: "Product",
              initialAmount: 500,
              state: "Processed"
            }
          ],
          "payments": [
            {
              "items": [
                {
                  "id": 193662441,
                  "shareAmount": 500,
                  "shareItemAmount": 500
                }
              ],
              "cashOutState": "Transfered",
              "paymentReceiptUrl": "https://www.helloasso.com/associations/annecy-tennis/boutiques/location-de-raquettes-de-padel/paiement-attestation/186489718",
              "id": 88015566,
              "amount": 500,
              "date": nowISO,
              "paymentMeans": "Card",
              "installmentNumber": 1,
              "state": "Authorized",
              "meta": {
                "createdAt": createdAtISO,
                "updatedAt": nowISO
              },
              "refundOperations": []
            }
          ],
          "amount": {
            "total": 500,
            "vat": 0,
            "discount": 0
          },
          "id": 151244957,
          "date": nowISO,
          "formSlug": "location-de-raquettes-de-padel",
          "formType": "Shop",
          "organizationName": "Annecy Tennis",
          "organizationSlug": "annecy-tennis",
          "organizationType": "Association1901Rig",
          "organizationIsUnderColucheLaw": false,
          "meta": {
            "createdAt": createdAtISO,
            "updatedAt": nowISO
          },
          "isAnonymous": false,
          "isAmountHidden": false
        }
      }
    };

    await handler(req, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.jsonObj).toHaveProperty('sent', true);
  }, 60000);

  it('should accept if location is today and 1 minute in the past', async () => {
    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const createdAtISO = new Date(nowDate.getTime() - 2 * 60000).toISOString();
    const locationDate = new Date(nowDate.getTime() - 1 * 60000);
    // Convertit les dates en heure de Paris pour être indépendant du fuseau horaire de la machine exécutant le test
    const parisFormatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const toParisParts = (date) => parisFormatter.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const locationParisParts = toParisParts(locationDate);
    const nowParts = toParisParts(nowDate);
    const locationParisDateStr = `${locationParisParts.day}/${locationParisParts.month}/${locationParisParts.year}`;
    const locationParisTimeStr = `${locationParisParts.hour}:${locationParisParts.minute}`;
    const nowDateStr = `${nowParts.day}/${nowParts.month}/${nowParts.year}`;
    const nowTimeStr = `${nowParts.hour}:${nowParts.minute}`;

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
              payments: [
                {
                  "id": 88015566,
                  "shareAmount": 500
                }
              ],
              name: "Location d'une raquette de padel",
              priceCategory: "Fixed",
              customFields: [
                {
                  "id": 6055810,
                  "name": "Téléphone",
                  "type": "Phone",
                  "answer": "0628227095"
                },
                {
                  "id": 6960318,
                  "name": "Location pour aujourd'hui ?",
                  "type": "YesNo",
                  "answer": "Oui"
                },
                {
                  "id": 6055807,
                  "name": "Jour de la location (si pas aujourd'hui)",
                  "type": "Date",
                  "answer": locationParisDateStr
                },
                {
                  "id": 6055791,
                  "name": "Début de la location",
                  "type": "ChoiceList",
                  "answer": locationParisTimeStr
                },
                {
                  "id": 6055809,
                  "name": "Piste réservée",
                  "type": "ChoiceList",
                  "answer": "Padel 2"
                }

              ],
              qrCode: "MTkzNjYyNDQxOjYzOTIyNDM2MzA0NTY4NTE1OA==",
              tierDescription: "",
              tierId: 16987683,
              id: 193662441,
              amount: 500,
              type: "Product",
              initialAmount: 500,
              state: "Processed"
            }
          ],
          "payments": [
            {
              "items": [
                {
                  "id": 193662441,
                  "shareAmount": 500,
                  "shareItemAmount": 500
                }
              ],
              "cashOutState": "Transfered",
              "paymentReceiptUrl": "https://www.helloasso.com/associations/annecy-tennis/boutiques/location-de-raquettes-de-padel/paiement-attestation/186489718",
              "id": 88015566,
              "amount": 500,
              "date": nowISO,
              "paymentMeans": "Card",
              "installmentNumber": 1,
              "state": "Authorized",
              "meta": {
                "createdAt": createdAtISO,
                "updatedAt": nowISO
              },
              "refundOperations": []
            }
          ],
          "amount": {
            "total": 500,
            "vat": 0,
            "discount": 0
          },
          "id": 151244957,
          "date": nowISO,
          "formSlug": "location-de-raquettes-de-padel",
          "formType": "Shop",
          "organizationName": "Annecy Tennis",
          "organizationSlug": "annecy-tennis",
          "organizationType": "Association1901Rig",
          "organizationIsUnderColucheLaw": false,
          "meta": {
            "createdAt": createdAtISO,
            "updatedAt": nowISO
          },
          "isAnonymous": false,
          "isAmountHidden": false
        }
      }
    };

    await handler(req, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.jsonObj).toHaveProperty('sent', true);
  }, 60000);

  it('should return 200 and ignored true with "API désactivée" when ENABLE_CODE_PIN_GENERATION is not "1"', async () => {
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
    expect(mockRes.jsonObj).toHaveProperty('ok', true);
    expect(mockRes.jsonObj).toHaveProperty('ignored', true);
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
    expect(mockRes.jsonObj).toHaveProperty('ok', true);
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
    expect(mockRes.jsonObj).toHaveProperty('ok', true);
    expect(mockRes.jsonObj).toHaveProperty('ignored', true);
    expect(mockRes.jsonObj).toHaveProperty('errorCode', "ITEM_NOT_FOUND");
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
    expect(mockRes.jsonObj).toHaveProperty('ok', true);
    expect(mockRes.jsonObj).toHaveProperty('ignored', true);
    expect(mockRes.jsonObj).toHaveProperty('errorCode', "PAYER_EMAIL_MISSING");
    expect(mockRes.jsonObj).toHaveProperty('message');
    expect(mockRes.jsonObj.message).toContain('Email manquant');
  }, 60000);

  it('should return 200 and message for non-POST methods', async () => {
    const req = {
      method: 'GET',
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
    expect(mockRes.jsonObj).toHaveProperty('ok', true);
    expect(mockRes.jsonObj).toHaveProperty('ignored', true);
    expect(mockRes.jsonObj).toHaveProperty('errorCode', "HTTP_METHOD_NOT_ALLOWED");
    expect(mockRes.jsonObj).toHaveProperty('message');
    expect(mockRes.jsonObj.message).toMatch(/Méthode GET non autorisée/);
  }, 60000);

  it('should return 200 and error on unexpected exception if not well configured', async () => {
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
    expect(mockRes.statusCode).toBe(500);
    expect(mockRes.jsonObj).toHaveProperty('ok', false);
    expect(mockRes.jsonObj).toHaveProperty('ignored', true);
    expect(mockRes.jsonObj).toHaveProperty('errorCode', "INTERNAL_SERVER_ERROR");
    expect(mockRes.jsonObj).toHaveProperty('message', 'Internal Server Error');

    process.env.SMTP_HOST = oldHost;
  }, 60000);

  // write a test that makes the create hourly pin fail and test that create one time pin succeeds
  it('should return 200 on create hourly pin failure but succeed on create one time pin', async () => {
    const createHourlyPin = jest.fn(() => {
      throw new Error('Hourly pin creation failed');
    });

    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const createdAtISO = new Date(nowDate.getTime() - 2 * 60000).toISOString();
    const locationDate = new Date(nowDate.getTime() + 120 * 60000);
    // Convertit les dates en heure de Paris pour être indépendant du fuseau horaire de la machine exécutant le test
    const parisFormatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const toParisParts = (date) => parisFormatter.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const locationParisParts = toParisParts(locationDate);
    const nowParts = toParisParts(nowDate);
    const locationParisDateStr = `${locationParisParts.day}/${locationParisParts.month}/${locationParisParts.year}`;
    const locationParisTimeStr = `${locationParisParts.hour}:${locationParisParts.minute}`;
    const nowDateStr = `${nowParts.day}/${nowParts.month}/${nowParts.year}`;
    const nowTimeStr = `${nowParts.hour}:${nowParts.minute}`;

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
              payments: [
                {
                  "id": 88015566,
                  "shareAmount": 500
                }
              ],
              name: "Location d'une raquette de padel",
              priceCategory: "Fixed",
              customFields: [
                {
                  "id": 6055810,
                  "name": "Téléphone",
                  "type": "Phone",
                  "answer": "0628227095"
                },
                {
                  "id": 6960318,
                  "name": "Location pour aujourd'hui ?",
                  "type": "YesNo",
                  "answer": "Non"
                },
                {
                  "id": 6055807,
                  "name": "Jour de la location (si pas aujourd'hui)",
                  "type": "Date",
                  "answer": locationParisDateStr
                },
                {
                  "id": 6055791,
                  "name": "Début de la location",
                  "type": "ChoiceList",
                  "answer": locationParisTimeStr
                },
                {
                  "id": 6055809,
                  "name": "Piste réservée",
                  "type": "ChoiceList",
                  "answer": "Padel 2"
                }

              ],
              qrCode: "MTkzNjYyNDQxOjYzOTIyNDM2MzA0NTY4NTE1OA==",
              tierDescription: "",
              tierId: 16987683,
              id: 193662441,
              amount: 500,
              type: "Product",
              initialAmount: 500,
              state: "Processed"
            }
          ],
          "payments": [
            {
              "items": [
                {
                  "id": 193662441,
                  "shareAmount": 500,
                  "shareItemAmount": 500
                }
              ],
              "cashOutState": "Transfered",
              "paymentReceiptUrl": "https://www.helloasso.com/associations/annecy-tennis/boutiques/location-de-raquettes-de-padel/paiement-attestation/186489718",
              "id": 88015566,
              "amount": 500,
              "date": nowISO,
              "paymentMeans": "Card",
              "installmentNumber": 1,
              "state": "Authorized",
              "meta": {
                "createdAt": createdAtISO,
                "updatedAt": nowISO
              },
              "refundOperations": []
            }
          ],
          "amount": {
            "total": 500,
            "vat": 0,
            "discount": 0
          },
          "id": 151244957,
          "date": nowISO,
          "formSlug": "location-de-raquettes-de-padel",
          "formType": "Shop",
          "organizationName": "Annecy Tennis",
          "organizationSlug": "annecy-tennis",
          "organizationType": "Association1901Rig",
          "organizationIsUnderColucheLaw": false,
          "meta": {
            "createdAt": createdAtISO,
            "updatedAt": nowISO
          },
          "isAnonymous": false,
          "isAmountHidden": false
        }
      }
    };

    await handler(req, mockRes, { createHourlyPin });
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.jsonObj).toHaveProperty('sent', true);
    expect(createHourlyPin).toHaveBeenCalledTimes(1);
  }, 60000);

});