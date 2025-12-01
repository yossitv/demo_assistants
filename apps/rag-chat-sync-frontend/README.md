# RAG Chat Web Application

A Next.js 14+ web application that provides a user interface for the RAG Chat Backend MVP. This application enables users to create knowledge bases from web URLs, configure AI agents, and interact with those agents through a chat interface.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
  - [Deploy to Vercel](#deploy-to-vercel)
  - [Deploy as Standalone Application](#deploy-as-standalone-application)
  - [Deploy as Static Site](#deploy-as-static-site)
  - [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Troubleshooting](#troubleshooting)

## Features

- Chat interface for interacting with AI agents
- Knowledge base creation from web URLs
- Agent creation and management
- Embeddable chat widget for iframe integration
- Responsive design for mobile and desktop
- Real-time markdown rendering for assistant responses
- Citation display with clickable source links
- Local storage persistence for agent management

## Prerequisites

- Node.js 18.x or later
- npm, yarn, pnpm, or bun
- Access to RAG Chat Backend API
- Valid JWT token for API authentication

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd web

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Update .env.local with your API configuration
# NEXT_PUBLIC_API_BASE_URL=<your-api-url>
# NEXT_PUBLIC_JWT_TOKEN=<your-jwt-token>
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The page auto-updates as you edit files. Start by modifying `app/page.tsx`.

## Environment Variables

All environment variables are documented in `.env.example`. Copy this file to `.env.local` and update the values:

### Required Variables

- **NEXT_PUBLIC_API_BASE_URL**: Base URL for the RAG Chat Backend API
  - Example: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`

- **NEXT_PUBLIC_JWT_TOKEN**: JWT token for API authentication
  - Obtain from your backend authentication service

### Optional Variables

- **NEXT_OUTPUT_MODE**: Build output mode (leave empty for default Vercel deployment)
  - Options: `standalone`, `export`, or undefined

- **NODE_ENV**: Node environment (`development`, `production`, `test`)

- **NEXT_TELEMETRY_DISABLED**: Set to `1` to disable Next.js telemetry

See `.env.example` for detailed documentation of all variables.

## Development

### Available Scripts

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run validate` - Run type-check, lint, and tests

### Testing Scripts

- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## Deployment

This application supports multiple deployment strategies:

### Deploy to Vercel

Vercel is the recommended deployment platform for Next.js applications.

#### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<your-repo-url>)

#### Manual Deploy

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Build and deploy:
   ```bash
   npm run build:vercel
   vercel
   ```

3. Configure environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add `NEXT_PUBLIC_API_BASE_URL`
   - Add `NEXT_PUBLIC_JWT_TOKEN`

#### Vercel Configuration

No additional configuration needed. The application is optimized for Vercel by default.

### Deploy as Standalone Application

Build an optimized standalone version with minimal runtime for Node.js or Docker deployment.

```bash
# Build standalone version
npm run build:standalone

# The output will be in .next/standalone
# Copy static files
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# Start server
cd .next/standalone
node server.js
```

The server will start on port 3000 by default. Set `PORT` environment variable to change:

```bash
PORT=8080 node server.js
```

### Deploy as Static Site

Export the application as static HTML/CSS/JS for hosting on static file servers (Netlify, Cloudflare Pages, etc.).

```bash
# Build static export
npm run build:static

# The output will be in the 'out' directory
# Preview locally
npm run preview:static
```

**Note**: Static export does not support:
- Server-side rendering (SSR)
- API routes
- Dynamic routes without static parameters
- Image optimization

### Docker Deployment

#### Using Standalone Build

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_OUTPUT_MODE standalone

RUN npm run build:standalone

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Build and run:

```bash
# Build image
docker build -t rag-chat-web .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=<your-api-url> \
  -e NEXT_PUBLIC_JWT_TOKEN=<your-jwt-token> \
  rag-chat-web
```

## Project Structure

```
web/
├── app/                    # Next.js App Router pages
│   ├── agents/            # Agent-related pages
│   │   ├── [agentId]/    # Chat interface
│   │   └── create/       # Agent creation
│   ├── embed/            # Embeddable widget pages
│   │   └── [agentId]/    # Embedded chat
│   ├── knowledge/        # Knowledge space management
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── ChatWidget.tsx    # Main chat component
│   ├── MessageList.tsx   # Message display
│   ├── MessageInput.tsx  # Chat input
│   ├── CreateAgentForm.tsx
│   └── ...
├── lib/                   # Library code
│   ├── api/              # API client
│   ├── context/          # React contexts
│   └── utils/            # Utility functions
├── types/                 # TypeScript type definitions
├── public/               # Static files
└── __tests__/           # Test files
```

## API Integration

This application integrates with the RAG Chat Backend API using the following endpoints:

- `POST /v1/chat/completions` - Send chat messages
- `POST /v1/knowledge/create` - Create knowledge spaces
- `GET /v1/knowledge/list` - List knowledge spaces
- `POST /v1/agent/create` - Create agents

### Authentication

All API requests include a JWT token in the Authorization header:

```
Authorization: Bearer <NEXT_PUBLIC_JWT_TOKEN>
```

### API Client

The centralized API client is located at `lib/api/client.ts` and handles:
- Request/response formatting
- Error handling
- Authentication headers
- Response validation

## Troubleshooting

### Build Errors

**Issue**: Build fails with environment variable errors

**Solution**: Ensure all required environment variables are set in `.env.local` or your deployment platform.

### API Connection Issues

**Issue**: Cannot connect to backend API

**Solution**:
1. Verify `NEXT_PUBLIC_API_BASE_URL` is correct
2. Check CORS configuration on backend
3. Verify JWT token is valid
4. Check browser console for specific error messages

### Embed Mode Not Working

**Issue**: Chat widget not displaying in iframe

**Solution**:
1. Check X-Frame-Options headers are configured (see `next.config.ts`)
2. Verify parent site allows iframe embedding
3. Check for CORS issues

### Static Export Issues

**Issue**: Features not working in static export

**Solution**: Static export has limitations:
- Cannot use server-side rendering
- Cannot use dynamic routes without `generateStaticParams`
- Consider using standalone or Vercel deployment instead

### Performance Issues

**Issue**: Application loads slowly

**Solution**:
1. Enable production build optimizations
2. Check network tab for slow API requests
3. Verify images are optimized
4. Consider enabling React strict mode in development

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [React Documentation](https://react.dev) - Learn React
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/docs) - TypeScript documentation

## Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend API documentation
3. Check application logs
4. Contact the development team
