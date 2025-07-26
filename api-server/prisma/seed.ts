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

    // Create sample contacts
    const contacts = [
        {
            userId: user.id,
            name: 'María García',
            phone: '+1234567890',
            email: 'maria@example.com',
            nickname: 'Mari',
            notes: 'Compañera de trabajo'
        },
        {
            userId: user.id,
            name: 'Juan Pérez',
            phone: '+0987654321',
            nickname: 'Juancho',
            notes: 'Amigo de la universidad'
        },
        {
            userId: user.id,
            name: 'Ana López',
            email: 'ana.lopez@example.com',
            notes: 'Vecina'
        }
    ]

    for (const contact of contacts) {
        await prisma.contact.upsert({
            where: {
                id: `${contact.name.toLowerCase().replace(/\s+/g, '-')}-${user.id}`
            },
            update: {},
            create: {
                id: `${contact.name.toLowerCase().replace(/\s+/g, '-')}-${user.id}`,
                ...contact
            }
        })
    }

    console.log('✅ Created sample contacts')

    // Create sample loan movements
    const loanMovements = [
        // Shared expense example
        {
            accountId: checkingAccount.id,
            type: 'expense',
            concept: 'others',
            amount: 20, // My share of 100 split among 5 people
            description: 'Fotocopias (mi parte: 20 de 100 entre 5 personas)',
            date: new Date('2024-01-18'),
            category: 'office',
            isLoan: true,
            loanType: 'shared',
            originalAmount: 100,
            participants: 5,
            pendingAmount: 80,
            relatedPeople: ['María García', 'Juan Pérez', 'Ana López', 'Carlos Ruiz'],
            loanStatus: 'active'
        },
        // Pending income for the shared expense
        {
            accountId: checkingAccount.id,
            type: 'income',
            concept: 'others',
            amount: 80,
            description: 'Pendiente por cobrar: Fotocopias',
            date: new Date('2024-01-18'),
            category: 'pending_loan',
            isLoan: true,
            loanType: 'lent',
            originalAmount: 100,
            participants: 5,
            pendingAmount: 80,
            relatedPeople: ['María García', 'Juan Pérez', 'Ana López', 'Carlos Ruiz'],
            loanStatus: 'active'
        },
        // Simple loan - I lent money
        {
            accountId: checkingAccount.id,
            type: 'expense',
            concept: 'others',
            amount: 50,
            description: 'Presté: Dinero para almuerzo a Juan',
            date: new Date('2024-01-22'),
            category: 'loan',
            isLoan: true,
            loanType: 'lent',
            originalAmount: 50,
            participants: 2,
            pendingAmount: 50,
            relatedPeople: ['Juan Pérez'],
            loanStatus: 'active'
        },
        // Simple loan - Someone lent me money
        {
            accountId: checkingAccount.id,
            type: 'income',
            concept: 'others',
            amount: 30,
            description: 'Me prestaron: Dinero para taxi de María',
            date: new Date('2024-01-25'),
            category: 'loan',
            isLoan: true,
            loanType: 'borrowed',
            originalAmount: 30,
            participants: 2,
            pendingAmount: 30,
            relatedPeople: ['María García'],
            loanStatus: 'active'
        }
    ]

    for (const loanMovement of loanMovements) {
        await prisma.movement.upsert({
            where: {
                id: `${loanMovement.accountId}-${loanMovement.date.toISOString()}-${loanMovement.description}`
            },
            update: {},
            create: loanMovement
        })
    }

    console.log('✅ Created sample loan movements')

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