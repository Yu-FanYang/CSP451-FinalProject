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
