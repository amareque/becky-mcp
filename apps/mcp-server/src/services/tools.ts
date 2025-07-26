import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getMonthlyExpenses(
  userId: string,
  month: string,
  category: string
): Promise<any> {
  try {
    // Convert month name to date range
    const monthMap: { [key: string]: number } = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    }

    const monthNumber = monthMap[month.toLowerCase()]
    if (monthNumber === undefined) {
      throw new Error(`Invalid month: ${month}`)
    }

    const currentYear = new Date().getFullYear()
    const startDate = new Date(currentYear, monthNumber, 1)
    const endDate = new Date(currentYear, monthNumber + 1, 0)

    // Get user's accounts
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true },
    })

    const accountIds = accounts.map(account => account.id)

    // Query movements
    const movements = await prisma.movement.findMany({
      where: {
        accountId: { in: accountIds },
        type: 'expense',
        concept: category,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        description: true,
        date: true,
        category: true,
      },
    })

    const totalAmount = movements.reduce((sum, movement) => sum + movement.amount, 0)

    return {
      month,
      category,
      totalAmount,
      movementCount: movements.length,
      movements: movements.map(movement => ({
        amount: movement.amount,
        description: movement.description,
        date: movement.date,
        category: movement.category,
      })),
    }
  } catch (error) {
    console.error('Error getting monthly expenses:', error)
    throw error
  }
}

export async function getUserAccounts(userId: string): Promise<any> {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        bank: true,
        type: true,
        movements: {
          select: {
            amount: true,
            type: true,
            concept: true,
            description: true,
            date: true,
          },
          orderBy: { date: 'desc' },
          take: 10, // Last 10 movements
        },
      },
    })

    return accounts
  } catch (error) {
    console.error('Error getting user accounts:', error)
    throw error
  }
}

export async function getSavingsProgress(userId: string): Promise<any> {
  try {
    const context = await prisma.context.findUnique({
      where: { userId },
    })

    if (!context) {
      throw new Error('User context not found')
    }

    const savingsGoal = context.json.preferences?.savingsGoal || 0
    const accounts = await getUserAccounts(userId)

    // Calculate total savings (sum of all savings movements)
    let totalSavings = 0
    for (const account of accounts) {
      const savingsMovements = account.movements.filter(
        (movement: any) => movement.concept === 'savings'
      )
      totalSavings += savingsMovements.reduce(
        (sum: number, movement: any) => sum + movement.amount,
        0
      )
    }

    const progressPercentage = savingsGoal > 0 ? (totalSavings / savingsGoal) * 100 : 0

    return {
      currentSavings: totalSavings,
      savingsGoal,
      progressPercentage,
      remaining: Math.max(0, savingsGoal - totalSavings),
    }
  } catch (error) {
    console.error('Error getting savings progress:', error)
    throw error
  }
} 