#!/bin/bash

echo "🚀 Setting up Becky - AI Personal Bookkeeper"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   - DATABASE_URL: Your PostgreSQL connection string"
    echo "   - JWT_SECRET: A secure random string"
    echo "   - ANTHROPIC_API_KEY or OPENAI_API_KEY: Your LLM API key"
    echo ""
    echo "Press Enter when you've configured .env..."
    read
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔧 Setting up API Server..."
cd api-server
npm install
npx prisma generate
echo "✅ API Server dependencies installed"

echo ""
echo "🔧 Setting up MCP Server..."
cd ../mcp-server
npm install
echo "✅ MCP Server dependencies installed"

echo ""
echo "🔧 Setting up Next.js App..."
cd ../nextjs-app
npm install
echo "✅ Next.js App dependencies installed"

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with database and API keys"
echo "2. Start the API Server: cd api-server && npm run db:push && npm run db:seed && npm run dev"
echo "3. Start the MCP Server: cd mcp-server && npm run dev"
echo "4. Start the Next.js App: cd nextjs-app && npm run dev"
echo ""
echo "Default login: test@becky.com / password123"
echo ""
echo "Access points:"
echo "- Frontend: http://localhost:3000"
echo "- API Server: http://localhost:3001"
echo "- MCP Server: http://localhost:3002" 