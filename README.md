<h1 align="center">Order API (Clean Architecture)</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeORM-0.3.x-262627?style=flat-square&logo=typeorm&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Jest-30.x-C21325?style=flat-square&logo=jest&logoColor=white" />
</p>

## 📖 Overview

A robust, highly scalable RESTful API designed to manage orders, leveraging **Clean Architecture** and **SOLID** principles. This project serves as a concrete implementation of modern software architecture practices, emphasizing domain isolation, dependency inversion, and strict data validation.

## 🏗️ Architecture & Design Patterns

The system is decoupled into well-defined layers, ensuring that the core business logic (Domain) remains entirely agnostic of external frameworks (UI, Database).

### Core Highlights
- **Clean Architecture:** Strict separation between `Domain`, `Use Cases`, `Interfaces`, and `Infrastructure`.
- **Dependency Injection (DI):** Utilizes `tsyringe` to invert dependencies, drastically improving testability and modularity.
- **Strict Validation:** Schemas are rigorously validated at the controller level using `zod`.
- **Data Persistence:** Relies on `TypeORM` with `PostgreSQL`, utilizing migrations for safe schema evolution.
- **Documentation:** Fully documented endpoints using `Swagger` (OpenAPI).

```mermaid
graph TD
    A[Routes / Express] -->|HTTP Request| B(Controllers)
    B -->|DTO Validation| C{Use Cases}
    C -->|Domain Logic| D[Entities]
    C -->|Interface| E[(Repositories)]
    E -.->|TypeORM| F[(PostgreSQL)]
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v22.x)
- Docker & Docker Compose

### Running locally
1. Clone the repository and install dependencies:
```bash
npm install
```
2. Copy the environment variables:
```bash
cp .env.example .env
```
3. Spin up the database via Docker:
```bash
npm run docker:up
```
4. Run database migrations:
```bash
npm run migration:run
```
5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`. You can access the Swagger documentation at `http://localhost:3000/api-docs`.

## 🧪 Testing
The project features a comprehensive suite of unit and integration tests using `Jest`.

```bash
# Run tests
npm run test

# Run tests with coverage report
npm run test:cov
```
