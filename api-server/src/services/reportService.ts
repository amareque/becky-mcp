import { PrismaClient } from '@prisma/client';
import emailService from './emailService';

const prisma = new PrismaClient();

interface LoanSummary {
  totalLent: number;
  totalBorrowed: number;
  netPosition: number;
  pendingLoans: any[];
}

interface WeeklySummary {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: any[];
  loans: LoanSummary;
}

class ReportService {
  async generateLoansReport(userId: string): Promise<LoanSummary> {
    const loans = await prisma.movement.findMany({
      where: {
        account: { userId },
        isLoan: true,
        loanStatus: 'active',
        pendingAmount: { gt: 0 }
      },
      include: {
        account: true
      }
    });

    const lentLoans = loans.filter(loan => loan.loanType === 'lent');
    const borrowedLoans = loans.filter(loan => loan.loanType === 'borrowed');

    const totalLent = lentLoans.reduce((sum, loan) => sum + (loan.pendingAmount || 0), 0);
    const totalBorrowed = borrowedLoans.reduce((sum, loan) => sum + (loan.pendingAmount || 0), 0);

    return {
      totalLent,
      totalBorrowed,
      netPosition: totalLent - totalBorrowed,
      pendingLoans: loans.map(loan => ({
        id: loan.id,
        description: loan.description,
        amount: loan.pendingAmount,
        type: loan.loanType,
        date: loan.date,
        relatedPeople: loan.relatedPeople
      }))
    };
  }

  async generateWeeklyReport(userId: string): Promise<WeeklySummary> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const movements = await prisma.movement.findMany({
      where: {
        account: { userId },
        date: { gte: oneWeekAgo },
        isLoan: false
      },
      include: {
        account: true
      }
    });

    const income = movements.filter(m => m.type === 'income');
    const expenses = movements.filter(m => m.type === 'expense');

    const totalIncome = income.reduce((sum, m) => sum + m.amount, 0);
    const totalExpenses = expenses.reduce((sum, m) => sum + m.amount, 0);

    // Top categories
    const categoryTotals = expenses.reduce((acc, movement) => {
      const category = movement.category || 'Sin categoría';
      acc[category] = (acc[category] || 0) + movement.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    const loans = await this.generateLoansReport(userId);

    const startDate = oneWeekAgo.toLocaleDateString('es-ES');
    const endDate = new Date().toLocaleDateString('es-ES');

    return {
      period: `${startDate} - ${endDate}`,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      topCategories,
      loans
    };
  }

  generateLoansEmailHtml(summary: LoanSummary, userName: string): string {
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
            .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .loan-item { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border: 1px solid #e2e8f0; }
            .amount-positive { color: #059669; font-weight: bold; }
            .amount-negative { color: #dc2626; font-weight: bold; }
            .amount-neutral { color: #6b7280; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Resumen de Préstamos</h1>
                <p>Hola ${userName}, aquí está tu resumen de deudas pendientes</p>
            </div>

            <div class="summary-card">
                <h3>💰 Resumen General</h3>
                <p><strong>Total prestado:</strong> <span class="amount-positive">${formatCurrency(summary.totalLent)}</span></p>
                <p><strong>Total adeudado:</strong> <span class="amount-negative">${formatCurrency(summary.totalBorrowed)}</span></p>
                <p><strong>Posición neta:</strong> 
                    <span class="${summary.netPosition >= 0 ? 'amount-positive' : 'amount-negative'}">
                        ${formatCurrency(summary.netPosition)}
                    </span>
                </p>
            </div>

            ${summary.pendingLoans.length > 0 ? `
            <div class="summary-card">
                <h3>📋 Préstamos Pendientes</h3>
                ${summary.pendingLoans.map(loan => `
                <div class="loan-item">
                    <p><strong>${loan.description}</strong></p>
                    <p>Tipo: ${loan.type === 'lent' ? '💸 Prestado' : '💳 Adeudado'}</p>
                    <p>Monto: <span class="${loan.type === 'lent' ? 'amount-positive' : 'amount-negative'}">${formatCurrency(loan.amount)}</span></p>
                    <p>Fecha: ${new Date(loan.date).toLocaleDateString('es-ES')}</p>
                    ${loan.relatedPeople ? `<p>Involucrados: ${JSON.stringify(loan.relatedPeople)}</p>` : ''}
                </div>
                `).join('')}
            </div>
            ` : '<div class="summary-card"><p>🎉 ¡No tienes préstamos pendientes!</p></div>'}

            <div class="footer">
                <p>Este reporte fue generado automáticamente por Becky 🤖</p>
                <p>Para más detalles, inicia sesión en tu cuenta</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateWeeklyEmailHtml(summary: WeeklySummary, userName: string): string {
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
            .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .amount-positive { color: #059669; font-weight: bold; }
            .amount-negative { color: #dc2626; font-weight: bold; }
            .category-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📈 Resumen Semanal</h1>
                <p>Hola ${userName}, aquí está tu resumen financiero</p>
                <p><em>${summary.period}</em></p>
            </div>

            <div class="summary-card">
                <h3>💰 Resumen Financiero</h3>
                <p><strong>Ingresos:</strong> <span class="amount-positive">${formatCurrency(summary.totalIncome)}</span></p>
                <p><strong>Gastos:</strong> <span class="amount-negative">${formatCurrency(summary.totalExpenses)}</span></p>
                <p><strong>Balance:</strong> 
                    <span class="${summary.balance >= 0 ? 'amount-positive' : 'amount-negative'}">
                        ${formatCurrency(summary.balance)}
                    </span>
                </p>
            </div>

            ${summary.topCategories.length > 0 ? `
            <div class="summary-card">
                <h3>🏷️ Principales Categorías de Gasto</h3>
                ${summary.topCategories.map(cat => `
                <div class="category-item">
                    <span>${cat.category}</span>
                    <span class="amount-negative">${formatCurrency(cat.amount)}</span>
                </div>
                `).join('')}
            </div>
            ` : ''}

            <div class="summary-card">
                <h3>💳 Estado de Préstamos</h3>
                <p><strong>Total prestado:</strong> <span class="amount-positive">${formatCurrency(summary.loans.totalLent)}</span></p>
                <p><strong>Total adeudado:</strong> <span class="amount-negative">${formatCurrency(summary.loans.totalBorrowed)}</span></p>
                <p><strong>Posición neta:</strong> 
                    <span class="${summary.loans.netPosition >= 0 ? 'amount-positive' : 'amount-negative'}">
                        ${formatCurrency(summary.loans.netPosition)}
                    </span>
                </p>
            </div>

            <div class="footer">
                <p>Este reporte fue generado automáticamente por Becky 🤖</p>
                <p>Para más detalles, inicia sesión en tu cuenta</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendLoansReport(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) throw new Error('Usuario no encontrado');

    const summary = await this.generateLoansReport(userId);
    const htmlContent = this.generateLoansEmailHtml(summary, user.name);

    await emailService.sendEmail(
      user.email,
      '📊 Resumen de Préstamos - Becky',
      htmlContent
    );
  }

  async sendWeeklyReport(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) throw new Error('Usuario no encontrado');

    const summary = await this.generateWeeklyReport(userId);
    const htmlContent = this.generateWeeklyEmailHtml(summary, user.name);

    await emailService.sendEmail(
      user.email,
      '📈 Resumen Semanal - Becky',
      htmlContent
    );
  }
}

export default new ReportService();
