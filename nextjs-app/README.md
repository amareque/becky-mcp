# Becky Web App

A modern Next.js web application for Becky, your AI-powered personal bookkeeper. This frontend provides a beautiful interface for managing your finances and chatting with Becky AI.

## Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- **Authentication**: Secure login/register system
- **Dashboard**: Financial overview with charts and summaries
- **Chat Interface**: AI-powered chat with Becky using your MCP server
- **Real-time Data**: Live financial data from your API server
- **Mobile Responsive**: Works perfectly on all devices

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Beautiful data visualizations
- **Lucide React**: Modern icon library
- **React Hook Form**: Form handling
- **Axios**: HTTP client
- **React Hot Toast**: Toast notifications

## Quick Start

### 1. Install Dependencies

```bash
cd nextjs-app
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the `nextjs-app` directory:

```env
# API Server URL (default: http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001

# MCP Server URL (default: http://localhost:3002)
NEXT_PUBLIC_MCP_URL=http://localhost:3002
```

### 3. Start Development Server

```bash
npm run dev
```

The web app will be available at `http://localhost:3000`

## Project Structure

```
nextjs-app/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Main page
│   ├── components/         # React components
│   │   ├── AuthProvider.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── Dashboard.tsx
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── lib/               # Utilities and API
│       └── api.ts         # API client
├── public/                # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## Components

### AuthProvider
Manages authentication state and provides login/register/logout functionality.

### Dashboard
Displays financial overview with:
- Summary cards (balance, income, expenses, accounts)
- Monthly income vs expenses chart
- Expense categories pie chart
- Account list

### ChatInterface
Provides a chat interface that communicates with your MCP server through the API server.

### LoginForm & RegisterForm
Beautiful authentication forms with validation and error handling.

## API Integration

The web app communicates with your existing services:

1. **API Server** (`http://localhost:3001`): For authentication, accounts, and movements
2. **MCP Server** (`http://localhost:3002`): For AI chat functionality

### API Endpoints Used

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /users/me` - Get current user
- `GET /accounts` - Get user accounts
- `POST /accounts` - Create account
- `GET /movements` - Get movements
- `POST /chat/becky` - Chat with Becky AI

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API server URL | `http://localhost:3001` |
| `NEXT_PUBLIC_MCP_URL` | MCP server URL | `http://localhost:3002` |

## Features in Detail

### Dashboard
- **Financial Summary**: Real-time balance, income, and expense totals
- **Interactive Charts**: Monthly overview and expense categories
- **Account Management**: View and manage your accounts
- **Responsive Design**: Works on desktop, tablet, and mobile

### Chat Interface
- **Real-time Chat**: Instant messaging with Becky AI
- **Message History**: Persistent conversation history
- **Loading States**: Visual feedback during AI processing
- **Error Handling**: Graceful error handling and retry

### Authentication
- **Secure Login**: Email/password authentication
- **User Registration**: New account creation
- **Session Management**: Automatic token handling
- **Protected Routes**: Secure access to authenticated features

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your API server has CORS enabled
2. **Connection Errors**: Verify API and MCP server URLs are correct
3. **Build Errors**: Check TypeScript types and dependencies
4. **Authentication Issues**: Verify JWT token handling

### Development Tips

1. **Hot Reload**: Changes are reflected immediately in development
2. **TypeScript**: Use TypeScript for better development experience
3. **Tailwind**: Use Tailwind classes for consistent styling
4. **Components**: Reuse components for consistent UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Becky AI Personal Bookkeeper system. 