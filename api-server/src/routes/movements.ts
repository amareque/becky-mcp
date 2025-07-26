import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import {PrismaClient} from '../../prisma/generated'

const router = Router()
const prisma = new PrismaClient()

// Get all user movements
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const limit = parseInt(req.query.limit as string) || 20

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Get all accounts for the user
      const userAccounts = await prisma.account.findMany({
        where: { userId: decoded.userId },
        select: { id: true }
      })

      const accountIds = userAccounts.map(account => account.id)

      if (accountIds.length === 0) {
        return res.json({
          movements: [],
          count: 0
        })
      }

      const movements = await prisma.movement.findMany({
        where: { 
          accountId: { in: accountIds }
        },
        orderBy: { date: 'desc' },
        take: limit,
        include: {
          account: {
            select: {
              name: true
            }
          }
        }
      })

      res.json({
        movements: movements,
        count: movements.length
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Get user movements error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

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
    const limit = parseInt(req.query.limit as string) || 20

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
        take: limit,
        include: {
          account: {
            select: {
              name: true
            }
          }
        }
      })

      res.json({
        movements: movements,
        count: movements.length
      })
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

// Update movement
router.patch('/:movementId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { movementId } = req.params
    const { type, concept, amount, description, date, category } = req.body

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Find movement and verify it belongs to user
      const existingMovement = await prisma.movement.findFirst({
        where: { 
          id: movementId,
          account: {
            userId: decoded.userId
          }
        },
        include: {
          account: true
        }
      })

      if (!existingMovement) {
        return res.status(404).json({
          message: 'Movement not found',
        })
      }

      // Only update provided fields
      const updateData: any = {}
      if (type !== undefined) updateData.type = type
      if (concept !== undefined) updateData.concept = concept
      if (amount !== undefined) updateData.amount = amount
      if (description !== undefined) updateData.description = description
      if (date !== undefined) updateData.date = new Date(date)
      if (category !== undefined) updateData.category = category

      const movement = await prisma.movement.update({
        where: { id: movementId },
        data: updateData,
      })

      res.json(movement)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Update movement error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// Delete movement
router.delete('/:movementId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { movementId } = req.params

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Find movement and verify it belongs to user
      const existingMovement = await prisma.movement.findFirst({
        where: { 
          id: movementId,
          account: {
            userId: decoded.userId
          }
        },
        include: {
          account: true
        }
      })

      if (!existingMovement) {
        return res.status(404).json({
          message: 'Movement not found',
        })
      }

      // Delete the movement
      await prisma.movement.delete({
        where: { id: movementId },
      })

      res.json({
        message: 'Movement deleted successfully',
        deletedMovement: {
          id: existingMovement.id,
          type: existingMovement.type,
          amount: existingMovement.amount,
          description: existingMovement.description,
          accountName: existingMovement.account.name
        }
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Delete movement error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as movementsRouter } 