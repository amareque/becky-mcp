'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import { 
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react'
import { movementsAPI, Account, Movement } from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface AccountDetailProps {
  account: Account
  onBack: () => void
  onRefresh: () => void
}

interface AccountSummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  movementCount: number
  lastMovement?: Movement
}

interface ChartData {
  name: string
  value: number
  color: string
}

interface TimeSeriesData {
  date: string
  income: number
  expenses: number
  balance: number
}

export function AccountDetail({ account, onBack, onRefresh }: AccountDetailProps) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [summary, setSummary] = useState<AccountSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    movementCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddMovementModal, setShowAddMovementModal] = useState(false)

  const fetchAccountData = async () => {
    try {
      setLoading(true)
      const movementsData = await movementsAPI.getMovements(account.id, 100)
      
      setMovements(movementsData.movements || [])

      // Calculate summary
      const totalIncome = movementsData.movements
        ?.filter((m: Movement) => m.type === 'income')
        .reduce((sum: number, m: Movement) => sum + m.amount, 0) || 0

      const totalExpenses = movementsData.movements
        ?.filter((m: Movement) => m.type === 'expense')
        .reduce((sum: number, m: Movement) => sum + m.amount, 0) || 0

      const lastMovement = movementsData.movements?.[0]

      setSummary({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        movementCount: movementsData.movements?.length || 0,
        lastMovement
      })
    } catch (error) {
      console.error('Failed to fetch account data:', error)
      toast.error('Failed to load account data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccountData()
  }, [account.id])

  const getConceptData = (): ChartData[] => {
    const conceptMap = new Map<string, number>()
    
    movements
      .filter(m => m.type === 'expense' && m.concept)
      .forEach(m => {
        const current = conceptMap.get(m.concept!) || 0
        conceptMap.set(m.concept!, current + m.amount)
      })

    const categories = ['needs', 'wants', 'savings', 'others']
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    
    return categories.map((category, index) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: conceptMap.get(category) || 0,
      color: colors[index % colors.length]
    }))
  }

  const getTimeSeriesData = (): TimeSeriesData[] => {
    const dateMap = new Map<string, { income: number; expenses: number }>()
    
    movements.forEach(m => {
      const dateKey = format(new Date(m.date), 'yyyy-MM-dd')
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { income: 0, expenses: 0 })
      }
      
      const current = dateMap.get(dateKey)!
      if (m.type === 'income') {
        current.income += m.amount
      } else {
        current.expenses += m.amount
      }
    })

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: format(new Date(date), 'MMM dd'),
        income: data.income,
        expenses: data.expenses,
        balance: data.income - data.expenses
      }))
  }

  const handleMovementCreated = () => {
    setShowAddMovementModal(false)
    fetchAccountData()
    onRefresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading account details...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
            <p className="text-gray-500">
              {account.type && `${account.type} account`}
              {account.bank && ` • ${account.bank}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddMovementModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Movement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Balance</p>
              <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-gray-900' : 'text-danger-600'}`}>
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
              <p className="text-sm font-medium text-gray-600">Movements</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.movementCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Balance Over Time</h3>
          {getTimeSeriesData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getTimeSeriesData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, '']} />
                <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No movement data available</p>
            </div>
          )}
        </div>

        {/* Expense Categories */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
          {getConceptData().some(d => d.value > 0) ? (
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

      {/* Movements List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Movements</h3>
          <button
            onClick={fetchAccountData}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {movements.length > 0 ? (
          <div className="space-y-3">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    movement.type === 'income' 
                      ? 'bg-success-100 text-success-600' 
                      : 'bg-danger-100 text-danger-600'
                  }`}>
                    {movement.type === 'income' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{movement.description}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(movement.date), 'MMM dd, yyyy')}
                      {movement.concept && ` • ${movement.concept}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    movement.type === 'income' ? 'text-success-600' : 'text-danger-600'
                  }`}>
                    {movement.type === 'income' ? '+' : '-'}${movement.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No movements yet</p>
            <p className="text-sm">Add your first movement to start tracking this account.</p>
          </div>
        )}
      </div>

      {/* Add Movement Modal */}
      <CreateMovementModal 
        isOpen={showAddMovementModal}
        onClose={() => setShowAddMovementModal(false)}
        onSuccess={handleMovementCreated}
        accounts={[account]}
        preselectedAccountId={account.id}
      />
    </div>
  )
}

// Create Movement Modal Component (reused from Dashboard)
interface CreateMovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accounts: Account[]
  preselectedAccountId?: string
}

function CreateMovementModal({ isOpen, onClose, onSuccess, accounts, preselectedAccountId }: CreateMovementModalProps) {
  const [accountId, setAccountId] = useState(preselectedAccountId || '')
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

  // Set preselected account
  useEffect(() => {
    if (preselectedAccountId) {
      setAccountId(preselectedAccountId)
    }
  }, [preselectedAccountId])

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
        concept: type === 'expense' ? concept : 'others',
        date
      }
      
      console.log('Creating movement:', movementData)
      
      await movementsAPI.createMovement(movementData)
      toast.success('Movement created successfully!')
      setAccountId(preselectedAccountId || '')
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
            <span className="sr-only">Close</span>
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!preselectedAccountId && (
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
          )}
          
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