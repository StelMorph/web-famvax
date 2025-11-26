# Developer Guide: FAMVAX - Vaccination Management System

## 🎯 Project Overview

This document provides a comprehensive guide for developers interested in understanding, setting up, contributing to, and maintaining the **FAMVAX - Vaccination Management System**. FAMVAX is a monorepo project designed to offer a robust, scalable, and secure platform for managing vaccination records and documents. It leverages a modern serverless architecture on AWS, combined with a dynamic React.js frontend.

## 🏛️ Architecture Overview

FAMVAX is built as a **monorepo** containing two primary components: a **Frontend** (React.js web application) and a **Backend** (AWS Serverless API and infrastructure).

### High-Level Diagram

```
+-------------------+      +-------------------+      +-------------------+
|                   |      |                   |      |                   |
|     User (Web)    |<---->|  FAMVAX Frontend  |<---->|  FAMVAX Backend   |
|                   |      |    (React/Vite)   |      | (AWS Lambda/CDK)  |
+-------------------+      |                   |      |                   |
                           +-------------------+      +-------------------+
                                    ^                          ^
                                    |                          |
                                    v                          v
                            +-------------------+      +-------------------+
                            |  AWS Cognito for  |<---->|  AWS DynamoDB     |
                            |  Authentication   |      |  (Data Storage)   |
                            +-------------------+      +-------------------+
                                                               ^
                                                               |
                                                               v
                                                      +-------------------+
                                                      |   AWS S3 (Doc   |
                                                      |     Storage)    |
                                                      +-------------------+
                                                               ^
                                                               |
                                                               v
                                                      +-------------------+
                                                      | AWS Textract for  |
                                                      | Document Parsing  |
                                                      +-------------------+
```

### Component Breakdown

#### 1. Frontend (SPA - Single Page Application)

*   **Location:** `frontend/` directory.
*   **Purpose:** Provides the intuitive user interface for end-users to interact with the vaccination management system.
*   **Technologies:**
    *   **Framework:** React.js (with JSX for templating).
    *   **Build Tool:** Vite (for fast development and optimized builds).
    *   **Language:** TypeScript (for type safety).
    *   **Styling:** Custom CSS, likely structured within components.
    *   **UI Components:** Font Awesome for icons.
    *   **Input Handling:** `react-input-mask` for formatted input fields.
    *   **Date Management:** `date-fns` for robust date manipulation.
    *   **JWT Handling:** `jwt-decode` for parsing JSON Web Tokens (primarily from Cognito).
    *   **Authentication:** Integrates directly with **AWS Cognito** for user registration, login, and session management. User tokens obtained from Cognito are used to authorize API calls to the backend.
*   **Structure:**
    *   `src/main.jsx`: Frontend application entry point.
    *   `src/App.jsx`: Root React component.
    *   `src/api/`: Contains client-side code for interacting with the backend API.
    *   `src/components/`: Reusable UI components (e.g., buttons, forms, tables).
    *   `src/contexts/`: React Context API for global state management (e.g., user authentication status, global settings).
    *   `src/pages/`: Route-specific components that represent different views of the application (e.g., Dashboard, Login, Vaccination Records).
    *   `src/flows/`: Suggests structured sequences of user interactions or business logic flows, orchestrating multiple components or API calls for specific user journeys (e.g., "Onboarding Flow", "Document Upload Flow").
    *   `src/styles/`: Global or component-specific styling.
    *   `src/utils/`: Utility functions and helpers.

#### 2. Backend (Serverless API)

*   **Location:** `backend/` directory.
*   **Purpose:** Provides the core business logic, data persistence, and integration with AWS services for vaccination data, document processing, and reporting.
*   **Technologies:**
    *   **Framework:** AWS Lambda functions (Node.js runtime, TypeScript).
    *   **Infrastructure as Code (IaC):** AWS Cloud Development Kit (CDK) for defining and deploying all AWS resources.
    *   **Database:** AWS DynamoDB (NoSQL) for storing vaccination records, user profiles, and other related metadata.
    *   **Object Storage:** AWS S3 for securely storing uploaded vaccination documents (e.g., scanned certificates).
    *   **Document Processing:** AWS Textract for intelligent text and data extraction from scanned documents (PDFs, images).
    *   **PDF Manipulation:** `pdf-lib`, `pdfkit`, `fontkit` for generating and manipulating PDF documents, particularly for creating official vaccination certificates.
    *   **Data Validation:** Zod for robust schema validation of API request bodies and data structures, ensuring data integrity.
    *   **Logging:** Pino for efficient and structured logging within Lambda functions.
    *   **Idempotency:** AWS Lambda Powertools Idempotency ensures that API operations are repeatable without unintended side effects, crucial for distributed systems.
    *   **Configuration Management:** AWS Systems Manager Parameter Store for securely managing sensitive configuration parameters (e.g., API keys, service endpoints).
    *   **API Documentation:** OpenAPI Specification (`openapi.yaml`) defines the contract for all backend API endpoints, facilitating clear communication and client integration.
