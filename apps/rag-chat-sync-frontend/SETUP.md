# RAG Chat Sync Frontend - Setup Guide

## Backend Connection Setup

### 1. Create .env.local

Copy the following configuration to `.env.local`:

```bash
# Backend API URL (deployed on AWS)
NEXT_PUBLIC_API_BASE_URL=https://mw5wxwbbv1.execute-api.us-east-1.amazonaws.com/prod

# JWT Token
# Note: In production, this should be obtained through proper authentication flow
NEXT_PUBLIC_JWT_TOKEN=test-jwt-token

# Development mode
NODE_ENV=development
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at:
- Local: http://localhost:3000 (or next available port)
- Network: http://10.255.255.254:3000

### 4. Verify Connection

1. Open http://localhost:3000 in your browser
2. Navigate to Knowledge Spaces page
3. Try creating a new knowledge space
4. Verify API calls to the backend are successful

## Backend API Endpoints

- Base URL: `https://mw5wxwbbv1.execute-api.us-east-1.amazonaws.com/prod`
- Knowledge Spaces: `/knowledge`
- Agents: `/agents`
- Chat: `/chat`

## Troubleshooting

### Port Already in Use

If port 3000 is in use, Next.js will automatically use the next available port (e.g., 3003).

### Lock File Error

If you see "Unable to acquire lock" error:

```bash
rm -rf .next/dev
npm run dev
```

### API Connection Issues

1. Verify backend is deployed and accessible
2. Check CORS settings on backend
3. Verify JWT token is valid
4. Check browser console for error messages
