import express from 'express';
import { PrismaClient } from '@prisma/client';
import reportService from '../services/reportService';
import schedulerService from '../services/schedulerService';
import emailService from '../services/emailService';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// GET /reports - Obtener todos los reportes configurados del usuario
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const reports = await prisma.emailReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reports);
  } catch (error) {
    console.error('Error obteniendo reportes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /reports - Crear nuevo reporte programado
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { reportType, frequency, config } = req.body;

    // Validar tipos de reporte
    const validReportTypes = ['loans_summary', 'weekly_summary', 'debt_alert'];
    const validFrequencies = ['daily', 'weekly', 'monthly', 'immediate'];

    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Tipo de reporte inválido' });
    }

    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: 'Frecuencia inválida' });
    }

    const report = await schedulerService.createScheduledReport(
      userId,
      reportType,
      frequency,
      config
    );

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /reports/:id/toggle - Activar/desactivar reporte
router.put('/:id/toggle', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { isActive } = req.body;

    // Verificar que el reporte pertenece al usuario
    const report = await prisma.emailReport.findFirst({
      where: { id, userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const updatedReport = await schedulerService.toggleReportStatus(id, isActive);
    res.json(updatedReport);
  } catch (error) {
    console.error('Error actualizando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /reports/:id - Eliminar reporte
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Verificar que el reporte pertenece al usuario
    const report = await prisma.emailReport.findFirst({
      where: { id, userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    await schedulerService.deleteReport(id);
    res.json({ message: 'Reporte eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /reports/send-now - Enviar reporte inmediatamente
router.post('/send-now', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { reportType } = req.body;

    switch (reportType) {
      case 'loans_summary':
        await reportService.sendLoansReport(userId);
        break;
      case 'weekly_summary':
        await reportService.sendWeeklyReport(userId);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de reporte inválido' });
    }

    res.json({ message: 'Reporte enviado exitosamente' });
  } catch (error) {
    console.error('Error enviando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /reports/preview/:type - Vista previa del reporte
router.get('/preview/:type', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { type } = req.params;

    let data;
    switch (type) {
      case 'loans_summary':
        data = await reportService.generateLoansReport(userId);
        break;
      case 'weekly_summary':
        data = await reportService.generateWeeklyReport(userId);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de reporte inválido' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error generando vista previa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /reports/test-email - Probar configuración de email
router.post('/test-email', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const testHtml = `
    <h2>✅ Prueba de Email - Becky</h2>
    <p>Hola ${user.name},</p>
    <p>Este es un email de prueba para verificar que la configuración de correo está funcionando correctamente.</p>
    <p>Si recibes este mensaje, ¡todo está listo! 🎉</p>
    <hr>
    <p><em>Enviado desde Becky - Tu asistente de finanzas personales</em></p>
    `;

    await emailService.sendEmail(
      user.email,
      '✅ Prueba de Email - Becky',
      testHtml
    );

    res.json({ message: 'Email de prueba enviado exitosamente' });
  } catch (error) {
    console.error('Error enviando email de prueba:', error);
    res.status(500).json({ error: 'Error enviando email de prueba' });
  }
});

export default router;
