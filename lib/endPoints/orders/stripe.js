//
// # Stripe Payment Adapter
//
(exports = module.exports = function(house, options){
    
    var paymentProcessor; // proxy class that interfaces basic payment functions
    if(house.config.stripe && house.config.stripe) {
        var testMode = true;
        if(house.config.stripe.hasOwnProperty('liveMode')) {
            testMode = (!house.config.stripe.liveMode);
        }
        if(testMode && house.config.stripe.testSecretKey && house.config.stripe.testPublicKey) {
            paymentProcessor = {
                stripe: {
                    publicKey: house.config.stripe.testPublicKey,
                    privateKey: house.config.stripe.testSecretKey,
                }
            }
        } else if(house.config.stripe.liveSecretKey && house.config.stripe.livePublicKey) {
            paymentProcessor = {
                stripe: {
                    publicKey: house.config.stripe.livePublicKey,
                    privateKey: house.config.stripe.liveSecretKey,
                }
            }
        }
        
        var stripe = require("stripe")(paymentProcessor.stripe.privateKey);
        
        paymentProcessor.charges = {
            create: function(amount, currency, customer, card, desc, callback) {
                stripe.charges.create({
                  amount: amount, // in cents
                  currency: currency, // "usd"
                  customer: customer,
                  card: card, // obtained with Stripe.js
                  description: desc
                }, callback);
            },
            find: function(chargeId, callback) {
                stripe.charges.retrieve(
                  chargeId,
                  callback
                );
            },
            update: function(chargeId, callback) {
                stripe.charges.update(
                  chargeId,
                  {
                    description: "Charge for test@example.com"
                  },
                  callback
                );
            },
            refund: function(chargeId, callback) {
                stripe.charges.refund(
                    chargeId,
                    callback
                );
            },
            capture: function(chargeId, callback) {
                stripe.charges.capture(chargeId, callback);
            },
            list: function(options, callback) {
                options = options || { limit: 3 };
                stripe.charges.list(options, callback);
            },
        };
        paymentProcessor.customers = {
            create: function(desc, card, callback) {
                stripe.customers.create({
                  description: desc,
                  card: card
                  }, callback);
                /*{
                  "object": "customer",
                  "created": 1400290810,
                  "id": "cus_432tmX0R8v3E7I",
                  "livemode": false,
                  "description": null,
                  "email": null,
                  "delinquent": false,
                  "metadata": {
                  },
                  "subscriptions": {
                    "object": "list",
                    "total_count": 0,
                    "has_more": false,
                    "url": "/v1/customers/cus_432tmX0R8v3E7I/subscriptions",
                    "data": [
                
                    ]
                  },
                  "discount": null,
                  "account_balance": 0,
                  "currency": "usd",
                  "cards": {
                    "object": "list",
                    "total_count": 0,
                    "has_more": false,
                    "url": "/v1/customers/cus_432tmX0R8v3E7I/cards",
                    "data": [
                
                    ]
                  },
                  "default_card": null
                }*/
            },
            find: function(customerId, callback) {
                stripe.customers.retrieve(customerId, callback);
            },
            /*{
              "object": "customer",
              "created": 1400290810,
              "id": "cus_432tmX0R8v3E7I",
              "livemode": false,
              "description": null,
              "email": null,
              "delinquent": false,
              "metadata": {
              },
              "subscriptions": {
                "object": "list",
                "total_count": 0,
                "has_more": false,
                "url": "/v1/customers/cus_432tmX0R8v3E7I/subscriptions",
                "data": [
            
                ]
              },
              "discount": null,
              "account_balance": 0,
              "currency": "usd",
              "cards": {
                "object": "list",
                "total_count": 0,
                "has_more": false,
                "url": "/v1/customers/cus_432tmX0R8v3E7I/cards",
                "data": [
            
                ]
              },
              "default_card": null
            }*/
            update: function(customerId, updateDoc, callback) {
                stripe.customers.update(customerId, updateDoc, callback);
            },
            remove: function(customerId, callback) {
                stripe.customers.del(
                  customerId,
                  callback
                );
                /*{
                  "deleted": true,
                  "id": "cus_432tmX0R8v3E7I"
                }*/
            },
            list: function(options, callback) {
                options = options || {limit: 50};
                stripe.customers.list(options, callback);
            },
            /*{
              "object": "list",
              "url": "v1/customers",
              "has_more": false,
              "data": [
                {
                  "object": "customer",
                  "created": 1400290810,
                  "id": "cus_432tmX0R8v3E7I",
                  "livemode": false,
                  "description": null,
                  "email": null,
                  "delinquent": false,
                  "metadata": {
                  },
                  "subscriptions": {
                    "object": "list",
                    "total_count": 0,
                    "has_more": false,
                    "url": "/v1/customers/cus_432tmX0R8v3E7I/subscriptions",
                    "data": [
                
                    ]
                  },
                  "discount": null,
                  "account_balance": 0,
                  "currency": "usd",
                  "cards": {
                    "object": "list",
                    "total_count": 0,
                    "has_more": false,
                    "url": "/v1/customers/cus_432tmX0R8v3E7I/cards",
                    "data": [
                
                    ]
                  },
                  "default_card": null
                },
                {...},
                {...}
              ]
            }*/
            
        };
        paymentProcessor.cards = {
            create: function(customerId, cardId, callback) {
                stripe.customers.createCard(
                  customerId,
                  {card: cardId},
                  callback
                );
            },
            find: function(customerId, cardId, callback) {
                stripe.customers.retrieveCard(
                  customerId,
                  cardId,
                  callback
                );
            },
            update: function(customerId, cardId, callback) {
                stripe.customers.updateCard(
                  customerId,
                  cardId,
                  { name: "Jane Austen" },
                  callback
                );
            },
            remove: function(customerId, cardId, callback) {
                stripe.customers.deleteCard(
                  customerId,
                  cardId,
                  callback
                );
            },
            list: function(cardId, callback) {
                stripe.customers.listCards(cardId, callback);
            },
        };
        
    }
    
    return paymentProcessor;
});
