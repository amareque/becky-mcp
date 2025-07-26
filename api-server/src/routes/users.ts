import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import {PrismaClient} from '../../prisma/generated'


const router = Router()
const prisma = new PrismaClient()

// Get current user
router.get('/me', async (req: Request, res: Response) => {
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
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      })

      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        })
      }

      res.json(user)
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('User info error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as usersRouter } 