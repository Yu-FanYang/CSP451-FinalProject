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
