// app.js
const express = require('express');
const app = express();
const port = 3000; 

app.use(express.json()); 

app.post('/order', (req, res) => { 
  const correlationId = req.body.correlationId || 'N/A'; 
  const product = req.body.product || 'Unknown Product';
  const quantity = req.body.quantity || 0;

  console.log(`[Supplier API] Received order for ${product} (Quantity: ${quantity}) with Correlation ID: ${correlationId}`); 


  res.json({ message: `Order for ${product} received successfully!`, correlationId: correlationId, status: 'confirmed' }); 
});

app.get('/', (req, res) => {
  res.send('Hello from Docker on Azure VM! This is version 2.0.');
  res.send('Hello from Docker on Azure VM! This is version 2.0. add test CI');
  res.send('Hello from Docker on Azure VM! This is version 2.0. add test CI 2');
  res.send('Hello from Docker on Azure VM! This is version 2.0. add test CI 3');
  res.send('Hello from Docker on Azure VM! This is version 2.0. add test CI 4');
  res.send('Hello from Docker on Azure VM! This is version 2.0. add test CI 5');
});

app.listen(port, () => {
  console.log(`Supplier API listening at http://localhost:${port}`);
});