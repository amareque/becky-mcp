import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { runBeckyLLM } from '../services/llm'
import { getMonthlyExpenses } from '../services/tools'

const router = Router()
const prisma = new PrismaClient()

const chatRequestSchema = z.object({
  userId: z.string(),
  message: z.string().min(1, 'Message is required'),
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, message } = chatRequestSchema.parse(req.body)

    // Get user context
    const context = await prisma.context.findUnique({
      where: { userId },
    })

    if (!context) {
      return res.status(404).json({
        error: 'User context not found',
      })
    }

    // Get user info for personalization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      })
    }

    // Prepare system prompt with context
    const systemPrompt = `You are Becky, an AI personal bookkeeper. You help users manage their finances by analyzing their spending patterns and providing insights.

User: ${user.name}
Current Context: ${JSON.stringify(context.json)}

Available Tools:
- get_monthly_expenses(month, category): Get total expenses for a specific month and category

Always be helpful, friendly, and provide actionable financial advice. When you need to get data, use the available tools.`

    // Run LLM with tools
    const response = await runBeckyLLM({
      systemPrompt,
      userMessage: message,
      context: context.json,
      tools: [
        {
          name: 'get_monthly_expenses',
          description: 'Get total expenses for a specific month and category',
          parameters: {
            type: 'object',
            properties: {
              month: {
                type: 'string',
                description: 'Month name (e.g., January, February)',
              },
              category: {
                type: 'string',
                description: 'Expense category (e.g., needs, wants, savings)',
              },
            },
            required: ['month', 'category'],
          },
        },
      ],
      toolFunctions: {
        get_monthly_expenses: async (params: any) => {
          return await getMonthlyExpenses(userId, params.month, params.category)
        },
      },
    })

    // Update context with conversation history
    const updatedContext = {
      ...context.json,
      lastInteraction: new Date().toISOString(),
      conversationHistory: [
        ...(context.json.conversationHistory || []),
        {
          timestamp: new Date().toISOString(),
          userMessage: message,
          beckyResponse: response,
        },
      ].slice(-10), // Keep last 10 interactions
    }

    await prisma.context.update({
      where: { userId },
      data: { json: updatedContext },
    })

    res.json({
      response,
      context: updatedContext,
    })
  } catch (error) {
    console.error('Chat error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      })
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export { router as chatRouter } 