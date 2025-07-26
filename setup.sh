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

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

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

# Generate Prisma client
echo ""
echo "🔧 Setting up database..."
cd prisma
npm install
npx prisma generate
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with database and API keys"
echo "2. Run: npm run db:push (to create database tables)"
echo "3. Run: npm run db:seed (to add sample data)"
echo "4. Run: npm run dev (to start both servers)"
echo ""
echo "Default login: test@becky.com / password123" 