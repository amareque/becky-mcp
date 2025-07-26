import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { runBeckyLLM, createTool } from '../services/llm'
import { 
  getMonthlyExpenses, 
  createAccount, 
  createMovement, 
  getUserAccounts,
  getAccountMovements,
  getUserFinancialSummary,
  getMonthlySpendingByCategory,
  getSpendingTrends,
  validateAccountData,
  validateMovementData
} from '../services/tools'

const router = Router()

const chatRequestSchema = z.object({
  userId: z.string(),
  message: z.string().min(1, 'Message is required'),
})

interface User {
  id: string
  name: string
  email: string
}

interface Context {
  id: string
  userId: string
  json: any
  lastUpdated: string
  conversationHistory?: Array<{
    timestamp: string
    userMessage: string
    beckyResponse: string
  }>
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, message } = chatRequestSchema.parse(req.body)

    // Get user context from API server
    const apiResponse = await fetch(`${process.env.API_SERVER_URL || 'http://localhost:3001'}/users/${userId}/context`)

    if (!apiResponse.ok) {
      return res.status(404).json({
        error: 'User context not found',
      })
    }

    const context = await apiResponse.json() as Context

    // Get user info for personalization
    const userResponse = await fetch(`${process.env.API_SERVER_URL || 'http://localhost:3001'}/users/${userId}`)

    if (!userResponse.ok) {
      return res.status(404).json({
        error: 'User not found',
      })
    }

    const user = await userResponse.json() as User

    // Define available tools
    const tools = [
      createTool('get_monthly_expenses', 'Get total expenses for a specific month and category', {
        month: {
          type: 'string',
          description: 'Month name (e.g., January, February)',
        },
        category: {
          type: 'string',
          description: 'Expense category (e.g., needs, wants, savings)',
        },
      }),
      createTool('create_account', 'Create a new account for the user', {
        name: {
          type: 'string',
          description: 'Account name (e.g., Main Checking, Savings)',
        },
        bank: {
          type: 'string',
          description: 'Bank name (optional)',
          required: false,
        },
        type: {
          type: 'string',
          description: 'Account type (checking, savings, cash, credit)',
          required: false,
        },
      }),
      createTool('create_movement', 'Create a new income or expense movement', {
        accountId: {
          type: 'string',
          description: 'Account ID to add the movement to',
        },
        type: {
          type: 'string',
          description: 'Movement type: income or expense',
        },
        concept: {
          type: 'string',
          description: 'Concept: needs, wants, savings, or others',
        },
        amount: {
          type: 'number',
          description: 'Amount in dollars',
        },
        description: {
          type: 'string',
          description: 'Description of the movement',
        },
        date: {
          type: 'string',
          description: 'Date in ISO format (YYYY-MM-DD)',
        },
        category: {
          type: 'string',
          description: 'Optional category',
          required: false,
        },
      }),
      createTool('get_user_accounts', 'Get all accounts for the user', {}),
      createTool('get_account_movements', 'Get movements for a specific account', {
        accountId: {
          type: 'string',
          description: 'Account ID to get movements for',
        },
      }),
      createTool('get_financial_summary', 'Get user financial summary', {}),
      createTool('get_monthly_spending_by_category', 'Get monthly spending breakdown by category', {
        month: {
          type: 'string',
          description: 'Month name (e.g., January, February)',
        },
      }),
      createTool('get_spending_trends', 'Get spending trends over the last few months', {
        months: {
          type: 'number',
          description: 'Number of months to analyze (default: 6)',
          required: false,
        },
      }),
    ]

    // Define tool functions
    const toolFunctions = {
      get_monthly_expenses: async (params: any) => {
        return await getMonthlyExpenses(userId, params.month, params.category)
      },
      create_account: async (params: any) => {
        const validation = validateAccountData(params)
        if (!validation.isValid) {
          return { error: 'Invalid account data', details: validation.errors }
        }
        return await createAccount(userId, params)
      },
      create_movement: async (params: any) => {
        const validation = validateMovementData(params)
        if (!validation.isValid) {
          return { error: 'Invalid movement data', details: validation.errors }
        }
        return await createMovement(params.accountId, params)
      },
      get_user_accounts: async () => {
        return await getUserAccounts(userId)
      },
      get_account_movements: async (params: any) => {
        return await getAccountMovements(params.accountId)
      },
      get_financial_summary: async () => {
        return await getUserFinancialSummary(userId)
      },
      get_monthly_spending_by_category: async (params: any) => {
        return await getMonthlySpendingByCategory(userId, params.month)
      },
      get_spending_trends: async (params: any) => {
        return await getSpendingTrends(userId, params.months || 6)
      },
    }

    // Prepare system prompt with context
    const systemPrompt = `You are Becky, an AI personal bookkeeper. You help users manage their finances by analyzing their spending patterns and providing insights.

User: ${user.name}
Current Context: ${JSON.stringify(context)}

Available Tools:
- get_monthly_expenses(month, category): Get total expenses for a specific month and category
- create_account(name, bank?, type?): Create a new account for the user
- create_movement(accountId, type, concept, amount, description, date, category?): Create a new income or expense movement
- get_user_accounts(): Get all accounts for the user
- get_account_movements(accountId): Get movements for a specific account
- get_financial_summary(): Get user financial summary
- get_monthly_spending_by_category(month): Get monthly spending breakdown by category
- get_spending_trends(months?): Get spending trends over the last few months

Always be helpful, friendly, and provide actionable financial advice. When you need to get data or perform actions, use the available tools. Be specific about amounts, dates, and categories when creating movements.`

    // Run LLM with tools
    const response = await runBeckyLLM({
      systemPrompt,
      userMessage: message,
      context,
      tools,
      toolFunctions,
    })

    // Update context with conversation history
    const updatedContext: Context = {
      ...context,
      lastUpdated: new Date().toISOString(),
      conversationHistory: [
        ...(context.conversationHistory || []),
        {
          timestamp: new Date().toISOString(),
          userMessage: message,
          beckyResponse: response,
        },
      ].slice(-10), // Keep last 10 interactions
    }

    // Update context in API server
    await fetch(`${process.env.API_SERVER_URL || 'http://localhost:3001'}/users/${userId}/context`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedContext),
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