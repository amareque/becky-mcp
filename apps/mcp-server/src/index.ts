import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { chatRouter } from './routes/chat'
import { healthRouter } from './routes/health'

dotenv.config({ path: '../../.env' })

const app = express()
const PORT = process.env.MCP_SERVER_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/chat', chatRouter)
app.use('/health', healthRouter)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Becky MCP Server',
    version: '1.0.0',
    status: 'running',
  })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Becky MCP Server running on port ${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/health`)
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`)
}) 