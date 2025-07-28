import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import {PrismaClient} from '../../prisma/generated'

import axios from 'axios'

const router = Router()
const prisma = new PrismaClient()

// Chat bridge to MCP server
router.post('/becky', async (req: Request, res: Response) => {
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
      })

      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        })
      }

      const { message } = req.body

      if (!message) {
        return res.status(400).json({
          message: 'Message is required',
        })
      }

      // Call MCP server
      const mcpResponse = await axios.post(
        `${process.env.MCP_SERVER_URL || 'http://localhost:3002'}/chat`,
        {
          userId: user.id,
          message,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      )

      res.json({
        response: mcpResponse.data.response,
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error: any) {
    console.error('Chat error:', error)
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: 'MCP server is not available. Please try again later.',
      })
    }

    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as chatRouter } 