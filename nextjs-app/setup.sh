#!/bin/bash

# Becky Web App Setup Script
echo "🚀 Setting up Becky Web App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cat > .env.local << EOF
# API Server URL (default: http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001

# MCP Server URL (default: http://localhost:3002)
NEXT_PUBLIC_MCP_URL=http://localhost:3002
EOF
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi

# Check if API server is running
echo "🔍 Checking if API server is running..."
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ API server is running on http://localhost:3001"
else
    echo "⚠️  API server is not running on http://localhost:3001"
    echo "   Please start your API server first:"
    echo "   cd ../api-server && npm run dev"
fi

# Check if MCP server is running
echo "🔍 Checking if MCP server is running..."
if curl -s http://localhost:3002 > /dev/null; then
    echo "✅ MCP server is running on http://localhost:3002"
else
    echo "⚠️  MCP server is not running on http://localhost:3002"
    echo "   Please start your MCP server first:"
    echo "   cd ../mcp-server && npm run dev"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "The web app will be available at: http://localhost:3000"
echo ""
echo "Make sure your API server and MCP server are running:"
echo "  - API Server: http://localhost:3001"
echo "  - MCP Server: http://localhost:3002"
echo ""
echo "Happy coding! 🚀" 