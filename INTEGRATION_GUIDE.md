# Becky Web App Integration Guide

This guide explains how to integrate the new Next.js web app with your existing MCP server and API server to create a complete AI-powered personal bookkeeper system.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   API Server    │    │   MCP Server    │
│   (Port 3000)   │◄──►│   (Port 3001)   │◄──►│   (Port 3002)   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Auth          │    │ • AI Tools      │
│ • Chat UI       │    │ • Accounts      │    │ • LLM Integration│
│ • Auth Forms    │    │ • Movements     │    │ • Context Mgmt  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Start All Services

**Terminal 1 - API Server:**
```bash
cd api-server
npm run dev
```

**Terminal 2 - MCP Server:**
```bash
cd mcp-server
npm run dev
```

**Terminal 3 - Web App:**
```bash
cd nextjs-app
./setup.sh  # Run setup script
npm run dev
```

### 2. Access Points

- **Web App**: http://localhost:3000
- **API Server**: http://localhost:3001
- **MCP Server**: http://localhost:3002

## 🔧 Integration Details

### API Server Integration

The web app communicates with your API server for:

1. **Authentication**
   - Login/Register endpoints
   - JWT token management
   - User session handling

2. **Financial Data**
   - Account management
   - Movement tracking
   - Data visualization

3. **Chat Bridge**
   - Forwards chat messages to MCP server
   - Handles conversation context

### MCP Server Integration

The web app uses your MCP server through the API server for:

1. **AI Chat**
   - Natural language processing
   - Financial analysis
   - Tool calling

2. **Financial Operations**
   - Account creation
   - Movement recording
   - Data queries

## 📡 API Endpoints

### Authentication
```typescript
POST /auth/login
POST /auth/register
GET /users/me
```

### Financial Data
```typescript
GET /accounts
POST /accounts
PATCH /accounts/:id
GET /movements
POST /movements/account/:id
PATCH /movements/:id
```

### Chat
```typescript
POST /chat/becky
```

## 🎯 Key Features

### 1. Dashboard
- **Real-time Financial Overview**: Live balance, income, and expense totals
- **Interactive Charts**: Monthly trends and expense categories
- **Account Management**: View and manage all accounts
- **Responsive Design**: Works on all devices

### 2. Chat Interface
- **AI-Powered Conversations**: Natural language interaction with Becky
- **Financial Operations**: Create accounts, record movements, get insights
- **Context Awareness**: Remembers conversation history
- **Real-time Responses**: Instant AI feedback

### 3. Authentication
- **Secure Login**: Email/password authentication
- **User Registration**: New account creation
- **Session Management**: Automatic token handling
- **Protected Routes**: Secure access to features

## 🔄 Data Flow

### User Login Flow
1. User enters credentials in web app
2. Web app sends login request to API server
3. API server validates credentials and returns JWT token
4. Web app stores token and redirects to dashboard

### Chat Flow
1. User sends message in web app
2. Web app sends message to API server
3. API server forwards to MCP server
4. MCP server processes with LLM and tools
5. Response flows back through API server to web app
6. Web app displays response to user

### Financial Data Flow
1. User performs action (create account, record movement)
2. Web app sends request to API server
3. API server validates and stores data
4. Web app updates UI with new data
5. Dashboard reflects changes immediately

## 🛠️ Development Workflow

### 1. Local Development
```bash
# Start all services
cd api-server && npm run dev &
cd mcp-server && npm run dev &
cd nextjs-app && npm run dev
```

### 2. Testing
- **API Server**: Test endpoints with Postman/curl
- **MCP Server**: Test tools directly
- **Web App**: Test UI and integration

### 3. Debugging
- **API Server**: Check logs for request/response
- **MCP Server**: Monitor tool calls and LLM responses
- **Web App**: Use browser dev tools and React dev tools

## 🔒 Security Considerations

### 1. Authentication
- JWT tokens for session management
- Secure password hashing
- Token expiration handling

### 2. API Security
- CORS configuration
- Input validation
- Rate limiting (recommended)

### 3. Data Protection
- HTTPS in production
- Environment variable management
- Secure API key handling

## 📊 Monitoring & Analytics

### 1. API Server Monitoring
- Request/response logging
- Error tracking
- Performance metrics

### 2. MCP Server Monitoring
- Tool call frequency
- LLM response times
- Error handling

### 3. Web App Analytics
- User interaction tracking
- Performance monitoring
- Error reporting

## 🚀 Deployment

### 1. API Server Deployment
```bash
cd api-server
npm run build
npm start
```

### 2. MCP Server Deployment
```bash
cd mcp-server
npm run build
npm start
```

### 3. Web App Deployment
```bash
cd nextjs-app
npm run build
npm start
```

### Environment Variables
Set these in your deployment environment:

```env
# API Server
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
API_PORT=3001

# MCP Server
ANTHROPIC_API_KEY=your_anthropic_key
MCP_SERVER_PORT=3002

# Web App
NEXT_PUBLIC_API_URL=your_api_url
NEXT_PUBLIC_MCP_URL=your_mcp_url
```

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure API server has CORS enabled
   - Check allowed origins

2. **Authentication Failures**
   - Verify JWT token handling
   - Check token expiration

3. **Chat Not Working**
   - Ensure MCP server is running
   - Check API server chat endpoint
   - Verify LLM API keys

4. **Data Not Loading**
   - Check API server connectivity
   - Verify database connection
   - Check authentication tokens

### Debug Steps

1. **Check Service Status**
   ```bash
   curl http://localhost:3001  # API Server
   curl http://localhost:3002  # MCP Server
   curl http://localhost:3000  # Web App
   ```

2. **Check Logs**
   - API Server: Console logs
   - MCP Server: Console logs
   - Web App: Browser console

3. **Test API Endpoints**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@becky.com","password":"password123"}'
   ```

## 🎯 Next Steps

### 1. Enhancements
- Add real-time notifications
- Implement data export features
- Add more chart types
- Enhance mobile experience

### 2. Advanced Features
- Multi-user support
- Data backup/restore
- Advanced analytics
- Integration with external services

### 3. Production Readiness
- Add comprehensive testing
- Implement monitoring
- Set up CI/CD pipeline
- Configure production environment

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts Documentation](https://recharts.org/)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

**Happy coding! 🚀**

Your Becky AI Personal Bookkeeper is now ready with a beautiful web interface that integrates seamlessly with your MCP server and API server. 