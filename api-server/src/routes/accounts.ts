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
        orderBy: { createdAt: 'desc' },
      })

      res.json({
        accounts: accounts,
        count: accounts.length
      })
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
      const { name, bank, type, currency } = req.body

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          message: 'Account name is required',
        })
      }

      // Set default currency to UYU if not provided
      const accountCurrency = currency || 'UYU'

      const account = await prisma.account.create({
        data: {
          userId: decoded.userId,
          name,
          bank,
          type,
          currency: accountCurrency,
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

// Update account
router.patch('/:accountId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { accountId } = req.params
    const { name, bank, type, currency } = req.body

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify account belongs to user
      const existingAccount = await prisma.account.findFirst({
        where: { 
          id: accountId,
          userId: decoded.userId 
        },
      })

      if (!existingAccount) {
        return res.status(404).json({
          message: 'Account not found',
        })
      }

      // Only update provided fields
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (bank !== undefined) updateData.bank = bank
      if (type !== undefined) updateData.type = type
      if (currency !== undefined) updateData.currency = currency

      const account = await prisma.account.update({
        where: { id: accountId },
        data: updateData,
      })

      res.json(account)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Update account error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as accountsRouter } 