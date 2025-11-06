# Continuation of IIUC Intra Depeartment Hackathon Scenerio..

**In Development**

This project is a full-stack application with a React frontend and a Django backend.

## Project Structure

The project is divided into two main parts:

-   `frontend/`: Contains the React application.
-   `backend/`: Contains the Django application.

## Frontend

The frontend is a React application built with Vite.

### Key Features:

-   User authentication (login, register, OTP verification).
-   Product marketplace with search and filtering.
-   Shopping cart and wishlist functionality.
-   User dashboards for buyers and sellers.
-   Order history and payment processing.

### Getting Started (Frontend):

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Build the frontend: `npm run build`
4.  Start the development server(Shell - 1): `npm run dev`

## Backend

The backend is a Django application that provides a RESTful API for the frontend.

### Key Features:

-   User management and authentication.
-   Product and order management.
-   Payment processing integration.
-   Real-time notifications with Django Channels.

### Getting Started (Backend):

1.  Navigate to the `backend` directory: `cd backend`
2.  Create a virtual environment: `python -m venv env`
3.  Activate the virtual environment: `source env/bin/activate`
4.  Install dependencies: `pip install -r requirements.txt`
5.  Create database migrations: `python manage.py makemigrations`
6.  Apply database migrations: `python manage.py migrate`
7.  Start the development server(Shell - 2): `python manage.py runserver`
8.  Start Celery worker(Shell - 3): `celery -A backend worker -l info`
9.  Start Redis server(Shell - 4): `redis-server`

Goto `localhost:3000` to access frontend + backend

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.