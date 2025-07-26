#!/bin/bash

echo "🚀 Iniciando prueba del sistema de préstamos de Becky..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "api-server/package.json" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio raíz de becky-mcp"
    exit 1
fi

echo "📊 Paso 1: Actualizando la base de datos..."
cd api-server

# Generar el cliente Prisma con los nuevos campos
echo "   🔧 Generando cliente Prisma..."
npm run db:generate

# Aplicar cambios al esquema de la base de datos
echo "   📦 Aplicando cambios al esquema..."
npm run db:push

# Sembrar datos de prueba incluyendo préstamos
echo "   🌱 Sembrando datos de prueba..."
npm run db:seed

echo "✅ Base de datos actualizada correctamente!"
echo ""

echo "🖥️  Paso 2: Instrucciones para probar manualmente..."
echo ""
echo "Para probar el sistema, ejecuta en terminales separadas:"
echo ""
echo "Terminal 1 - API Server:"
echo "cd api-server && npm run dev"
echo ""
echo "Terminal 2 - MCP Server:"
echo "cd mcp-server && npm run dev"
echo ""
echo "Terminal 3 - Frontend (opcional):"
echo "cd nextjs-app && npm run dev"
echo ""
echo "🧪 Paso 3: Pruebas que puedes hacer..."
echo ""
echo "Una vez que los servidores estén corriendo, puedes probar:"
echo ""
echo "1. 📞 Gestión de Contactos:"
echo "   - 'Crea un contacto para Pedro Silva con teléfono +123456789'"
echo "   - 'Muéstrame todos mis contactos'"
echo ""
echo "2. 💰 Gastos Compartidos:"
echo "   - 'Gasté 100 pesos en pizza entre 4 personas ayer'"
echo "   - 'Compré materiales por 200 pesos, dividido entre 3 personas'"
echo ""
echo "3. 🏦 Préstamos Simples:"
echo "   - 'Le presté 50 pesos a Pedro para el bus'"
echo "   - 'María me prestó 75 pesos para el almuerzo'"
echo ""
echo "4. 📊 Consultar Deudas:"
echo "   - 'Muéstrame todas mis deudas pendientes'"
echo "   - '¿Cuánto dinero me deben en total?'"
echo ""
echo "5. ✅ Liquidar Préstamos:"
echo "   - 'Pedro me pagó los 50 pesos que le presté'"
echo "   - 'Le pagué 30 pesos a María de lo que le debo'"
echo ""
echo "📋 Datos de prueba disponibles:"
echo "- Usuario: test@becky.com / password123"
echo "- Cuentas: Main Checking, Savings Account"
echo "- Contactos: María García, Juan Pérez, Ana López"
echo "- Préstamos activos con ejemplos de gastos compartidos"
echo ""
echo "🎉 ¡Sistema listo para probar!"
