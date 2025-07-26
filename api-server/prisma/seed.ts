import * as bcrypt from 'bcrypt'
import {PrismaClient} from './generated'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10)

    const user = await prisma.user.upsert({
        where: { email: 'test@becky.com' },
        update: {},
        create: {
            email: 'test@becky.com',
            password: hashedPassword,
            name: 'Test User',
        },
    })

    console.log('✅ Created user:', user.email)

    // Create accounts for the user
    const checkingAccount = await prisma.account.upsert({
        where: { id: 'checking-account' },
        update: {},
        create: {
            id: 'checking-account',
            userId: user.id,
            name: 'Main Checking',
            bank: 'Chase Bank',
            type: 'checking',
        },
    })

    const savingsAccount = await prisma.account.upsert({
        where: { id: 'savings-account' },
        update: {},
        create: {
            id: 'savings-account',
            userId: user.id,
            name: 'Savings Account',
            bank: 'Chase Bank',
            type: 'savings',
        },
    })

    console.log('✅ Created accounts')

    // Create sample movements
    const movements = [
        // Income
        {
            accountId: checkingAccount.id,
            type: 'income',
            concept: 'others',
            amount: 5000,
            description: 'Salary payment',
            date: new Date('2024-01-15'),
            category: 'salary',
        },
        {
            accountId: checkingAccount.id,
            type: 'income',
            concept: 'others',
            amount: 500,
            description: 'Freelance work',
            date: new Date('2024-01-20'),
            category: 'freelance',
        },
        // Expenses - Needs
        {
            accountId: checkingAccount.id,
            type: 'expense',
            concept: 'needs',
            amount: 1200,
            description: 'Rent payment',
            date: new Date('2024-01-01'),
            category: 'housing',
        },
        {
            accountId: checkingAccount.id,
            type: 'expense',
            concept: 'needs',
            amount: 300,
            description: 'Grocery shopping',
            date: new Date('2024-01-05'),
            category: 'food',
        },
        {
            accountId: checkingAccount.id,
            type: 'expense',
            concept: 'needs',
            amount: 150,
            description: 'Electricity bill',
            date: new Date('2024-01-10'),
            category: 'utilities',
        },
        // Expenses - Wants
        {
            accountId: checkingAccount.id,
            type: 'expense',
            concept: 'wants',
            amount: 80,
            description: 'Netflix subscription',
            date: new Date('2024-01-03'),
            category: 'entertainment',
        },
        {
            accountId: checkingAccount.id,
            type: 'expense',
            concept: 'wants',
            amount: 200,
            description: 'Restaurant dinner',
            date: new Date('2024-01-12'),
            category: 'dining',
        },
        // Savings
        {
            accountId: savingsAccount.id,
            type: 'expense',
            concept: 'savings',
            amount: 1000,
            description: 'Monthly savings transfer',
            date: new Date('2024-01-15'),
            category: 'savings',
        },
    ]

    for (const movement of movements) {
        await prisma.movement.upsert({
            where: {
                id: `${movement.accountId}-${movement.date.toISOString()}-${movement.description}`
            },
            update: {},
            create: movement,
        })
    }

    console.log('✅ Created movements')

    // Create initial context for the user
    await prisma.context.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            userId: user.id,
            json: {
                preferences: {
                    monthlyBudget: 3000,
                    savingsGoal: 5000,
                    categories: ['housing', 'food', 'utilities', 'entertainment', 'dining', 'savings'],
                },
                lastInteraction: new Date().toISOString(),
                conversationHistory: [],
            },
        },
    })

    console.log('✅ Created user context')

    console.log('🎉 Database seeded successfully!')
    console.log('📧 Login with: test@becky.com / password123')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })