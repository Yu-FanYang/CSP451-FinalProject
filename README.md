# CSP451-FinalProject




## Overview of system
## Setup instructions (manual and via CI/CD
## Service roles and communication
## Queue/event message formats
## Log sample with correlation ID
## Security measures


## Task1: System Architecture
### 1. Minimum 3 Docker services (e.g., frontend, inventory API, product service)
### 2. Azure Function App(s) with:
- HTTP triggers (e.g., manual reorder)
- Queue triggers (e.g., stock events)
- Timer triggers (e.g., daily summary)
### 3. Event-driven communication using:
- Azure Storage Queues, Service Bus, or Event Grid

I choose Azure Storage Queue to implement this project.






## Task2: CI/CD Automation
### 1. Use GitHub Actions, Azure Pipelines, or GitLab CI to:
- Build Docker images
- Push to Azure Container Registry (optional)
- Deploy services to VM, Web Apps, or AKS
- Deploy Azure Functions
### 2. Show multi-stage pipeline with test, build, and deploy steps

## Task3: Security
### 1. Secure secrets using Azure Key Vault
### 2. Enable HTTPS endpoints
### 3. Implement basic token-based or API key authentication
### 4. Restrict Function App or API access using IP rules or policies (optional)

## Task4: Monitoring and Logging
### 1. Centralize all logs (frontend, backend, functions) via:
- Azure Monitor
- Application Insights
- Log Analytics
 ### 2. Enable structured logging and correlation ID tracing
- Configure alerts, dashboards, or custom metrics



### Source code

- Appendix A: docker-compose.yml

``` javascript
services:
  supplier-api:
    build:
      context: ./supplier-api
      dockerfile: Dockerfile
    image: yyang334acr.azurecr.io/supplier-api:latest 
    restart: always
    ports:
      - "3000:3000" 
    environment:
      - NODE_ENV=production
      - API_KEY=${API_KEY} # put ${API_KEY} for VM read environment variables
```

- Appendix B: ProcessStockEvent.js
const { app } = require('@azure/functions');
const axios = require('axios');

app.storageQueue('ProcessStockEvent', {
    //queueName: 'js-queue-items',
    queueName: 'product-stock-events',
    connection: 'AzureWebJobsStorageConnection',
    handler: async (message, context) => { 
            context.log(`[Azure Function] Queue trigger function processed message: ${JSON.stringify(message)}`); // print message from the received message
    
            const payload = message; // get information from message
            const correlationId = payload.correlationId || 'N/A'; // get ID from message
            const product = payload.product;
            const currentStock = payload.currentStock;
    
            context.log(`[Azure Function] Processing product: ${product}, Stock: ${currentStock}, Correlation ID: ${correlationId}`);
    
            try {
                //const supplierApiUrl = 'http://localhost:3000/order';  // for local test
                const supplierApiUrl = process.env.SUPPLIER_API_URL;
                const supplierApiKey = process.env.SUPPLIER_API_KEY;
                if (!supplierApiUrl || !supplierApiKey) {
                    throw new Error("Supplier API URL or API Key is not configured.");
                }
                const config = {
                    headers: {
                        'x-api-key': supplierApiKey // bring key to the header 
                    }
                };

                const response = await axios.post(supplierApiUrl, { // send response to supplier-api
                    product: product,
                    quantity: currentStock, // current stock amount
                    correlationId: correlationId
                }, config); // bring config to axios
    
                context.log(`[Azure Function] Supplier API Response for Correlation ID ${correlationId}: ${JSON.stringify(response.data)}`); // print supplier-api response
            } catch (error) {
                if (error.response) {
                    context.error(`[Azure Function] Error from Supplier API: ${error.response.status} ${JSON.stringify(error.response.data)}`);
                } else {
                    context.error(`[Azure Function] Error calling Supplier API for Correlation ID ${correlationId}: ${error.message}`); // print error message when connection is failed
                }
            }
        }
});
```

- Appendix C: Supplier-api / app.js

``` javascript
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
```

- Appendix D: Backend / index.js

``` javascript
require('dotenv').config(); // let node js read .env file to decode "AZURE_STORAGE_CONNECTION_STRING"

const { QueueClient } = require("@azure/storage-queue"); 
const { v4: uuidv4 } = require('uuid'); 

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const queueName = "product-stock-events"; 
const queueClient = new QueueClient(connectionString, queueName);

async function emitProductStockEvent(productName, currentStock) {
  const threshold = 10; 
  if (currentStock <= threshold) {
    const correlationId = uuidv4(); 

    const eventData = {
      product: productName,
      currentStock: currentStock,
      message: `Product ${productName} stock is low (${currentStock}). Please reorder.`,
      correlationId: correlationId 
    };

    const message = Buffer.from(JSON.stringify(eventData)).toString('base64'); 

    try {
      await queueClient.sendMessage(message); 
      console.log(`[Backend] Emitted stock event for ${productName} (Stock: ${currentStock}). Correlation ID: ${correlationId}`);  
    } catch (error) {
      console.error(`[Backend] Error emitting event for ${productName}:`, error.message);
    }
  } else {
    console.log(`[Backend] Product ${productName} stock is fine (${currentStock}). No event emitted.`);
  }
}

async function simulateStockDecrease() {
  await emitProductStockEvent("Laptop", 5); 
  await emitProductStockEvent("Mouse", 25); 
  await emitProductStockEvent("Keyboard", 8); 
}

simulateStockDecrease();
```


- Appendix E: main.yml

``` javascript
# .github/workflows/main.yml
name: Build and Deploy Supplier-API to Azure VM

on:
  push:
    branches: [ "main" ]
    paths:
      - 'supplier-api/**' 

jobs:
  build_and_push_to_acr:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest 

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Log in to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Log in to ACR
      uses: docker/login-action@v3
      with:
        registry: ${{ secrets.ACR_LOGIN_SERVER }}
        username: ${{ secrets.ACR_USERNAME }}
        password: ${{ secrets.ACR_PASSWORD }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./supplier-api 
        push: true
        tags: ${{ secrets.ACR_LOGIN_SERVER }}/supplier-api:latest

  deploy_to_vm:
    name: Deploy to Azure VM
    runs-on: ubuntu-latest
    needs: build_and_push_to_acr 

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Deploy to VM
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.VM_SSH_HOST }}
        username: ${{ secrets.VM_SSH_USERNAME }}
        key: ${{ secrets.VM_SSH_KEY }}
        script: |
          # az login --service-principal -u ${{ secrets.ACR_USERNAME }} -p ${{ secrets.ACR_PASSWORD }} --tenant ${{ secrets.AZURE_TENANT_ID }}
          
          docker login ${{ secrets.ACR_LOGIN_SERVER }} -u ${{ secrets.ACR_USERNAME }} -p ${{ secrets.ACR_PASSWORD }}
          
          mkdir -p ~/final-project
          cd ~/final-project
          
          docker stop $(docker ps -a -q) || true
          docker rm $(docker ps -a -q) || true
          echo '${{ secrets.DOCKER_COMPOSE_CONTENT }}' > docker-compose.yml

          # add supplier_API_KEY
          echo "API_KEY=${{ secrets.SUPPLIER_API_KEY }}" > .env
          
          docker compose pull

          docker com
```
