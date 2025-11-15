# System Patterns: QUANT

## Backend Architecture

The backend follows a modular, service-oriented architecture.

*   **Framework:** Express.js is used for handling HTTP requests and routing.
*   **Database:** The project uses a relational database, managed by the Prisma ORM. The schema is defined in `prisma/schema.prisma`. Migrations are used to manage database schema changes.
*   **Modularity:** The application is divided into modules (`account`, `auth`, `client`, `currency`, `user`), each with its own controller, service, routes, and types. This promotes separation of concerns and maintainability.
*   **Authentication:** JWT (JSON Web Tokens) are used for securing the API, with middleware to protect routes.
*   **Testing:** Jest is used for unit and integration testing. There are separate test files for services, controllers, and endpoints.

## Frontend Architecture

The frontend is a single-page application (SPA) built with Angular.

*   **Framework:** Angular.
*   **Component-Based:** The UI is built using a component-based architecture, a core principle of Angular.
*   **Routing:** Angular's router is used for navigation between different views.
*   **Styling:** SCSS is used for styling, allowing for more advanced CSS features.
*   **Build System:** The Angular CLI is used for building, serving, and testing the application, as configured in `angular.json`.
