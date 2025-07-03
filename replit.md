# Real-time Server-Sent Events (SSE) Dashboard

## Overview

This is a full-stack web application that provides a real-time dashboard for managing Server-Sent Events (SSE) connections. The application allows administrators to monitor active client connections, broadcast messages to all connected clients, view event logs, and track server statistics in real-time.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: Server-Sent Events (SSE) for real-time updates
- **Session Management**: In-memory storage with fallback to database persistence

## Key Components

### Database Schema
The application uses four main tables:
- **users**: User authentication (prepared for future auth implementation)
- **connections**: Active SSE client connections with metadata
- **messages**: Broadcast message history
- **eventLogs**: System event logging with different severity levels

### Real-time Communication
- **SSE Endpoint**: `/api/events` provides real-time connection to clients
- **Connection Management**: Automatic reconnection with exponential backoff
- **Message Broadcasting**: Admin can send different types of messages to all connected clients
- **Connection Monitoring**: Real-time tracking of client connections and disconnections

### Storage Layer
- **Dual Storage Strategy**: In-memory storage for development with database persistence
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Migration Support**: Database schema migrations through Drizzle Kit

## Data Flow

1. **Client Connection**: Clients connect to `/api/events` SSE endpoint
2. **Connection Tracking**: Server stores connection metadata and client information
3. **Real-time Updates**: Dashboard receives live updates about connections and events
4. **Message Broadcasting**: Admin can broadcast messages that are instantly delivered to all clients
5. **Event Logging**: All system events are logged with timestamps and metadata
6. **Statistics**: Real-time server statistics are calculated and displayed

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm & drizzle-zod**: Database ORM with Zod schema validation
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI primitive components
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Type safety across the entire stack
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development
- **Hot Module Replacement**: Vite provides instant updates during development
- **TypeScript Compilation**: Real-time type checking and compilation
- **Database Development**: Uses environment variable for database connection

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild compiles TypeScript server to `dist/index.js`
- **Static Serving**: Express serves built frontend assets in production
- **Database**: PostgreSQL connection via DATABASE_URL environment variable

### Environment Configuration
- **NODE_ENV**: Controls development vs production behavior
- **DATABASE_URL**: PostgreSQL connection string (required)
- **Replit Integration**: Special handling for Replit development environment

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- July 03, 2025: **Gemini AI API Test System Successfully Implemented**
  - Integrated Gemini 1.5 Flash AI for intelligent API testing
  - Built comprehensive API test automation with error analysis
  - Implemented smart retry mechanism with AI-driven test data generation
  - Added /api-test frontend page for test management and monitoring
  - API test system includes Register, Login, Profile, and Admin endpoint testing
  - Gemini AI provides detailed error analysis and security recommendations
  - Database connection issue fixed (switched from Neon serverless to PostgreSQL)
  - Admin secret key configured for secure API testing
- July 03, 2025: **Migration from Replit Agent to Replit Environment completed successfully**
  - PostgreSQL database successfully provisioned and connected
  - Database migrations generated and applied for all required tables
  - Express+NestJS hybrid architecture fully functional on port 5000
  - Swagger API documentation accessible at `/api/docs` and through sidebar link
  - Real-time SSE Dashboard operational with video chat features
  - Frontend client properly connected to backend with real-time updates
  - User preferences set to Turkish language communication
- July 02, 2025: **Project migration to Replit environment completed successfully**
  - Express-based SSE Dashboard system operational at port 5000
  - PostgreSQL database integration maintained and functional
  - NestJS infrastructure established (Prisma, Auth, Users modules)
  - Swagger API documentation accessible at `/api/docs`
  - User requested Turkish language communication support
  - Comprehensive API structure with authentication, chat, video, games, social features planned
- July 01, 2025: Migration from Replit Agent to standard Replit environment completed
- Database connection successfully established with real PostgreSQL database
- Video chat participant tracking implemented with real-time updates
- WebRTC signaling improved for better peer-to-peer video connections
- Enhanced error handling and logging for video chat debugging
- Fixed sidebar stats to display video participants and room counts correctly

## Technical Notes

### Video Chat Implementation
- Uses WebSocket connections for real-time signaling between video participants
- WebRTC peer connections handle direct video/audio streaming between clients
- Participant tracking synchronized between database and in-memory state
- STUN servers configured for NAT traversal in video calls

### Database Integration
- Real-time SSE Dashboard now connected to external PostgreSQL database
- Video room and participant data persisted across server restarts
- Connection tracking and message history maintained in database

## Changelog

Changelog:
- July 01, 2025. Initial setup and migration completed