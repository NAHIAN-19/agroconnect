# AgroConnect - Farm Fresh Marketplace

A React + Vite application connecting local farmers and buyers for a transparent produce marketplace.

## Features

- 🔐 JWT authentication with refresh token support (HttpOnly cookies)
- 👥 Role-based access (Farmer/Buyer)
- 🛒 Shopping cart functionality
- 📦 Order management
- 🎨 Beautiful Material-UI design with custom "Farm Fresh" theme

## Tech Stack

- React 18
- Vite
- Material-UI (MUI)
- Zustand (State Management)
- Axios (HTTP Client)
- React Router v6
- React Hook Form
- React Hot Toast

## Getting Started

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_DEMO=false
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Demo Mode

Set `VITE_USE_DEMO=true` in your `.env` file to enable demo mode with mock data.

## Deployment

The app is configured for deployment on Vercel or Netlify. The `vercel.json` and `_redirects` files handle SPA routing.

