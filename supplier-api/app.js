// app.js
const express = require('express');
const app = express();
const port = 3000; 

// add API Key
const EXPECTED_API_KEY = process.env.API_KEY || 'no-key-configured';

const apiKeyAuth = (req, res, next) => {
  const userApiKey = req.get('x-api-key'); // from request header read 'x-api-key'

  if (userApiKey && userApiKey === EXPECTED_API_KEY) {
    next(); // Key ok
  } else {
    // key error, return 401
    res.status(401).json({ error: 'Unauthorized. Invalid or missing API Key.' });
  }
};

app.use(express.json()); 

app.post('/order', apiKeyAuth, (req, res) => { 
  const correlationId = req.body.correlationId || 'N/A'; 
  const product = req.body.product || 'Unknown Product';
  const quantity = req.body.quantity || 0;

  console.log(`[Supplier API] Received order for ${product} (Quantity: ${quantity}) with Correlation ID: ${correlationId}`); 


  res.json({ message: `Order for ${product} received successfully!`, correlationId: correlationId, status: 'confirmed' }); 
});

app.get('/', (req, res) => {
  res.send('Hello from Docker on Azure VM! This is version 3.0 with API Key Auth.');
});

app.listen(port, () => {
  console.log(`Supplier API listening at http://localhost:${port}`);
});