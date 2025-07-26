import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'becky-mcp-server',
  })
})

export { router as healthRouter } 