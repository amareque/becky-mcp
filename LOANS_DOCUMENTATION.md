# 🏦 Manejo de Préstamos y Gastos Compartidos - Becky MCP

## 📋 Nuevas Funcionalidades Implementadas

### ✅ **1. Gestión de Contactos**
Para un mejor seguimiento de préstamos, ahora puedes gestionar contactos:

#### Herramientas MCP disponibles:
- `create_contact` - Crear nuevo contacto
- `get_contacts` - Ver todos los contactos

#### Ejemplos de uso:
```
"Crea un contacto para María García, su teléfono es +1234567890 y su email maria@example.com"

"Muéstrame todos mis contactos"
```

### ✅ **2. Gastos Compartidos**
Ideal para situaciones como: "Gasté $100 en fotocopias entre 5 personas"

#### Herramienta MCP:
- `create_shared_expense` - Crear gasto compartido

#### Lo que hace automáticamente:
1. **Calcula tu parte**: $100 ÷ 5 = $20
2. **Crea el gasto**: Registra $20 como tu gasto real
3. **Crea la deuda pendiente**: Registra $80 como dinero que te deben

#### Ejemplo de uso:
```
"Gasté $100 en fotocopias entre 5 personas el 2024-01-15, cuenta checking-account"
```

### ✅ **3. Préstamos Simples**
Para registrar dinero que prestaste o te prestaron.

#### Herramienta MCP:
- `create_simple_loan` - Crear préstamo simple

#### Tipos de préstamo:
- **"lent"** - Dinero que prestaste (te deben)
- **"borrowed"** - Dinero que te prestaron (debes)

#### Ejemplos de uso:
```
"Le presté $50 a Juan para el almuerzo ayer, cuenta checking-account"

"María me prestó $30 para el taxi el 2024-01-25, cuenta checking-account"
```

### ✅ **4. Seguimiento de Deudas**
Consulta todas tus deudas pendientes de una vez.

#### Herramienta MCP:
- `get_pending_loans` - Ver todas las deudas pendientes

#### Lo que muestra:
- **Dinero que te deben** (total)
- **Dinero que debes** (total)
- **Balance neto** (positivo = te deben, negativo = debes)
- **Lista detallada** de cada préstamo individual

#### Ejemplo de uso:
```
"Muéstrame todas mis deudas pendientes"

"¿Cuánto dinero me deben en total?"
```

### ✅ **5. Liquidación de Préstamos**
Marca préstamos como pagados (total o parcialmente).

#### Herramienta MCP:
- `settle_loan` - Liquidar préstamo

#### Funcionalidades:
- **Pago completo**: Marca el préstamo como liquidado
- **Pago parcial**: Actualiza el monto pendiente
- **Registro automático**: Crea el movimiento de cobro/pago

#### Ejemplo de uso:
```
"Juan me pagó los $50 que le presté" (con loan ID)

"María me pagó $20 de los $30 que me debe" (pago parcial)
```

## 📊 **Esquema de Base de Datos**

### Nuevos campos en `Movement`:
```sql
isLoan: Boolean              -- ¿Es un préstamo?
loanType: String            -- 'lent', 'borrowed', 'shared'
originalAmount: Float       -- Monto total (para gastos compartidos)
participants: Int           -- Número de personas involucradas
pendingAmount: Float        -- Monto pendiente por cobrar/pagar
relatedPeople: Json         -- Array de personas involucradas
loanStatus: String          -- 'active', 'settled'
relatedMovementId: String   -- ID del movimiento relacionado
```

### Nueva tabla `Contact`:
```sql
id: String
userId: String
name: String
phone: String?
email: String?
nickname: String?
notes: String?
```

## 🚀 **Nuevas Rutas API**

### Contactos:
- `GET /contacts` - Obtener contactos
- `POST /contacts` - Crear contacto
- `PATCH /contacts/:id` - Actualizar contacto

### Préstamos:
- `POST /loans/shared-expense` - Crear gasto compartido
- `POST /loans/simple-loan` - Crear préstamo simple
- `GET /loans/pending` - Obtener préstamos pendientes
- `PATCH /loans/:id/settle` - Liquidar préstamo

## 🎯 **Casos de Uso Reales**

### Escenario 1: Fotocopias entre amigos
```
Usuario: "Gasté $100 en fotocopias entre 5 personas"
Sistema: 
- Crea gasto de $20 (tu parte)
- Crea deuda pendiente de $80 (lo que te deben)
- Te permite rastrear quién te debe qué
```

### Escenario 2: Préstamo a un amigo
```
Usuario: "Le presté $50 a Juan para el almuerzo"
Sistema:
- Registra $50 como gasto (salió de tu cuenta)
- Marca como préstamo activo
- Juan te debe $50
```

### Escenario 3: Consulta de deudas
```
Usuario: "¿Cuánto dinero me deben?"
Sistema:
- Total que te deben: $130
- Total que debes: $30
- Balance neto: $100 (a tu favor)
- Lista detallada de cada deuda
```

## 📱 **Datos de Prueba Incluidos**

El sistema incluye datos de ejemplo:

### Contactos:
- María García (Compañera de trabajo)
- Juan Pérez (Amigo de la universidad)  
- Ana López (Vecina)

### Préstamos:
- Gasto compartido: $100 en fotocopias entre 5 personas
- Préstamo a Juan: $50 para almuerzo
- Préstamo de María: $30 para taxi

## 💡 **Consejos de Uso**

1. **Usa contactos**: Facilita el seguimiento de quién te debe qué
2. **Describe claramente**: Añade detalles que te ayuden a recordar
3. **Revisa regularmente**: Usa `get_pending_loans` para mantenerte al día
4. **Liquida prontamente**: Marca como pagado cuando recibas el dinero

## 🔄 **Próximos Pasos**

Esta implementación cubre completamente la primera funcionalidad solicitada. Estamos listos para proceder con las siguientes:

1. ✅ **Manejo de préstamos** - COMPLETADO
2. ⏳ **Procesamiento de imágenes** - Siguiente
3. ⏳ **Transcripción de voz** - Pendiente  
4. ⏳ **Viajes grupales** - Pendiente
5. ⏳ **Comparación de precios** - A investigar
