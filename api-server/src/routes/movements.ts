import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import {PrismaClient} from '../../prisma/generated'

const router = Router()
const prisma = new PrismaClient()

// Get account movements
router.get('/account/:accountId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { accountId } = req.params

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: { 
          id: accountId,
          userId: decoded.userId 
        },
      })

      if (!account) {
        return res.status(404).json({
          message: 'Account not found',
        })
      }

      const movements = await prisma.movement.findMany({
        where: { accountId },
        orderBy: { date: 'desc' },
      })

      res.json(movements)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Get movements error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// Create movement
router.post('/account/:accountId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { accountId } = req.params
    const { type, concept, amount, description, date, category } = req.body

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: { 
          id: accountId,
          userId: decoded.userId 
        },
      })

      if (!account) {
        return res.status(404).json({
          message: 'Account not found',
        })
      }

      const movement = await prisma.movement.create({
        data: {
          accountId,
          type,
          concept,
          amount,
          description,
          date: new Date(date),
          category,
        },
      })

      res.json(movement)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Create movement error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as movementsRouter } 