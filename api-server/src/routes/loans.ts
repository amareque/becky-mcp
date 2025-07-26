import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '../../prisma/generated'

const router = Router()
const prisma = new PrismaClient()

// Create shared expense (like "spent 100 pesos on photocopies for 5 people")
router.post('/shared-expense', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { 
      accountId, 
      totalAmount, 
      participants, 
      description, 
      date, 
      category,
      concept = 'others',
      participantsList
    } = req.body

    if (!accountId || !totalAmount || !participants || !description || !date) {
      return res.status(400).json({
        message: 'accountId, totalAmount, participants, description, and date are required',
      })
    }

    if (participants < 2) {
      return res.status(400).json({
        message: 'Participants must be at least 2',
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: { 
          id: accountId,
          userId: decoded.userId 
        },
      })

      if (!account) {
        return res.status(404).json({
          message: 'Account not found',
        })
      }

      // Calculate amounts
      const myShare = totalAmount / participants
      const pendingAmount = totalAmount - myShare

      // Create the expense movement (what I actually spent)
      const expenseMovement = await prisma.movement.create({
        data: {
          accountId,
          type: 'expense',
          concept,
          amount: myShare,
          description: `${description} (mi parte: ${myShare} de ${totalAmount} entre ${participants} personas)`,
          date: new Date(date),
          category,
          isLoan: true,
          loanType: 'shared',
          originalAmount: totalAmount,
          participants,
          pendingAmount,
          relatedPeople: participantsList || [],
          loanStatus: pendingAmount > 0 ? 'active' : 'settled',
        },
      })

      // Create the pending income movement (what others owe me)
      if (pendingAmount > 0) {
        const pendingIncomeMovement = await prisma.movement.create({
          data: {
            accountId,
            type: 'income',
            concept: 'others',
            amount: pendingAmount,
            description: `Pendiente por cobrar: ${description}`,
            date: new Date(date),
            category: 'pending_loan',
            isLoan: true,
            loanType: 'lent',
            originalAmount: totalAmount,
            participants,
            pendingAmount,
            relatedPeople: participantsList || [],
            loanStatus: 'active',
            relatedMovementId: expenseMovement.id,
          },
        })

        // Update the expense movement with the related movement ID
        await prisma.movement.update({
          where: { id: expenseMovement.id },
          data: { relatedMovementId: pendingIncomeMovement.id }
        })
      }

      res.json({
        message: 'Shared expense created successfully',
        expense: expenseMovement,
        summary: {
          totalAmount,
          myShare,
          pendingAmount,
          participants,
          description
        }
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Create shared expense error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// Create simple loan (I lent money to someone or someone lent to me)
router.post('/simple-loan', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { 
      accountId, 
      amount, 
      loanType, // 'lent' or 'borrowed'
      description, 
      date, 
      category = 'loan',
      relatedPerson
    } = req.body

    if (!accountId || !amount || !loanType || !description || !date) {
      return res.status(400).json({
        message: 'accountId, amount, loanType, description, and date are required',
      })
    }

    if (!['lent', 'borrowed'].includes(loanType)) {
      return res.status(400).json({
        message: 'loanType must be either "lent" or "borrowed"',
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: { 
          id: accountId,
          userId: decoded.userId 
        },
      })

      if (!account) {
        return res.status(404).json({
          message: 'Account not found',
        })
      }

      // Create the loan movement
      const movement = await prisma.movement.create({
        data: {
          accountId,
          type: loanType === 'lent' ? 'expense' : 'income', // If I lent, it's an expense. If borrowed, it's income
          concept: 'others',
          amount,
          description: `${loanType === 'lent' ? 'Presté' : 'Me prestaron'}: ${description}`,
          date: new Date(date),
          category,
          isLoan: true,
          loanType,
          originalAmount: amount,
          participants: 2, // just me and the other person
          pendingAmount: amount, // full amount is pending
          relatedPeople: relatedPerson ? [relatedPerson] : [],
          loanStatus: 'active',
        },
      })

      res.json({
        message: `${loanType === 'lent' ? 'Loan created' : 'Borrowed amount recorded'} successfully`,
        loan: movement,
        summary: {
          amount,
          loanType,
          description,
          relatedPerson
        }
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Create simple loan error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// Get all pending loans (money I lent or borrowed)
router.get('/pending', async (req: Request, res: Response) => {
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
      
      // Get all accounts for the user
      const userAccounts = await prisma.account.findMany({
        where: { userId: decoded.userId },
        select: { id: true }
      })

      const accountIds = userAccounts.map(account => account.id)

      if (accountIds.length === 0) {
        return res.json({
          loans: [],
          summary: {
            totalLent: 0,
            totalBorrowed: 0,
            netBalance: 0
          }
        })
      }

      const loans = await prisma.movement.findMany({
        where: { 
          accountId: { in: accountIds },
          isLoan: true,
          loanStatus: 'active'
        },
        orderBy: { date: 'desc' },
        include: {
          account: {
            select: {
              name: true
            }
          }
        }
      })

      // Calculate summary
      let totalLent = 0
      let totalBorrowed = 0

      loans.forEach(loan => {
        if (loan.loanType === 'lent' || loan.loanType === 'shared') {
          totalLent += loan.pendingAmount || 0
        } else if (loan.loanType === 'borrowed') {
          totalBorrowed += loan.pendingAmount || 0
        }
      })

      const netBalance = totalLent - totalBorrowed

      res.json({
        loans: loans,
        count: loans.length,
        summary: {
          totalLent,
          totalBorrowed,
          netBalance
        }
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Get pending loans error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

// Settle a loan (mark as paid)
router.patch('/:movementId/settle', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { movementId } = req.params
    const { amountPaid, description } = req.body

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Find loan and verify it belongs to user
      const loan = await prisma.movement.findFirst({
        where: { 
          id: movementId,
          account: {
            userId: decoded.userId
          },
          isLoan: true
        },
        include: {
          account: true
        }
      })

      if (!loan) {
        return res.status(404).json({
          message: 'Loan not found',
        })
      }

      const paidAmount = amountPaid || loan.pendingAmount || 0

      // Create a settlement movement
      const settlementMovement = await prisma.movement.create({
        data: {
          accountId: loan.accountId,
          type: loan.loanType === 'lent' ? 'income' : 'expense', // Opposite of original
          concept: 'others',
          amount: paidAmount,
          description: description || `Cobro/Pago de préstamo: ${loan.description}`,
          date: new Date(),
          category: 'loan_settlement',
          isLoan: false,
        },
      })

      // Update the original loan
      const newPendingAmount = (loan.pendingAmount || 0) - paidAmount
      const newStatus = newPendingAmount <= 0 ? 'settled' : 'active'

      await prisma.movement.update({
        where: { id: movementId },
        data: { 
          pendingAmount: newPendingAmount,
          loanStatus: newStatus
        }
      })

      // If there's a related movement (for shared expenses), update it too
      if (loan.relatedMovementId) {
        await prisma.movement.update({
          where: { id: loan.relatedMovementId },
          data: { 
            pendingAmount: newPendingAmount,
            loanStatus: newStatus
          }
        })
      }

      res.json({
        message: 'Loan settlement recorded successfully',
        settlement: settlementMovement,
        remainingAmount: newPendingAmount,
        status: newStatus
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Settle loan error:', error)
    res.status(500).json({
      message: 'Internal server error',
    })
  }
})

export { router as loansRouter }
