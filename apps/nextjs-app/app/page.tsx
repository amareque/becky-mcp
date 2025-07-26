import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Becky
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-powered personal bookkeeper
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Track expenses, analyze spending patterns, and get intelligent insights 
            about your finances through natural conversation.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link 
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link 
              href="/register"
              className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg border-2 border-blue-600 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Smart Expense Tracking</h3>
            <p className="text-gray-600">
              Connect your accounts and let Becky automatically categorize and track your expenses.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Ask Becky questions about your spending and get intelligent, personalized responses.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Financial Goals</h3>
            <p className="text-gray-600">
              Set savings goals and let Becky help you stay on track with your financial objectives.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 