*   **Structure:**
    *   `backend/bin/backend.ts`: The entry point for the AWS CDK application, where the main CDK App is instantiated.
    *   `backend/lib/`: Contains the CDK stacks (e.g., `FamVaxStack.ts`) that define the AWS resources (Lambda functions, DynamoDB tables, S3 buckets, API Gateway endpoints, Cognito integrations, etc.).
    *   `backend/lambda-fns/`: Contains the TypeScript source code for individual AWS Lambda functions. Each function typically handles a specific API endpoint or background task (e.g., `createVaccinationRecord`, `processDocument`, `generatePdfCertificate`).
    *   `backend/openapi.yaml`: Defines the API Gateway routes and their corresponding Lambda integrations.

### Data Flow & Communication

1.  **User Interaction:** The user interacts with the **Frontend** web application.
2.  **Authentication:** The Frontend uses **AWS Cognito** for user registration and login. Upon successful authentication, Cognito issues JWTs (Access Token, ID Token).
3.  **API Requests:** For any data operations (e.g., fetching records, uploading documents), the Frontend sends authenticated API requests to the **Backend**. These requests typically pass through **AWS API Gateway** (implicitly provisioned by CDK) and include the JWT for authorization.
4.  **Backend Processing:**
    *   **Lambda Functions:** API Gateway routes requests to specific **AWS Lambda functions** in `backend/lambda-fns`.
    *   **Data Persistence:** Lambda functions interact with **AWS DynamoDB** for reading and writing vaccination records and other structured data.
    *   **Document Management:** For document uploads, Lambda functions facilitate storing files in **AWS S3**. When processing documents, Lambda functions trigger **AWS Textract** to extract data.
    *   **PDF Generation:** Lambda functions utilize `pdf-lib`, `pdfkit`, `fontkit` to dynamically generate PDF certificates based on stored data.
    *   **Configuration:** Lambda functions retrieve sensitive configurations from **AWS Systems Manager Parameter Store**.
5.  **Responses:** The Backend Lambda functions process requests, interact with AWS services, and return responses to the Frontend.

## ⚙️ Development Environment Setup

### Prerequisites

Ensure you have the following software installed on your development machine:

