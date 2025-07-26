import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      })

      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        )
      }

      const body = await request.json()
      const { message } = body

      if (!message) {
        return NextResponse.json(
          { message: 'Message is required' },
          { status: 400 }
        )
      }

      // Call MCP server
      const mcpResponse = await axios.post(
        `${process.env.MCP_SERVER_URL || 'http://localhost:3001'}/chat`,
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

      return NextResponse.json({
        response: mcpResponse.data.response,
      })
    } catch (jwtError) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Chat error:', error)
    
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { message: 'MCP server is not available. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 