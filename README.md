# Bucket

Bucket is a modern course and grade management application built with Next.js. It allows students to organize their courses, track their grades, and visualize their academic progress. It includes features for importing course data (specifically designed for D2L/Brightspace formats) and provides a clean, responsive user interface.

## Features

- **Course Management**: Organize and view all your courses in one place.
- **Grade Tracking**: Detailed breakdown of grades for each course.
- **Data Import**: Easily import course outlines and grades from D2L/Brightspace.
- **Authentication**: Secure login using Google OAuth (via NextAuth.js).
- **Responsive Design**: Built with Tailwind CSS and DaisyUI for a great experience on mobile and desktop.
- **Telemetry**: Built-in telemetry for usage tracking (configurable).

## Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [DaisyUI](https://daisyui.com/)
- **Backend/API**: [Hasura GraphQL Engine](https://hasura.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Infrastructure**: Docker & Docker Compose

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Docker](https://www.docker.com/) and Docker Compose

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd bucket
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file to create your local configuration:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the required values:

- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Create credentials in the [Google Cloud Console](https://console.cloud.google.com/).
- `NEXTAUTH_URL`: `http://localhost:3000` for local development.
- `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`).
- `GRAPHQL_URL`: The URL of your Hasura instance (e.g., `http://localhost:8080/v1/graphql`).
- `GRAPHQL_SERVICE_SECRET`: A shared secret for signing JWTs to authenticate with Hasura.
- `TELEMETRY_SECRET`, `TELEMETRY_ADMIN_ID`, `CRON_SECRET`: Set these for telemetry and cron job security.

### 4. Start Backend Services

Start the PostgreSQL database and Hasura engine using Docker Compose:

```bash
cd services
docker-compose up -d
```

This will start Hasura on `http://localhost:8080`. You may need to configure Hasura (apply migrations/metadata) if this is a fresh install.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

- `app/`: Next.js App Router pages and API routes.
    - `api/`: Backend API endpoints (Auth, GraphQL proxy, Parsing logic).
    - `components/`: Reusable React components.
    - `courses/`: Course management pages.
- `lib/`: Utility functions (Hasura client, Auth options, Grade parsing).
- `services/`: Docker Compose configuration for backend services.
- `examples/`: Sample data files for testing imports.

## License

This project is licensed under the terms found in the `LICENSE` file.
