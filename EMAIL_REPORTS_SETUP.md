# 🚀 Instalación y Configuración de Email Reports

## 📧 Funcionalidades Agregadas

Se han implementado las siguientes funcionalidades para el envío de emails automáticos en Becky:

### 🔧 **Servicios Creados**
- **EmailService**: Manejo de envío de emails con Nodemailer
- **ReportService**: Generación de reportes HTML para emails  
- **SchedulerService**: Tareas programadas con node-cron

### 🛠️ **Nuevas Rutas API**
- `POST /reports/send-now` - Enviar reporte inmediatamente
- `POST /reports` - Configurar reporte automático  
- `GET /reports` - Ver reportes configurados
- `PUT /reports/:id/toggle` - Activar/desactivar reporte
- `DELETE /reports/:id` - Eliminar reporte
- `GET /reports/preview/:type` - Vista previa del reporte
- `POST /reports/test-email` - Probar configuración de email

### 🤖 **Nuevas Herramientas MCP**
- `send_email_report` - Enviar reporte por email ahora
- `configure_email_reports` - Configurar reportes automáticos
- `get_email_reports` - Ver reportes configurados
- `toggle_email_report` - Activar/desactivar reporte
- `test_email` - Probar configuración de email

## ⚙️ **Configuración Requerida**

### 1. Variables de Entorno (.env)

Agregar estas variables al archivo `.env`:

```env
# Email Configuration for Reports
# SMTP Settings (Gmail example)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # Use App Password for Gmail
SMTP_FROM="Becky <your-email@gmail.com>"
```

### 2. Configuración de Gmail App Password

Para usar Gmail:

1. Activar 2FA en tu cuenta Google
2. Ir a **Google Account Settings** > **Security** > **App Passwords**
3. Generar una App Password para "Mail"
4. Usar esa contraseña en `SMTP_PASS`

### 3. Base de Datos

El schema ya incluye la tabla `EmailReport`. Ejecutar:

```bash
cd api-server
npm run db:push
```

### 4. Instalar Dependencias

Las dependencias ya están en package.json:
- `nodemailer` - Envío de emails
- `node-cron` - Tareas programadas

## 🚀 **Uso**

### Desde MCP Tools (Chat)

```javascript
// Enviar reporte inmediatamente
await send_email_report({ reportType: "loans_summary" });

// Configurar reporte semanal automático
await configure_email_reports({ 
  reportType: "weekly_summary", 
  frequency: "weekly" 
});

// Ver reportes configurados
await get_email_reports();

// Probar email
await test_email();
```

### Desde API Rest

```bash
# Enviar reporte ahora
curl -X POST http://localhost:3001/reports/send-now \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reportType": "loans_summary"}'

# Configurar reporte automático
curl -X POST http://localhost:3001/reports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reportType": "weekly_summary", "frequency": "weekly"}'
```

## 📊 **Tipos de Reportes**

### 1. **Loans Summary** (`loans_summary`)
- Total prestado y adeudado
- Posición neta
- Lista de préstamos pendientes
- Disponible: diario, semanal, mensual

### 2. **Weekly Summary** (`weekly_summary`)  
- Resumen financiero de la semana
- Ingresos vs gastos
- Principales categorías de gasto
- Estado de préstamos
- Disponible: semanal

## ⏰ **Horarios de Envío**

- **Reportes Diarios**: 8:00 AM (todos los días)
- **Reportes Semanales**: 9:00 AM (lunes)
- **Reportes Mensuales**: 9:00 AM (primer día del mes)

**Zona Horaria**: America/Argentina/Buenos_Aires

## 🎨 **Plantillas de Email**

Los emails incluyen:
- HTML responsive con estilos CSS
- Colores diferenciados (verde/rojo para montos)
- Información estructurada y fácil de leer
- Branding de Becky 🤖

## 🛠️ **Troubleshooting**

### Error de SMTP
1. Verificar variables de entorno
2. Confirmar App Password de Gmail
3. Usar `test_email` para diagnosticar

### Reportes no se envían
1. Revisar logs del servidor
2. Confirmar que el scheduler está activo
3. Verificar que los reportes están marcados como `isActive: true`

### Base de datos
```bash
# Regenerar cliente Prisma
npm run db:generate

# Aplicar cambios al schema  
npm run db:push
```

## 🔄 **Comandos Útiles**

```bash
# Iniciar servidor con emails habilitados
cd api-server
npm run dev

# Ver logs de scheduler
# Los logs aparecen en la consola del servidor

# Probar conectividad SMTP
# Usar la herramienta test_email desde MCP
```

## ✨ **Ejemplos de Uso**

### Caso 1: Configurar reporte semanal de préstamos
```
Usuario: "Configura para que me envíes un resumen de mis préstamos cada semana"
Becky: configure_email_reports({ reportType: "loans_summary", frequency: "weekly" })
```

### Caso 2: Enviar reporte inmediato
```
Usuario: "Envíame un resumen de mi situación financiera ahora"
Becky: send_email_report({ reportType: "weekly_summary" })
```

### Caso 3: Ver reportes configurados
```
Usuario: "¿Qué reportes automáticos tengo configurados?"
Becky: get_email_reports()
```

¡Ahora Becky puede enviar reportes automáticos por email! 📧✨
