import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import reportService from './reportService';

const prisma = new PrismaClient();

class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  async initializeScheduler() {
    console.log('🕐 Inicializando programador de tareas...');
    
    // Ejecutar todos los lunes a las 9:00 AM para reportes semanales
    const weeklyJob = cron.schedule('0 9 * * MON', async () => {
      await this.processWeeklyReports();
    }, {
      scheduled: false,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    // Ejecutar todos los días a las 8:00 AM para reportes diarios
    const dailyJob = cron.schedule('0 8 * * *', async () => {
      await this.processDailyReports();
    }, {
      scheduled: false,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    this.jobs.set('weekly', weeklyJob);
    this.jobs.set('daily', dailyJob);

    // Iniciar trabajos
    weeklyJob.start();
    dailyJob.start();

    console.log('✅ Programador de tareas iniciado');
  }

  private async processWeeklyReports() {
    console.log('📅 Procesando reportes semanales...');
    
    const activeReports = await prisma.emailReport.findMany({
      where: {
        isActive: true,
        frequency: 'weekly'
      },
      include: {
        user: true
      }
    });

    for (const report of activeReports) {
      try {
        if (report.reportType === 'weekly_summary') {
          await reportService.sendWeeklyReport(report.userId);
        } else if (report.reportType === 'loans_summary') {
          await reportService.sendLoansReport(report.userId);
        }

        // Actualizar fecha de último envío
        await prisma.emailReport.update({
          where: { id: report.id },
          data: {
            lastSent: new Date(),
            nextSend: this.calculateNextSend('weekly')
          }
        });

        console.log(`✅ Reporte enviado a ${report.user.email}`);
      } catch (error) {
        console.error(`❌ Error enviando reporte a ${report.user.email}:`, error);
      }
    }
  }

  private async processDailyReports() {
    console.log('📅 Procesando reportes diarios...');
    
    const activeReports = await prisma.emailReport.findMany({
      where: {
        isActive: true,
        frequency: 'daily'
      },
      include: {
        user: true
      }
    });

    for (const report of activeReports) {
      try {
        if (report.reportType === 'loans_summary') {
          await reportService.sendLoansReport(report.userId);
        }

        await prisma.emailReport.update({
          where: { id: report.id },
          data: {
            lastSent: new Date(),
            nextSend: this.calculateNextSend('daily')
          }
        });

        console.log(`✅ Reporte diario enviado a ${report.user.email}`);
      } catch (error) {
        console.error(`❌ Error enviando reporte diario a ${report.user.email}:`, error);
      }
    }
  }

  private calculateNextSend(frequency: string): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      default:
        now.setDate(now.getDate() + 1);
    }
    
    return now;
  }

  async createScheduledReport(userId: string, reportType: string, frequency: string, config?: any) {
    const nextSend = this.calculateNextSend(frequency);
    
    return await prisma.emailReport.create({
      data: {
        userId,
        reportType,
        frequency,
        isActive: true,
        nextSend,
        config: config || {}
      }
    });
  }

  async toggleReportStatus(reportId: string, isActive: boolean) {
    return await prisma.emailReport.update({
      where: { id: reportId },
      data: { isActive }
    });
  }

  async deleteReport(reportId: string) {
    return await prisma.emailReport.delete({
      where: { id: reportId }
    });
  }

  stopAllJobs() {
    this.jobs.forEach((job) => {
      job.stop();
    });
    console.log('🛑 Todos los trabajos programados detenidos');
  }
}

export default new SchedulerService();
