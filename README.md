# AgroConnect

AgroConnect is a full-stack web application that connects local farmers and buyers, providing a transparent and efficient marketplace for fresh produce. This project was built with a Django backend and a React frontend.

## Features

-   **User Roles:** Separate registration and profile management for Farmers and Buyers.
-   **JWT Authentication:** Secure authentication with refresh tokens stored in HttpOnly cookies.
-   **Marketplace:** Farmers can list products, and buyers can browse and purchase them.
-   **Order Management:** Buyers can place orders and view their order history. Farmers can manage incoming orders.
-   **Sandbox Integrations:** Includes sandbox implementations for SSLCommerz (payment gateway) and REDX Courier (delivery service).

## Tech Stack

-   **Backend:** Django, Django Rest Framework, PostgreSQL (production), SQLite (development)
-   **Frontend:** React, Vite, Material-UI (MUI), Zustand
-   **Asynchronous Tasks:** Celery, Redis
-   **Payments:** SSLCommerz
-   **Shipping:** REDX Courier

## Setup and Installation

### Backend

1.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Create a `.env` file:**
    -   Copy the `.env.example` file to a new file named `.env`.
    -   Fill in the required environment variables, such as your sandbox credentials for SSLCommerz and REDX.

5.  **Run the database migrations:**
    ```bash
    python3 manage.py migrate
    ```

6.  **Start the development server:**
    ```bash
    python3 manage.py runserver
    ```
    The backend will be running at `http://localhost:8000`.

### Frontend

1.  **Navigate to the `frontend` directory:**
    ```bash
    cd frontend
    ```

2.  **Install the required dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The frontend will be running at `http://localhost:5173`. The application is configured to proxy API requests to the backend server.

## Project Structure

-   `backend/`: Contains the Django project.
    -   `app/`: Houses the individual Django apps (`accounts`, `profiles`, `marketplace`, `integrations`).
    -   `settings/`: Manages the Django settings for different environments.
    -   `utils/`: Contains utility functions and classes.
-   `frontend/`: Contains the React project.
    -   `src/`: The main source code for the React application.
        -   `api.js`: The centralized Axios instance with interceptors.
        -   `components/`: Reusable React components.
        -   `hooks/`: Reusable React hooks.
        -   `pages/`: The main page components.
        -   `store/`: Zustand state management stores.
        -   `theme.js`: The Material-UI theme configuration.
