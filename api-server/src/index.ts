import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { accountsRouter } from './routes/accounts'
import { movementsRouter } from './routes/movements'
import { chatRouter } from './routes/chat'
import { contactsRouter } from './routes/contacts'
import { loansRouter } from './routes/loans'
import { receiptsRouter } from './routes/receipts'
import reportsRouter from './routes/reports'
import schedulerService from './services/schedulerService'

dotenv.config()

const app = express()
const PORT = process.env.API_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/accounts', accountsRouter)
app.use('/movements', movementsRouter)
app.use('/chat', chatRouter)
app.use('/contacts', contactsRouter)
app.use('/loans', loansRouter)
app.use('/receipts', receiptsRouter)
app.use('/reports', reportsRouter)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Becky API Server',
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

app.listen(PORT, async () => {
  console.log(`🚀 Becky API Server running on port ${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/`)
  
  // Inicializar scheduler de reportes automáticos
  try {
    await schedulerService.initializeScheduler()
  } catch (error) {
    console.error('❌ Error inicializando scheduler:', error)
  }
}) 