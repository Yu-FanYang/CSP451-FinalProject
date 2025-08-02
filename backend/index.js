// index.js
const { QueueClient } = require("@azure/storage-queue"); 
const { v4: uuidv4 } = require('uuid'); 

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