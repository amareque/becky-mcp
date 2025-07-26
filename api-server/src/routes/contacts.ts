import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '../../prisma/generated'

const router = Router()
const prisma = new PrismaClient()

// Get all user contacts
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
      
      const contacts = await prisma.contact.findMany({
        where: { userId: decoded.userId },
        orderBy: { name: 'asc' }
      })

      res.json({
        contacts: contacts,
        count: contacts.length
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Get contacts error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// Create contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { name, phone, email, nickname, notes } = req.body

    if (!name) {
      return res.status(400).json({
        message: 'Name is required',
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      const contact = await prisma.contact.create({
        data: {
          userId: decoded.userId,
          name,
          phone,
          email,
          nickname,
          notes,
        },
      })

      res.json(contact)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Create contact error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as contactsRouter }
