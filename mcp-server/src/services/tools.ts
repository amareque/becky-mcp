import axios from 'axios'

const API_BASE_URL = process.env.API_SERVER_URL || 'http://localhost:3001'

/**
 * Get monthly expenses for a specific month and category
 */
export async function getMonthlyExpenses(userId: string, month: string, category: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}/movements/monthly`, {
      params: {
        userId,
        month,
        category,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error getting monthly expenses:', error)
    return {
      total: 0,
      count: 0,
      month,
      category,
      message: 'Unable to fetch monthly expenses',
    }
  }
}

/**
 * Create a new account for a user
 */
export async function createAccount(userId: string, accountData: {
  name: string
  bank?: string
  type?: string
}): Promise<any> {
  try {
    const response = await axios.post(`${API_BASE_URL}/accounts`, {
      userId,
      ...accountData,
    })
    return response.data
  } catch (error) {
    console.error('Error creating account:', error)
    throw new Error(`Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a new movement (income/expense) for an account
 */
export async function createMovement(accountId: string, movementData: {
  type: 'income' | 'expense'
  concept: 'needs' | 'wants' | 'savings' | 'others'
  amount: number
  description: string
  date: string
  category?: string
}): Promise<any> {
  try {
    const response = await axios.post(`${API_BASE_URL}/movements/account/${accountId}`, movementData)
    return response.data
  } catch (error) {
    console.error('Error creating movement:', error)
    throw new Error(`Failed to create movement: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get user accounts
 */
export async function getUserAccounts(userId: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}/accounts`, {
      params: { userId },
    })
    return response.data
  } catch (error) {
    console.error('Error getting user accounts:', error)
    return {
      accounts: [],
      message: 'Unable to fetch user accounts',
    }
  }
}

/**
 * Get account movements
 */
export async function getAccountMovements(accountId: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}/movements/account/${accountId}`)
    return response.data
  } catch (error) {
    console.error('Error getting account movements:', error)
    return {
      movements: [],
      message: 'Unable to fetch account movements',
    }
  }
}

/**
 * Get user financial summary
 */
export async function getUserFinancialSummary(userId: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}/users/${userId}/summary`)
    return response.data
  } catch (error) {
    console.error('Error getting financial summary:', error)
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      message: 'Unable to fetch financial summary',
    }
  }
}

/**
 * Get monthly spending by category
 */
export async function getMonthlySpendingByCategory(userId: string, month: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}/movements/monthly/categories`, {
      params: {
        userId,
        month,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error getting monthly spending by category:', error)
    return {
      categories: {},
      total: 0,
      month,
      message: 'Unable to fetch monthly spending by category',
    }
  }
}

/**
 * Get spending trends
 */
export async function getSpendingTrends(userId: string, months: number = 6): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}/movements/trends`, {
      params: {
        userId,
        months,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error getting spending trends:', error)
    return {
      trends: [],
      message: 'Unable to fetch spending trends',
    }
  }
}

/**
 * Validate account data
 */
export function validateAccountData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Account name is required')
  }

  if (data.name && data.name.length > 100) {
    errors.push('Account name must be less than 100 characters')
  }

  if (data.bank && typeof data.bank !== 'string') {
    errors.push('Bank must be a string')
  }

  if (data.type && !['checking', 'savings', 'cash', 'credit'].includes(data.type)) {
    errors.push('Account type must be one of: checking, savings, cash, credit')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate movement data
 */
export function validateMovementData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.push('Movement type must be either "income" or "expense"')
  }

  if (!data.concept || !['needs', 'wants', 'savings', 'others'].includes(data.concept)) {
    errors.push('Movement concept must be one of: needs, wants, savings, others')
  }

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('Amount must be a positive number')
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Description is required')
  }

  if (data.description && data.description.length > 500) {
    errors.push('Description must be less than 500 characters')
  }

  if (!data.date || isNaN(Date.parse(data.date))) {
    errors.push('Valid date is required')
  }

  if (data.category && typeof data.category !== 'string') {
    errors.push('Category must be a string')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
} 