# CSP451-FinalProject

## Overview of system
Continue based on the architecture from Milestone 3
- Design event-driven communication using Azure Storage Queues
- Design distributed system using microservices and serverless integration
- Deploy Dockerized applications
- Create Azure Functions and trigger for event processing
- Implement CI/CD pipelines with GitHub Actions to build and deploy automation process
- Secure cloud applications with Key Vault, Secrets, and API keys


## Queue/event message formats
- Message format from backend: *product: ${productName}
  Stock: ${currentStock}
  Correlation ID: ${correlationId}*
- Define a header for Functionapp and supplier-api communication: `x-api-key: supplierApiKey`

## Setup instructions (manual and via CI/CD)
*For screenshots, please refer to the document*
### Event-driven communication using Azure Storage Queues
1.	Build the Storage Queue based on the step from Milestone 3
- Created Queue trigger
- `func init --worker-runtime node --model V4 --docker`
- `func new --name ProcessStockEvent --template AzureQueueStorageTrigger --language JavaScript`
2. Use Azure Monitor to trace end-to-end flow
- Enable Azure Monitor traceability from Azure portal
- Azure portal> Monitor > Virtual Machine > Enable
3. Trace log output from Function app
- From Function app > Log Stream > shows “Connected” to make sure Function app is working
- Run node `index.js` on local machine to emit event to Azure Function by Azure storage Queue
4. Check log output from Backend, Function App, and Supplier API with correlation ID
- Function App and Backend log with matching correlation ID
- Run the following command to retrieve log from Frontend: `sudo nano /var/lib/docker/containers/459964c9a6bec01576ebd8f06b3b83b6d7e1da7d02c39289e23094bfe62f2a88/459964c9a6bec01576ebd8f06b3b83b6d7e1da7d02c39289e23094bfe62f2a88-json.log`
- Frontend log with matching correlation ID (screenshot)

### Use GitHub Actions and Azure Pipelines to achieve CI/CD Automation
1.	Build Docker images 
- Run the following commands to install docker-compose
``` javascript
  sudo apt-get update
  sudo apt-get install ca-certificates curl gnupg lsb-release
  sudo mkdir -m 0755 -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \ "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker azureuser
```
2.	Push Docker image to Azure Container Registry
- Create Azure Container Registry (ACR)
- Go to Settings> Access keys> enable “Admin user” and record the following information
- Registry name, Login server, Username, and Password
3.	Create Service Principal on Azure portal
- Run the following script to create Service Principal
``` javascript
$SUB_ID="368b377b-8a10-4c39-9d38-e984c2696eea"
$RGN="csp451-yyang334"
az ad sp create-for-rbac --name "GitHubActionsServicePrincipal" --role contributor --scopes /subscriptions/$SUB_ID/resourceGroups/$RGN --sdk-auth
```
4. Note down clientId, clientSecret, subscriptionId, and tenantId
5. Go to GitHub to set up access permissions
- Set up the following secrets on GitHub > Secrets and variables > Actions
- AZURE_CREDENTIALS
- ACR_LOGIN_SERVER
- ACR_USERNAME
- ACR_PASSWORD
- VM_SSH_HOST
- VM_SSH_USERNAME
- VM_SSH_KEY
- DOCKER_COMPOSE_CONTENT: copy the content from supplier-api/docker-compose.yml file
6. Create main.yml file and deploy services to VM
- Refer to Appendix E for main.yml file
- The main.yml file will do the following jobs:
o	Use the variables from the secrets
o	Auto login Azure to achieve automation process
o	Build and push Docker image
o	Deploy ACR to virtual machine
7. Test CI/CD functionality (## Log sample with correlation ID)
- Result show GitHub CICD can auto deploy to Azure VM
- After committing ec1506 from GitHub, it is deployed to VM with the same corresponding number (refer to the screenshot in the document for correlation ID)

### Show multi-stage pipeline with test, build, and deploy steps
1.	Modify supplier-api on local machine 
2.	Then commit to GitHub 
3.	CI/CD flow to auto deploy on VM based on main.yml file

### Security measures
1.	Secure secrets using Azure Key Vault
- Create Azure Key Vault on Azure portal 
2.	Create the following 3 secrets
- AzureStorageConnectionString
- SupplierApiUrl : Get the public IP from VM
- Define SupplierApiKey
3.	Implement basic token-based or API key authentication
- Copy the Secret identifiers from the Secrets above
- Create Environment variables in Function app with the identifiers
- Create variables for the secrets
4.	Restrict Function App or API access using IP rules or policies
- Add variables in Azure Function App
- Modify supplier-api script and mapping to Key “SupplierApiKey” to restrict Function App access


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

``` javascript
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
