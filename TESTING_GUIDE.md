# 🧪 Guía de Prueba del Sistema de Préstamos

## 📋 Pasos para Probar

### Paso 1: Preparar la Base de Datos

Ejecuta estos comandos en orden:

```bash
# Desde el directorio raíz de becky-mcp
cd api-server

# 1. Generar cliente Prisma con nuevos campos
npm run db:generate

# 2. Aplicar cambios al esquema de BD
npm run db:push

# 3. Sembrar datos de prueba con préstamos
npm run db:seed
```

### Paso 2: Iniciar los Servidores

**Terminal 1 - API Server:**
```bash
cd api-server
npm run dev
```

**Terminal 2 - MCP Server:**
```bash
cd mcp-server
npm run dev
```

**Terminal 3 - Frontend (opcional):**
```bash
cd nextjs-app
npm run dev
```

### Paso 3: Probar con Claude/MCP

Una vez que los servidores estén corriendo, puedes hacer estas pruebas hablando naturalmente:

#### 🔐 **Login Inicial**
```
"Inicia sesión con test@becky.com y password123"
```

#### 📞 **Gestión de Contactos**
```
"Crea un contacto para Pedro Silva con teléfono +123456789 y email pedro@test.com"
"Muéstrame todos mis contactos"
```

#### 💰 **Gastos Compartidos**
```
"Gasté 120 pesos en pizza entre 4 personas ayer"
"Compré materiales por 200 pesos, dividido entre 3 personas el 2024-01-26"
```

#### 🏦 **Préstamos Simples**
```
"Le presté 75 pesos a Pedro para materiales universitarios"
"María me prestó 40 pesos para el almuerzo ayer"
```

#### 📊 **Consultar Deudas**
```
"Muéstrame todas mis deudas pendientes"
"¿Cuánto dinero me deben en total?"
"¿Cuál es mi balance neto de préstamos?"
```

#### ✅ **Liquidar Préstamos**
```
"Pedro me pagó 25 pesos de lo que le presté"
"Le pagué 20 pesos a María de lo que le debo"
```

### Paso 4: Verificar Datos de Prueba

El sistema incluye estos datos de ejemplo:

#### Contactos:
- María García (Compañera de trabajo)
- Juan Pérez (Amigo de la universidad)
- Ana López (Vecina)

#### Préstamos Activos:
- **Gasto compartido**: $100 fotocopias entre 5 personas (te deben $80)
- **Préstamo dado**: $50 a Juan para almuerzo
- **Préstamo recibido**: $30 de María para taxi

### Paso 5: Prueba de API Directa (Opcional)

Si quieres probar las APIs directamente:

```bash
# Desde el directorio raíz
node test-loans-api.js
```

## 🎯 **Resultados Esperados**

### Al consultar préstamos pendientes, deberías ver:
- **Total que te deben**: ~$130 (fotocopias + préstamo a Juan)
- **Total que debes**: ~$30 (préstamo de María)
- **Balance neto**: ~$100 (a tu favor)

### Al crear un gasto compartido de $120 entre 4 personas:
- Tu parte: $30
- Monto pendiente: $90
- Se crean 2 movimientos automáticamente

### Al liquidar un préstamo:
- Se registra el pago recibido/hecho
- Se actualiza el monto pendiente
- Se marca como "settled" si se paga completo

## ✅ **Funcionalidades Verificadas**

- [x] Login y autenticación
- [x] Crear y consultar contactos  
- [x] Gastos compartidos con cálculo automático
- [x] Préstamos simples (prestados y recibidos)
- [x] Consulta de préstamos pendientes con resumen
- [x] Liquidación parcial y total de préstamos
- [x] Persistencia en base de datos
- [x] Validaciones y manejo de errores

## 🚨 **Posibles Problemas**

1. **Error de conexión a BD**: Verificar que PostgreSQL esté corriendo en puerto 5434
2. **Error de autenticación**: Asegurar que JWT_SECRET esté configurado
3. **Error 404 en APIs**: Verificar que el servidor API esté en puerto 3001
4. **Error en MCP**: Verificar que el servidor MCP esté en puerto 3002

## 🎉 **¡Listo para Probar!**

El sistema está completamente funcional y listo para pruebas reales con casos de uso de préstamos y gastos compartidos.
