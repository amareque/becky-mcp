import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import {PrismaClient} from '../../prisma/generated'

import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

// Get user accounts
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      const accounts = await prisma.account.findMany({
        where: { userId: decoded.userId },
        include: {
          movements: {
            orderBy: { date: 'desc' },
            take: 10,
          },
        },
      })

      res.json(accounts)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Get accounts error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// Create account
router.post('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      const { name, bank, type } = req.body

      const account = await prisma.account.create({
        data: {
          userId: decoded.userId,
          name,
          bank,
          type,
        },
      })

      res.json(account)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Create account error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as accountsRouter } 