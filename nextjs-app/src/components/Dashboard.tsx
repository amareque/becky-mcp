'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Plus,
  RefreshCw,
  X,
  Eye
} from 'lucide-react'
import { accountsAPI, movementsAPI, Account, Movement } from '@/lib/api'
import toast from 'react-hot-toast'
import { AccountDetail } from './AccountDetail'

interface DashboardProps {
  className?: string
}

interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  accountCount: number
}

interface ChartData {
  name: string
  value: number
  color: string
}

interface CreateAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CreateMovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accounts: Account[]
}

export function Dashboard({ className = '' }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    accountCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false)
  const [showCreateMovementModal, setShowCreateMovementModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Debug authentication
      const token = localStorage.getItem('token')
      console.log('Dashboard fetch - Token exists:', !!token)
      console.log('Dashboard fetch - Token value:', token ? token.substring(0, 20) + '...' : 'none')
      
      const [accountsData, movementsData] = await Promise.all([
        accountsAPI.getAccounts(),
        movementsAPI.getMovements()
      ])

      setAccounts(accountsData.accounts || [])
      setMovements(movementsData.movements || [])

      // Calculate summary
      const totalIncome = movementsData.movements
        ?.filter((m: Movement) => m.type === 'income')
        .reduce((sum: number, m: Movement) => sum + m.amount, 0) || 0

      const totalExpenses = movementsData.movements
        ?.filter((m: Movement) => m.type === 'expense')
        .reduce((sum: number, m: Movement) => sum + m.amount, 0) || 0

      setSummary({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        accountCount: accountsData.accounts?.length || 0
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getConceptData = () => {
    const conceptMap = new Map<string, number>()
    
    movements
      .filter(m => m.type === 'expense' && m.concept)
      .forEach(m => {
        const current = conceptMap.get(m.concept!) || 0
        conceptMap.set(m.concept!, current + m.amount)
      })

    // Ensure all categories are present even if no data
    const categories = ['needs', 'wants', 'savings', 'others']
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    
    const chartData = categories.map((category, index) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: conceptMap.get(category) || 0,
      color: colors[index % colors.length]
    }))
    
    console.log('Chart data:', chartData)
    console.log('Movements for chart:', movements.filter(m => m.type === 'expense'))
    
    return chartData
  }

  const getMonthlyData = () => {
    const monthlyMap = new Map<string, { income: number; expenses: number }>()
    
    movements.forEach(m => {
      const date = new Date(m.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expenses: 0 })
      }
      
      const current = monthlyMap.get(monthKey)!
      if (m.type === 'income') {
        current.income += m.amount
      } else {
        current.expenses += m.amount
      }
    })

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: data.income,
        expenses: data.expenses
      }))
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  // Show account detail if an account is selected
  if (selectedAccount) {
    return (
      <AccountDetail
        account={selectedAccount}
        onBack={() => setSelectedAccount(null)}
        onRefresh={fetchData}
      />
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary.balance.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-success-600">
                ${summary.totalIncome.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-danger-600">
                ${summary.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accounts</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.accountCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expenses */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Monthly Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getMonthlyData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, '']} />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Categories - Now as Bar Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
          {getConceptData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getConceptData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, '']} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No expense data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Accounts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Your Accounts</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCreateMovementModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Movement
            </button>
            <button 
              onClick={() => setShowCreateAccountModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
        </div>
        
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{account.name}</h4>
                  <span className="text-xs text-gray-500">{account.type || 'Account'}</span>
                </div>
                {account.bank && (
                  <p className="text-sm text-gray-600 mb-2">{account.bank}</p>
                )}
                <p className="text-xs text-gray-500 mb-3">
                  Created {new Date(account.createdAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => setSelectedAccount(account)}
                  className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No accounts yet</p>
            <p className="text-sm">Create your first account to start tracking your finances.</p>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      <CreateAccountModal 
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onSuccess={() => {
          setShowCreateAccountModal(false)
          fetchData()
        }}
      />

      {/* Create Movement Modal */}
      <CreateMovementModal 
        isOpen={showCreateMovementModal}
        onClose={() => setShowCreateMovementModal(false)}
        onSuccess={() => {
          setShowCreateMovementModal(false)
          fetchData()
        }}
        accounts={accounts}
      />
    </div>
  )
}

// Create Account Modal Component
function CreateAccountModal({ isOpen, onClose, onSuccess }: CreateAccountModalProps) {
  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await accountsAPI.createAccount({
        name: name.trim(),
        bank: bank.trim() || undefined,
        type: type.trim() || undefined
      })
      toast.success('Account created successfully!')
      setName('')
      setBank('')
      setType('')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create New Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Main Checking"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank (Optional)
            </label>
            <input
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="input"
              placeholder="e.g., Chase Bank"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type (Optional)
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input"
            >
              <option value="">Select type</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit</option>
              <option value="investment">Investment</option>
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Create Movement Modal Component
function CreateMovementModal({ isOpen, onClose, onSuccess, accounts }: CreateMovementModalProps) {
  const [accountId, setAccountId] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [concept, setConcept] = useState<'needs' | 'wants' | 'savings' | 'others'>('needs')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  // Update concept when type changes
  useEffect(() => {
    if (type === 'income') {
      setConcept('others')
    } else {
      setConcept('needs')
    }
  }, [type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !amount || !description) return

    setLoading(true)
    try {
      const movementData = {
        accountId,
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        concept: type === 'expense' ? concept : 'others', // Always include concept
        date
      }
      
      console.log('Creating movement:', movementData)
      
      await movementsAPI.createMovement(movementData)
      toast.success('Movement created successfully!')
      setAccountId('')
      setType('expense')
      setAmount('')
      setDescription('')
      setConcept('needs')
      setDate(new Date().toISOString().split('T')[0])
      onSuccess()
    } catch (error: any) {
      console.error('Movement creation error:', error)
      toast.error(error.response?.data?.error || 'Failed to create movement')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Movement</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'income' | 'expense')}
              className="input"
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0.00"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="e.g., Grocery shopping"
              required
            />
          </div>
          
          {type === 'expense' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={concept}
                onChange={(e) => setConcept(e.target.value as 'needs' | 'wants' | 'savings' | 'others')}
                className="input"
                required
              >
                <option value="needs">Needs</option>
                <option value="wants">Wants</option>
                <option value="savings">Savings</option>
                <option value="others">Others</option>
              </select>
            </div>
          )}
          
          {type === 'income' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={concept}
                onChange={(e) => setConcept(e.target.value as 'needs' | 'wants' | 'savings' | 'others')}
                className="input"
                required
              >
                <option value="others">Income</option>
                <option value="savings">Savings</option>
                <option value="needs">Needs</option>
                <option value="wants">Wants</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !accountId || !amount || !description}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 