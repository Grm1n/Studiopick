const express = require('express');
const sgMail = require('@sendgrid/mail');
const stripe = require('stripe')('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');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors({ methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.options('*', cors());
app.use(bodyParser.json());
app.use(express.json());

//Create Connected ID
app.post('/create_connected_account', async (req, res) => {
  const { code } = req.body;

  try {
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    let last4 = '';

    // Retrieve bank accounts for the connected account
    const bankAccounts = await stripe.accounts.listExternalAccounts(
      response.stripe_user_id,
      { object: 'bank_account' }
    );

    // Retrieve cards for the connected account
    const cards = await stripe.accounts.listExternalAccounts(
      response.stripe_user_id,
      { object: 'card' }
    );

    // Get the last 4 digits of the first external account (assuming it's a bank account or card)
    if (bankAccounts.data.length > 0) {
      last4 = bankAccounts.data[0]?.last4 || '';
    } else if (cards.data.length > 0) {
      last4 = cards.data[0]?.last4 || '';
    }

    res.status(200).json({
      success: true,
      account: response.stripe_user_id,
      last4: last4
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// Create transfer
app.post('/create_transfer', async (req, res) => {
  try {
    const { amount, destination } = req.body;

    // Create a transfer to the connected account
    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: 'usd',
      destination: destination, // Use the connectedAccountId
    });

    res.status(200).json({ success: true, payout: transfer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});



//Process stripe refund
app.post('/refund', async (req, res) => {
  const { chargeId } = req.body;

  try {
    const refund = await stripe.refunds.create({ charge: chargeId });
    res.json({ success: true, refund });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send Studio Welcome Email
sgMail.setApiKey('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');

app.post('/send-swelcome', async (req, res) => {
  const {
    to,
    studioName,
  } = req.body;

  const msg = {
    to,
    from: 'confirm@studiopick.us',
    templateId: 'd-18a1c08a04364d2e8f6a4a40fd992c90',
    dynamic_template_data: {
      name: studioName, // pass studioName to the template
    },
  };

  try {
    await sgMail.send(msg);
    res.status(200).send('Email sent');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending email');
  }
});

// Send Artist Welcome Email
sgMail.setApiKey('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');

app.post('/send-awelcome', async (req, res) => {
  const {
    to,
    artistName,
  } = req.body;

  const msg = {
    to,
    from: 'confirm@studiopick.us',
    templateId: 'd-18a1c08a04364d2e8f6a4a40fd992c90',
    dynamic_template_data: {
      name: artistName, // pass studioName to the template
    },
  };

  try {
    await sgMail.send(msg);
    res.status(200).send('Email sent');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending email');
  }
});


// Send Confirm Email
sgMail.setApiKey('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');

app.post('/send-email', async (req, res) => {
  const {
    to,
    studioName,
    stuAddress,
    selectedDate,
    startTime,
    sessionType,
    roomName,
  } = req.body;

  // Get latitude and longitude of the studio address
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(stuAddress)}&key=AIzaSyBdpdzNdY9iXLvzgXeauKmQTZYcVfbmQKI`;
  const geocodeRes = await fetch(geocodeUrl);
  const geocodeData = await geocodeRes.json();
  const latLng = geocodeData.results[0].geometry.location;

  // Construct the map URL
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latLng.lat},${latLng.lng}&zoom=14&size=400x300&markers=color:red%7C${latLng.lat},${latLng.lng}&key=AIzaSyBdpdzNdY9iXLvzgXeauKmQTZYcVfbmQKI`;

  const msg = {
    to,
    from: 'confirm@studiopick.us',
    templateId: 'd-19f2134c1e4f4e93b8ade43107084d28',
    dynamic_template_data: {
      subject: `Session Confirmed With ${studioName}!`, // add studioName here
      date: selectedDate,
      name: studioName, // pass studioName to the template
      time: startTime,
      service: sessionType,
      room: roomName,
      address: stuAddress,
      mapUrl: mapUrl, // add the map URL to the dynamic data
    },
  };

  try {
    await sgMail.send(msg);
    res.status(200).send('Email sent');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending email');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

