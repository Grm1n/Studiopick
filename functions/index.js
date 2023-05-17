const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

exports.createStripeCheckout = functions.https.onCall(async (data, context) => {
  console.log('Inside createStripeCheckout, data -> : ', data)
  numberInput = data.servicePrice;
  duration = data.hours;
  serviceType = data.serviceType;
  studioName = data.studioName;

  // Get connectedAccountId
  const firestore = admin.firestore();
  const studioRef = firestore.collection("/studiopick/studios/users").doc(data.studioId);
  const studioDoc = await studioRef.get();
  const connectedAccountId = studioDoc.data().connectedAccountId;

  // Stripe init
  const stripe = require('stripe')(functions.config().stripe.secret_key);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: "http://studiopick.us/artistdash.html?purchase_status=success",
    cancel_url: `http://studiopick.us/studiopage.html?studioId=${data.studioId}&purchase_status=failed`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: (numberInput * duration) * 100, // 10000 = 100 USD
          product_data: {
            name: serviceType,
          },
        },
      },
    ],
    application_fee_amount: Math.round((numberInput * duration) * 100 * 0.15), // Set the fee to 15%
    transfer_data: {
      destination: connectedAccountId,
    },



    metadata: {
      artistId: data.artistId,
      artistEmail: data.artistEmail,
      studioId: data.studioId,
      roomName: data.roomName,
      artistName: data.artistName,
      studioName: data.studioName,
      serviceId: data.serviceId,
      sessionPrice: numberInput * duration,
      sessionType: data.serviceType,
      selectedDate: data.selectedDate,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.hours
    }
  });

  return {
    id: session.id,
  };
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripe = require('stripe')(functions.config().stripe.secret_key);

  let event;

  try {
    const whSec = functions.config().stripe.payments_webhook_secret;



    event = stripe.webhooks.constructEvent(
      req.rawBody,
      req.headers["stripe-signature"],
      whSec,
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.");
    return res.sendStatus(400);
  }

  const dataObject = event.data.object;
  functions.logger.log(dataObject);

  // Retrieve the Checkout Session
  const checkoutSession = await stripe.checkout.sessions.retrieve(dataObject.id);

  // Get the Payment Intent ID from the Checkout Session
  const paymentIntentId = checkoutSession.payment_intent;

  // Retrieve the Payment Intent
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // Get the Charge ID from the Payment Intent
  const chargeId = paymentIntent.charges.data[0].id;

  // Add the chargeId to the metadata object
  dataObject.metadata.chargeId = chargeId;



  await admin.firestore().collection("/studiopick/studios/sessions").doc().set({
    serviceId: dataObject.metadata.serviceId,
    studioId: dataObject.metadata.studioId,
    artistId: dataObject.metadata.artistId,
    artistEmail: dataObject.metadata.artistEmail,
    sessionPrice: dataObject.metadata.sessionPrice,
    sessionType: dataObject.metadata.sessionType,
    studioName: dataObject.metadata.studioName,
    artistName: dataObject.metadata.artistName,
    roomName: dataObject.metadata.roomName,
    selectedDate: dataObject.metadata.selectedDate,
    startTime: dataObject.metadata.startTime,
    endTime: dataObject.metadata.endTime,
    duration: dataObject.metadata.duration,
    accepted: false,
    status: 'pending',
    chargeId: chargeId,
    created: Date.now(),
    updated: Date.now(),

  })

  await admin.firestore().collection("/studiopick/artists/sessions").doc().set({
    serviceId: dataObject.metadata.serviceId,
    studioId: dataObject.metadata.studioId,
    artistId: dataObject.metadata.artistId,
    artistEmail: dataObject.metadata.artistEmail,
    sessionPrice: dataObject.metadata.sessionPrice,
    sessionType: dataObject.metadata.sessionType,
    studioName: dataObject.metadata.studioName,
    artistName: dataObject.metadata.artistName,
    roomName: dataObject.metadata.roomName,
    selectedDate: dataObject.metadata.selectedDate,
    startTime: dataObject.metadata.startTime,
    endTime: dataObject.metadata.endTime,
    duration: dataObject.metadata.duration,
    accepted: false,
    status: 'pending',
    chargeId: chargeId,
    created: Date.now(),
    updated: Date.now(),

  })



  return res.sendStatus(200);
});
