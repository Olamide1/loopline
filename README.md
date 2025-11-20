# Loopline

A team chat tool for small teams.

## Features

- Team chat with channels
- MongoDB message storage
- Stripe and webhook integrations
- Hosted and self-hosted options

## Design System

- **Bauhaus Grid**: Base layout system using geometric grids
- **Matisse Accents**: Playful cutout shapes and icons inspired by Matisse
- **Custom CSS**: No frameworks, pure custom styling
- **Light Motion**: Subtle transitions for interactions

## Project Structure

```
loopline/
├── frontend/          # Vue 3 application
├── backend/           # Node.js API server
├── docker-compose.yml # Self-hosted setup
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or cloud)
- Stripe account (for integrations)

### Development Setup

1. **Install dependencies:**

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

2. **Set up environment variables:**

Create `.env` files in both `backend/` and `frontend/` directories:

**backend/.env:**
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/loopline
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
FRONTEND_URL=http://localhost:5173
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:3000
```

3. **Start MongoDB:**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# Or use your local MongoDB instance
```

4. **Run the application:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` to see the app.

### Self-Hosted

```bash
docker-compose up
```

## Design System

Loopline uses a custom design system with:
- **Bauhaus Grid**: 8px base unit, 12-column layout
- **Matisse Accents**: Playful cutout shapes using CSS clip-path
- **Custom CSS**: No frameworks, pure custom styling
- **Light Motion**: Subtle transitions for interactions

All styles are in `frontend/src/styles/design-system.css`.

## Project Structure

```
loopline/
├── frontend/          # Vue 3 application
│   ├── src/
│   │   ├── views/     # Page components
│   │   ├── stores/    # Pinia stores
│   │   ├── router/    # Vue Router
│   │   └── styles/    # Design system CSS
│   └── package.json
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── models/    # MongoDB models
│   │   ├── routes/    # Express routes
│   │   ├── socket/    # Socket.IO handlers
│   │   └── middleware/# Auth & other middleware
│   └── package.json
├── docker-compose.yml # Self-hosted setup
└── README.md
```

## Features Implemented

✅ Workspace management (create, invite, settings)
✅ Channel system (public/private, archive)
✅ Real-time messaging (Socket.IO)
✅ Stripe webhook integration
✅ Generic webhook handler
✅ Search functionality
✅ Admin tools (exports, stats)
✅ Mobile-responsive design
✅ Authentication (email/password)

## Next Steps

1. Add file preview functionality
2. Implement rules engine for integrations