*   **Node.js:** v18.x or higher (LTS recommended) ([Download](https://nodejs.org/en/download/))
*   **npm:** v9.x or higher (comes with Node.js)
*   **Git:** Latest version ([Download](https://git-scm.com/downloads))
*   **AWS CLI:** Configured with credentials that have permissions to deploy CDK resources to your AWS account. ([Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
*   **AWS CDK Toolkit:** Global installation.
    ```bash
    npm install -g aws-cdk
    ```
*   **Docker Desktop:** (Optional, but recommended for local testing of some AWS services or if using localstack) ([Download](https://www.docker.com/products/docker-desktop/))

### Getting Started

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-organization/famvax-v4.1.git
    cd famvax-v4.1
    ```

2.  **Install Root Dependencies (Monorepo):**
    This project uses a monorepo setup, so install dependencies at the root level first.
    ```bash
    npm install
    ```
    This will install shared development tools (ESLint, Prettier, Vitest) and hoist common dependencies.

3.  **Install Frontend Dependencies:**
    Navigate into the `frontend` directory and install its specific dependencies.
    ```bash
    cd frontend
    npm install
    cd .. # Go back to monorepo root
    ```

4.  **Install Backend Dependencies:**
    Navigate into the `backend` directory and install its specific dependencies.
    ```bash
    cd backend
    npm install
    cd .. # Go back to monorepo root
    ```

### Local Configuration

#### Frontend Configuration

The frontend application requires environment variables, typically managed by Vite.
*   Create a `.env.development` file in the `frontend/` directory.
*   Example `.env.development` content:
    ```
    VITE_APP_REGION=us-east-1
    VITE_APP_USER_POOL_ID=us-east-1_xxxxxxxxx
    VITE_APP_CLIENT_ID=xxxxxxxxxxxxxxxxx
    VITE_APP_API_BASE_URL=https://xxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
    ```
    These values will be obtained after deploying your backend infrastructure (Cognito User Pool, API Gateway).

#### Backend Configuration

The backend (CDK and Lambda functions) typically gets configuration from environment variables set during deployment or from AWS Systems Manager Parameter Store.

*   **CDK Context:** You might need to set CDK context variables for specific deployments. Check `cdk.json` in the `backend/` directory for any required context variables.
*   **Parameter Store:** Ensure your AWS account has the necessary parameters configured in AWS Systems Manager Parameter Store if Lambda functions rely on them.

## 🚀 Running the Project Locally

### 1. Deploy the Backend (AWS CDK)

Before running the frontend, you need a deployed backend infrastructure.

1.  **Bootstrap CDK (First time per AWS account/region):**
    ```bash
    cd backend
    cdk bootstrap aws://YOUR_AWS_ACCOUNT_ID/YOUR_AWS_REGION
    ```
    Replace `YOUR_AWS_ACCOUNT_ID` and `YOUR_AWS_REGION`.

2.  **Deploy Backend Stacks:**
    ```bash
    cdk deploy --all --outputs-file cdk-outputs.json
    ```
    This command will deploy all necessary AWS resources (Cognito User Pool, DynamoDB tables, S3 buckets, Lambda functions, API Gateway, etc.).
    *   **Important:** Note down the outputs from `cdk-outputs.json` (especially `UserPoolId`, `UserPoolClientId`, and `ApiEndpoint`) as you will need them for the frontend configuration.

3.  **Update Frontend `.env`:**
    Populate your `frontend/.env.development` file with the `UserPoolId`, `UserPoolClientId`, and `ApiEndpoint` values obtained from the `cdk-outputs.json`.

### 2. Run the Frontend Development Server

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Start the Vite development server:
    ```bash
    npm run dev
    ```
    The application will typically be accessible at `http://localhost:5173` (or another port if 5173 is in use).

## 🧪 Testing

FAMVAX employs a robust testing strategy covering unit, integration, and end-to-end tests.

### Monorepo Root Tests

From the monorepo root (`famvax-v4.1/`), you can run:

*   **Linting (ESLint):**
    ```bash
    npm run lint
    ```
*   **Formatting (Prettier):**
    ```bash
    npm run format
    ```

### Frontend Testing

*   **Location:** `frontend/` directory.
*   **Unit/Integration Tests:** Using Vitest and React Testing Library.
    ```bash
    cd frontend
    npm run test:unit # or npm test
    ```
*   **End-to-End (E2E) Tests:** Using Playwright.
    ```bash
    cd frontend
    npm run test:e2e
    ```
    Ensure the frontend development server and backend API are running when executing E2E tests.

### Backend Testing

*   **Location:** `backend/` directory.
*   **Unit/Integration Tests:** Using Vitest.
    ```bash
    cd backend
    npm run test:unit # or npm test
    ```

## 📁 Project Structure (Detailed)

```
famvax-v4.1/
├── .github/                       # GitHub Actions workflows for CI/CD
├── .vscode/                       # VS Code editor settings and recommendations
├── node_modules/                  # Root-level Node.js dependencies (hoisted)
├── package.json                   # Monorepo root package definitions, shared dev scripts
├── tsconfig.json                  # Monorepo root TypeScript configuration
├── frontend/
│   ├── public/                    # Static assets for the frontend (index.html, favicon)
│   ├── src/
│   │   ├── api/                   # Client-side API integration code
│   │   ├── components/            # Reusable React UI components
│   │   ├── contexts/              # React Context providers for global state
│   │   ├── flows/                 # Orchestration of specific user journeys/business logic
│   │   ├── pages/                 # Route-specific React components/views
│   │   ├── styles/                # Frontend styling (CSS, SASS, etc.)
│   │   ├── utils/                 # Frontend utility functions
│   │   ├── App.jsx                # Root React component
│   │   ├── main.jsx               # Frontend application entry point
│   │   └── vite-env.d.ts          # Vite environment type definitions
│   ├── .env.development           # Local development environment variables for frontend
│   ├── index.html                 # Frontend HTML entry point
│   ├── package.json               # Frontend-specific dependencies and scripts
│   ├── tsconfig.json              # Frontend TypeScript configuration
│   └── vite.config.ts             # Vite build configuration
└── backend/
    ├── bin/
    │   └── backend.ts             # AWS CDK application entry point
    ├── lib/
    │   ├── famvax-stack.ts        # CDK stack defining AWS resources (Lambda, DynamoDB, S3, etc.)
    │   └── common-constructs/     # Reusable CDK constructs
    ├── lambda-fns/                # Source code for individual AWS Lambda functions
    │   ├── create-record/         # Example Lambda function directory
    │   │   ├── index.ts           # Lambda handler
    │   │   └── package.json       # Lambda-specific dependencies
    │   ├── process-document/      # Lambda for document processing (Textract)
    │   └── generate-pdf/          # Lambda for PDF generation
    ├── openapi.yaml               # OpenAPI (Swagger) specification for the backend API
    ├── package.json               # Backend-specific dependencies and scripts
    ├── cdk.json                   # AWS CDK configuration
    ├── tsconfig.json              # Backend TypeScript configuration
    └── .env.example               # Example environment variables for backend (if applicable)
```

## 🤝 Contribution Guidelines

We welcome contributions to FAMVAX! To ensure a smooth and effective collaboration, please adhere to the following guidelines:

1.  **Fork the Repository:** Start by forking the `famvax-v4.1` repository to your GitHub account.
2.  **Create an Issue:** Before starting significant work, create an issue in the main repository to discuss your proposed feature or bug fix. This helps align efforts and avoid duplication.
3.  **Clone Your Fork:**
    ```bash
    git clone https://github.com/your-username/famvax-v4.1.git
    cd famvax-v4.1
    ```
4.  **Create a New Branch:**
    Use descriptive branch names (e.g., `feature/add-dark-mode`, `bugfix/cognito-login-issue`).
    ```bash
    git checkout -b feature/your-feature-name
    ```
5.  **Implement Your Changes:**
    *   Write clean, well-commented, and maintainable code.
    *   Adhere to the existing coding style and practices.
    *   Ensure type safety with TypeScript.
6.  **Write Tests:**
    *   For new features, add corresponding unit and/or integration tests.
    *   For bug fixes, add a regression test that fails without your fix and passes with it.
7.  **Run All Tests & Linting:**
    Before committing, ensure all tests pass and your code adheres to linting and formatting standards.
    ```bash
    npm run test # From monorepo root to run all tests
    npm run lint # From monorepo root to run all lint checks
    npm run format # From monorepo root to auto-format
    ```
8.  **Commit Your Changes:**
    Use conventional commit messages (e.g., `feat: add user profile page`, `fix: resolve login redirect issue`).
    ```bash
    git commit -m "feat: Add new feature or fix description"
    ```
9.  **Push to Your Fork:**
    ```bash
    git push origin feature/your-feature-name
    ```
10. **Open a Pull Request (PR):**
    *   Go to the original `famvax-v4.1` repository on GitHub.
    *   Open a new pull request from your branch to the `main` branch.
    *   Provide a clear title and a detailed description of your changes, referencing the issue it addresses.
    *   Be responsive to feedback and review comments.

## 📚 Architectural Decisions & Design Patterns

*   **Monorepo Strategy:** Simplifies dependency management and code sharing between frontend and backend components.
*   **Serverless First:** Leverages AWS Lambda to reduce operational overhead and scale efficiently.
*   **Infrastructure as Code (CDK):** Ensures reproducible and version-controlled infrastructure deployments.
*   **Micro-Frontend/Micro-Backend Principles:** While not strictly micro-services, the clear separation of frontend/backend and individual Lambda functions encourages modularity.
*   **Event-Driven Architecture (Implicit):** Lambda functions can be triggered by S3 events (document uploads) or DynamoDB streams (data changes), facilitating decoupled processes.
*   **Context API for Global State (Frontend):** Manages shared state across the React application effectively.
*   **Zod for Schema Validation (Backend):** Provides declarative and robust data validation, improving API reliability.

## 🚢 Deployment

The primary deployment mechanism for the backend is AWS CDK. The frontend is a static web application that can be deployed to an S3 bucket and served via AWS CloudFront.

1.  **Backend Deployment:**
    ```bash
    cd backend
    npm run deploy # Alias for cdk deploy
    ```
2.  **Frontend Deployment:**
    The `frontend` `package.json` should have a `build` script.
    ```bash
    cd frontend
    npm run build
    ```
    The output (e.g., in `dist/`) can then be uploaded to an S3 bucket configured for static website hosting, often fronted by CloudFront for global distribution and SSL. Details for automating this would typically be in CI/CD pipelines (e.g., `.github/workflows`).

## 🚨 Security Considerations for Developers

*   **Least Privilege:** Always configure IAM roles and policies for Lambda functions with the minimum necessary permissions.
*   **Input Validation:** Robust input validation (using Zod in the backend) is critical for preventing injection attacks and data corruption.
*   **Secure Credential Handling:** Never hardcode sensitive information. Use AWS Systems Manager Parameter Store or AWS Secrets Manager for credentials.
*   **Cognito Security:** Familiarize yourself with Cognito's security best practices for user pools and identity pools.
*   **S3 Bucket Policies:** Ensure S3 buckets for document storage have appropriate and restrictive access policies.
*   **Dependency Audits:** Regularly audit project dependencies for known vulnerabilities.

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file in the project's root directory for more details.

## ❓ Support & Contact

For any development-related questions, issues, or contributions, please:

*   Reach out to the project maintainers at `stelmorph@gmail.com`.

---

**Thank you for contributing to FAMVAX!**
