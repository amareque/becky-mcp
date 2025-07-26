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

# Email Configuration for Reports
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # Use App Password for Gmail
SMTP_FROM="Becky <your-email@gmail.com>"
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
- **📧 Email reporting system**
- **⏰ Scheduled reports (cron jobs)**

**Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /users/me` - Get current user
- `GET /accounts` - Get user accounts
- `POST /accounts` - Create account
- `GET /movements/account/:id` - Get account movements
- `POST /movements/account/:id` - Create movement
- `POST /chat/becky` - Chat bridge to MCP server
- **📊 `POST /reports/send-now` - Send email report immediately**
- **⚙️ `POST /reports` - Configure automatic reports**
- **📋 `GET /reports` - Get configured reports**
- **🔄 `PUT /reports/:id/toggle` - Toggle report status**
- **🗑️ `DELETE /reports/:id` - Delete report**
- **🔍 `GET /reports/preview/:type` - Preview report**
- **✅ `POST /reports/test-email` - Test email configuration**

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
- **📧 Email report tools**

**Available Tools:**
- `login` / `register` / `logout` - Authentication
- `get_user_info` - User information
- `create_account` / `get_accounts` / `update_account` - Account management
- `create_movement` / `get_movements` / `update_movement` - Transaction management
- `create_contact` / `get_contacts` - Contact management
- `create_shared_expense` / `create_simple_loan` / `get_pending_loans` / `settle_loan` - Loan tracking
- `process_receipt_image` / `extract_receipt_data` - Receipt processing
- **📧 `send_email_report` - Send report via email now**
- **⚙️ `configure_email_reports` - Set up automatic reports**
- **📋 `get_email_reports` - View configured reports**
- **🔄 `toggle_email_report` - Enable/disable reports**
- **✅ `test_email` - Test email configuration**

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

## 📧 Email Reports Feature

### Configuration

Set up your email configuration in `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
SMTP_FROM="Becky <your-email@gmail.com>"
```

### Available Reports

1. **📊 Loans Summary** (`loans_summary`)
   - Total lent and borrowed money
   - Net position
   - List of pending loans
   - Available frequencies: daily, weekly, monthly

2. **📈 Weekly Summary** (`weekly_summary`)
   - Weekly financial overview
   - Income vs expenses
   - Top spending categories  
   - Loan status
   - Available frequency: weekly

### Usage Examples

**Send immediate report:**
```
User: "Send me my loans summary by email"
Becky: send_email_report({ reportType: "loans_summary" })
```

**Configure automatic weekly reports:**
```
User: "I want to receive a weekly summary of my finances every Monday"
Becky: configure_email_reports({ 
  reportType: "weekly_summary", 
  frequency: "weekly" 
})
```

**View configured reports:**
```
User: "What automatic reports do I have set up?"
Becky: get_email_reports()
```

### Schedule

- **Daily reports**: 8:00 AM (every day)
- **Weekly reports**: 9:00 AM (Mondays)
- **Monthly reports**: 9:00 AM (1st day of month)

**Timezone**: America/Argentina/Buenos_Aires

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

### Email Testing

Use the `test_email` tool to verify your email configuration:

```bash
# From MCP chat interface
test_email()
```

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
- **Email Integration**: Automated report generation and delivery

### Tool Functions
- `get_monthly_expenses(month, category)` - Financial analysis
- `send_email_report(reportType)` - Email delivery
- `configure_email_reports(reportType, frequency)` - Report scheduling
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
✅ **Email Automation** - Scheduled reports with HTML templates  
✅ **Real-world Application** - Personal finance management with AI  

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
│   ├── index.ts              # Main server
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   │   ├── emailService.ts   # Email handling
│   │   ├── reportService.ts  # Report generation
│   │   └── schedulerService.ts # Cron jobs
│   └── middleware/           # Auth middleware
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts              # Sample data
└── package.json

mcp-server/
├── index.js                  # MCP server with email tools
└── package.json

nextjs-app/
├── src/
│   ├── app/                 # Next.js pages
│   └── components/          # React components
└── package.json
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and DATABASE_URL is correct
2. **Port Conflicts**: Check that ports 3000, 3001, 3002 are available
3. **Environment Variables**: Verify all required env vars are set
4. **Dependencies**: Run `npm install` in each project directory
5. **Email Issues**: 
   - Verify SMTP credentials
   - Use Gmail App Password (not regular password)
   - Check firewall/network restrictions
   - Use `test_email` tool for diagnostics

### Health Checks

- **API Server**: http://localhost:3001/
- **MCP Server**: http://localhost:3002/health
- **Next.js App**: http://localhost:3000

### Email Troubleshooting

**Gmail Setup:**
1. Enable 2-Factor Authentication
2. Generate App Password: Google Account → Security → App Passwords
3. Use App Password in `SMTP_PASS` environment variable

**Common Email Errors:**
- `Invalid login`: Check SMTP credentials
- `Connection refused`: Verify SMTP_HOST and SMTP_PORT
- `Authentication failed`: Use App Password for Gmail

## 📊 Database Schema

Key tables:
- `users` - User accounts and authentication
- `accounts` - Financial accounts (bank, cash, etc.)
- `movements` - Financial transactions and loans
- `contexts` - User conversation context
- `contacts` - Contact management for loans
- `email_reports` - Configured automatic email reports

## 🎨 Email Templates

Email reports feature:
- **Responsive HTML design**
- **Color-coded amounts** (green for positive, red for negative)
- **Professional styling** with Becky branding
- **Clear data presentation** with tables and summaries
- **Mobile-friendly** layout

---

**Becky** - Your AI Personal Bookkeeper 🤖💰

*With intelligent financial tracking, loan management, receipt processing, and automated email reporting*