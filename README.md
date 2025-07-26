# Becky - AI Personal Bookkeeper

Becky is an AI-powered personal bookkeeper that helps users track expenses, analyze spending patterns, and get intelligent insights about their finances through natural conversation.

## 🏗️ Architecture

This is a monorepo with the following structure:

```
becky-mcp/
├── apps/
│   ├── nextjs-app/     # Frontend + Backend API routes
│   └── mcp-server/     # Custom MCP server (Express + TypeScript)
├── prisma/
│   ├── schema.prisma   # Database models
│   └── seed.ts         # Database seeding
└── packages/
    └── shared/         # Shared types (optional)
```

## 🚀 Features

- **AI-Powered Chat Interface**: Ask Becky questions about your finances
- **Expense Tracking**: Connect accounts and track spending
- **Smart Insights**: Get personalized financial advice
- **Custom MCP Server**: Built with Express + TypeScript for hackathon requirements
- **JWT Authentication**: Secure user authentication
- **PostgreSQL Database**: Robust data storage with Prisma ORM

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Next.js API routes + Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + bcrypt
- **AI**: Claude 3 Sonnet / GPT-4 with tool calling
- **MCP Server**: Express + TypeScript (custom implementation)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Anthropic API key (Claude) or OpenAI API key (GPT-4)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd becky-mcp
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/becky_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# LLM API Keys (choose one)
ANTHROPIC_API_KEY="your-anthropic-api-key"
OPENAI_API_KEY="your-openai-api-key"

# MCP Server
MCP_SERVER_PORT=3001
MCP_SERVER_HOST="localhost"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed
```

### 4. Start Development Servers

```bash
# Start both Next.js app and MCP server
npm run dev

# Or start individually:
npm run dev:nextjs  # Next.js app on port 3000
npm run dev:mcp     # MCP server on port 3001
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **MCP Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🧪 Testing

### Default Login Credentials

After seeding the database, you can login with:

- **Email**: test@becky.com
- **Password**: password123

### Sample Data

The seed script creates:
- 1 test user
- 2 accounts (checking + savings)
- Sample movements (income, expenses, savings)
- Initial user context

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - User login
- `GET /api/users/me` - Get current user info

### Chat
- `POST /api/chat/becky` - Send message to Becky

### MCP Server
- `POST /chat` - Main chat endpoint
- `GET /health` - Health check

## 🤖 MCP Server Architecture

The custom MCP server is the core of Becky's AI capabilities:

### Key Components

1. **LLM Integration**: Supports both Claude 3 Sonnet and GPT-4
2. **Tool Calling**: Dynamic function execution based on user queries
3. **Context Management**: Maintains conversation history and user preferences
4. **Database Integration**: Direct access to user financial data

### Tools Available

- `get_monthly_expenses(month, category)` - Get expense data for analysis
- Additional tools can be easily added

### Example Usage

```typescript
// MCP Server receives:
{
  "userId": "user123",
  "message": "How much did I spend on food this month?"
}

// LLM decides to call tool:
{
  "name": "get_monthly_expenses",
  "parameters": {
    "month": "January",
    "category": "needs"
  }
}

// Returns intelligent response based on data
```

## 🎯 Hackathon Requirements Met

✅ **Custom MCP Server**: Built as separate Express + TypeScript service  
✅ **Long-term Context**: User context stored in PostgreSQL  
✅ **Tool Integration**: Dynamic tool calling with financial data  
✅ **Modular Architecture**: Clear separation between frontend and MCP server  
✅ **LLM Integration**: Support for Claude and GPT with tool calling  

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Environment Variables

Ensure all environment variables are set in production:
- Database connection
- JWT secret
- LLM API keys
- Server ports

### Database Migration

```bash
npx prisma migrate deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is built for hackathon purposes. Feel free to use and modify as needed.

## 🆘 Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure database is running and accessible
4. Check that both servers are running (Next.js + MCP)

---

**Becky** - Your AI Personal Bookkeeper 🤖💰 