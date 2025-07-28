# Becky - AI Personal Bookkeeper

Becky is an AI-powered personal bookkeeper built with a three-tier architecture:

1. **API Server** - Express + TypeScript + Prisma (Port 3001)
2. **MCP Server** - Custom MCP implementation (Port 3002) 
3. **Next.js App** - Frontend application (Port 3000)

## 🏗️ Architecture

```
becky-mcp/
├── api-server/          # Express API with Prisma
├── mcp-server/          # Custom MCP server
├── nextjs-app/          # Next.js frontend
├── .env                 # Environment variables
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/becky_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# LLM API Keys (choose one)
ANTHROPIC_API_KEY="your-anthropic-api-key"
OPENAI_API_KEY="your-openai-api-key"

# API Server
API_PORT=3001
API_SERVER_URL="http://localhost:3001"

# MCP Server  
MCP_SERVER_PORT=3002
MCP_SERVER_URL="http://localhost:3002"
```

### 2. API Server Setup

```bash
cd api-server
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

**API Server Features:**
- User authentication (JWT)
- Account management
- Financial movements tracking
- User context storage
- Database with Prisma ORM

**Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /users/me` - Get current user
- `GET /accounts` - Get user accounts
- `POST /accounts` - Create account
- `GET /movements/account/:id` - Get account movements
- `POST /movements/account/:id` - Create movement
- `POST /chat/becky` - Chat bridge to MCP server

### 3. MCP Server Setup

```bash
cd mcp-server
npm install
npm run dev
```

**MCP Server Features:**
- Custom MCP implementation
- LLM integration (Claude/GPT)
- Tool calling for financial data
- Context management
- Communication with API server

**Endpoints:**
- `POST /chat` - Main chat endpoint
- `GET /health` - Health check

### 4. Next.js App Setup

```bash
cd nextjs-app
npm install
npm run dev
```

**Next.js App Features:**
- Modern React frontend
- Tailwind CSS styling
- Authentication pages
- Chat interface with Becky
- Responsive design

## 🧪 Testing

### Default Login Credentials

After seeding the database:
- **Email**: test@becky.com
- **Password**: password123

### Sample Data

The API server seed creates:
- 1 test user
- 2 accounts (checking + savings)
- Sample financial movements
- Initial user context

## 🔧 Development

### Running All Services

You can run each service in separate terminals:

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

**Terminal 3 - Next.js App:**
```bash
cd nextjs-app
npm run dev
```

### Access Points

- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:3001
- **MCP Server**: http://localhost:3002

## 🤖 MCP Server Architecture

The custom MCP server is the core AI component:

### Key Features
- **LLM Integration**: Claude 3 Sonnet / GPT-4
- **Tool Calling**: Dynamic function execution
- **Context Management**: Conversation history
- **API Communication**: Fetches data from API server

### Tool Functions
- `get_monthly_expenses(month, category)` - Financial analysis
- Extensible for additional tools

### Example Flow
1. User asks question → Next.js App
2. Next.js calls API Server → API Server calls MCP Server
3. MCP Server calls LLM → LLM decides to use tools
4. Tool fetches data from API Server → LLM generates response
5. Response sent back through chain → User sees answer

## 🎯 Hackathon Requirements Met

✅ **Custom MCP Server** - Separate Express + TypeScript service  
✅ **Long-term Context** - PostgreSQL storage with conversation history  
✅ **Tool Integration** - Dynamic tool calling with financial data  
✅ **Modular Architecture** - Three separate, independent services  
✅ **LLM Integration** - Support for Claude and GPT with tool calling  

## 🚀 Production Deployment

Each service can be deployed independently:

### API Server
```bash
cd api-server
npm run build
npm start
```

### MCP Server
```bash
cd mcp-server
npm run build
npm start
```

### Next.js App
```bash
cd nextjs-app
npm run build
npm start
```

## 📁 Project Structure

```
api-server/
├── src/
│   ├── index.ts          # Main server
│   └── routes/           # API endpoints
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts          # Sample data
└── package.json

mcp-server/
├── src/
│   ├── index.ts          # Main server
│   ├── routes/           # MCP endpoints
│   └── services/         # LLM & tools
└── package.json

nextjs-app/
├── src/
│   ├── app/             # Next.js pages
│   └── components/      # React components
└── package.json
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and DATABASE_URL is correct
2. **Port Conflicts**: Check that ports 3000, 3001, 3002 are available
3. **Environment Variables**: Verify all required env vars are set
4. **Dependencies**: Run `npm install` in each project directory

### Health Checks

- **API Server**: http://localhost:3001/
- **MCP Server**: http://localhost:3002/health
- **Next.js App**: http://localhost:3000

---

**Becky** - Your AI Personal Bookkeeper 🤖💰 