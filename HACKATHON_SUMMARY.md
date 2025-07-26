# Becky Hackathon Project Summary

## 🎯 Project Overview

**Becky** is an AI-powered personal bookkeeper that meets all hackathon requirements with a custom MCP (Model Context Protocol) server implementation.

## ✅ Hackathon Requirements Met

### 🔥 Custom MCP Server (Primary Requirement)

**Location**: `apps/mcp-server/`

**Technology Stack**:
- Express.js + TypeScript
- Separate service architecture
- Modular design with clear separation of concerns

**Key Features**:
- `/chat` endpoint for LLM interactions
- Tool calling with financial data access
- Long-term context management
- Support for both Claude 3 Sonnet and GPT-4

**Architecture**:
```
apps/mcp-server/
├── src/
│   ├── index.ts          # Main server entry point
│   ├── routes/
│   │   ├── chat.ts       # Main chat endpoint
│   │   └── health.ts     # Health check
│   └── services/
│       ├── llm.ts        # LLM integration (Claude/GPT)
│       └── tools.ts      # Tool functions for data access
```

### 🧠 Long-term Context Management

**Implementation**: PostgreSQL database with `Context` model
- Stores user preferences and conversation history
- JSON field for flexible context structure
- Automatic context updates after each interaction

**Example Context Structure**:
```json
{
  "preferences": {
    "monthlyBudget": 3000,
    "savingsGoal": 5000,
    "categories": ["housing", "food", "utilities"]
  },
  "conversationHistory": [...],
  "lastInteraction": "2024-01-15T10:30:00Z"
}
```

### 🛠️ Tool Integration

**Available Tools**:
- `get_monthly_expenses(month, category)` - Financial data analysis
- Extensible architecture for additional tools

**Tool Calling Flow**:
1. User asks question → MCP Server
2. LLM decides to call tool → Tool execution
3. Tool returns data → LLM generates response
4. Response sent to user → Context updated

### 🏗️ Modular Architecture

**Clear Separation**:
- **Frontend**: Next.js app (`apps/nextjs-app/`)
- **Backend API**: Next.js API routes
- **MCP Server**: Express.js service (`apps/mcp-server/`)
- **Database**: PostgreSQL with Prisma ORM

**Communication Flow**:
```
Frontend → Next.js API → MCP Server → LLM → Database
```

## 🚀 Key Features Implemented

### 1. Authentication System
- JWT-based authentication
- User registration and login
- Secure password hashing with bcrypt

### 2. Financial Data Models
- **User**: Basic user information
- **Account**: Bank accounts and types
- **Movement**: Income/expense transactions
- **Context**: User preferences and conversation history

### 3. AI Chat Interface
- Real-time chat with Becky
- Message history and typing indicators
- Responsive design with Tailwind CSS

### 4. Database Integration
- Prisma ORM for type-safe database access
- Seeded with sample data for testing
- Automatic migrations and schema management

## 🔧 Technical Implementation

### MCP Server Endpoints

```typescript
// POST /chat
{
  "userId": "user123",
  "message": "How much did I spend on food this month?"
}

// Response
{
  "response": "Based on your data, you spent $450 on food in January...",
  "context": { /* updated context */ }
}
```

### LLM Integration

**Claude 3 Sonnet** (Primary):
```typescript
const message = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
  tools: tools
})
```

**GPT-4** (Fallback):
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  tools: tools
})
```

### Tool Calling Example

```typescript
// User: "How much did I spend on food this month?"
// LLM calls: get_monthly_expenses("January", "needs")
// Tool returns: { totalAmount: 450, movementCount: 8, ... }
// LLM generates: "You spent $450 on food in January..."
```

## 📊 Sample Data & Testing

### Default User
- **Email**: test@becky.com
- **Password**: password123

### Sample Financial Data
- 2 accounts (checking + savings)
- Income: $5,500 (salary + freelance)
- Expenses: $1,730 (needs + wants)
- Savings: $1,000

### Test Conversations
```
User: "How much did I spend last month?"
Becky: "Based on your data, you spent $1,730 in January..."

User: "Am I on track with my savings?"
Becky: "You've saved $1,000 so far, which is 20% of your $5,000 goal..."
```

## 🎯 Hackathon Judging Points

### ✅ Custom MCP Server
- **Built as separate service** using Express + TypeScript
- **Modular architecture** with clear separation
- **Tool integration** for financial data access
- **Context management** for personalized responses

### ✅ LLM Integration
- **Tool calling** with Claude 3 Sonnet and GPT-4
- **Dynamic responses** based on user data
- **Error handling** and fallback mechanisms

### ✅ Long-term Context
- **Persistent storage** in PostgreSQL
- **Conversation history** maintained across sessions
- **User preferences** for personalized experience

### ✅ Production Ready
- **Environment configuration** with .env
- **Database migrations** with Prisma
- **Health checks** and monitoring
- **Comprehensive documentation**

## 🚀 Quick Start

```bash
# 1. Setup
./setup.sh

# 2. Configure .env file

# 3. Database setup
npm run db:push
npm run db:seed

# 4. Start servers
npm run dev

# 5. Access application
# Frontend: http://localhost:3000
# MCP Server: http://localhost:3001
```

## 🏆 Hackathon Achievement

This project successfully demonstrates:

1. **Custom MCP Server Implementation** - The core requirement
2. **Advanced LLM Integration** - Tool calling with financial data
3. **Scalable Architecture** - Monorepo with clear separation
4. **Production Quality** - Comprehensive error handling and documentation
5. **User Experience** - Intuitive chat interface with real-time responses

**Becky** represents a complete, production-ready AI personal bookkeeper that showcases modern web development practices and advanced AI integration techniques.

---

*Built for hackathon with ❤️ and TypeScript* 