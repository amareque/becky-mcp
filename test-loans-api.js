const axios = require('axios');

const API_BASE = 'http://localhost:3001';
let authToken = '';
let userId = '';
let accountId = '';

// Helper function to make authenticated requests
const apiCall = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
    };
    
    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

async function runTests() {
  console.log('🧪 Iniciando pruebas del sistema de préstamos...\n');

  try {
    // 1. Login
    console.log('1. 🔐 Probando login...');
    const loginResponse = await apiCall('POST', '/auth/login', {
      email: 'test@becky.com',
      password: 'password123'
    });
    authToken = loginResponse.token;
    userId = loginResponse.user.id;
    console.log(`✅ Login exitoso. Usuario: ${loginResponse.user.name}\n`);

    // 2. Get accounts
    console.log('2. 🏦 Obteniendo cuentas...');
    const accountsResponse = await apiCall('GET', '/accounts');
    accountId = accountsResponse.accounts[0].id;
    console.log(`✅ Cuentas obtenidas. Usando cuenta: ${accountsResponse.accounts[0].name}\n`);

    // 3. Test contacts
    console.log('3. 📞 Probando gestión de contactos...');
    
    // Create contact
    const contactResponse = await apiCall('POST', '/contacts', {
      name: 'Pedro Silva',
      phone: '+123456789',
      email: 'pedro@test.com',
      nickname: 'Pedrito',
      notes: 'Amigo de prueba'
    });
    console.log(`✅ Contacto creado: ${contactResponse.name}`);

    // Get contacts
    const contactsResponse = await apiCall('GET', '/contacts');
    console.log(`✅ Contactos obtenidos: ${contactsResponse.contacts.length} contactos\n`);

    // 4. Test shared expense
    console.log('4. 💰 Probando gasto compartido...');
    const sharedExpenseResponse = await apiCall('POST', '/loans/shared-expense', {
      accountId: accountId,
      totalAmount: 120,
      participants: 4,
      description: 'Pizza para el grupo de estudio',
      date: '2024-01-26',
      category: 'food',
      concept: 'wants',
      participantsList: ['Pedro Silva', 'Ana García', 'Luis Martín']
    });
    console.log(`✅ Gasto compartido creado. Tu parte: $${sharedExpenseResponse.summary.myShare}, Te deben: $${sharedExpenseResponse.summary.pendingAmount}\n`);

    // 5. Test simple loan - lent
    console.log('5. 🏦 Probando préstamo simple (presté dinero)...');
    const loanLentResponse = await apiCall('POST', '/loans/simple-loan', {
      accountId: accountId,
      amount: 75,
      loanType: 'lent',
      description: 'Dinero para materiales universitarios',
      date: '2024-01-26',
      relatedPerson: 'Pedro Silva'
    });
    console.log(`✅ Préstamo registrado: Prestaste $75 a Pedro Silva\n`);

    // 6. Test simple loan - borrowed
    console.log('6. 💸 Probando préstamo simple (me prestaron dinero)...');
    const loanBorrowedResponse = await apiCall('POST', '/loans/simple-loan', {
      accountId: accountId,
      amount: 40,
      loanType: 'borrowed',
      description: 'Dinero para el almuerzo',
      date: '2024-01-26',
      relatedPerson: 'Ana García'
    });
    console.log(`✅ Préstamo registrado: Ana García te prestó $40\n`);

    // 7. Get pending loans
    console.log('7. 📊 Probando consulta de préstamos pendientes...');
    const pendingLoansResponse = await apiCall('GET', '/loans/pending');
    console.log(`✅ Préstamos pendientes obtenidos:`);
    console.log(`   - Total que te deben: $${pendingLoansResponse.summary.totalLent}`);
    console.log(`   - Total que debes: $${pendingLoansResponse.summary.totalBorrowed}`);
    console.log(`   - Balance neto: $${pendingLoansResponse.summary.netBalance}`);
    console.log(`   - Préstamos activos: ${pendingLoansResponse.loans.length}\n`);

    // 8. Test loan settlement
    console.log('8. ✅ Probando liquidación de préstamo...');
    // Get the first active loan to settle
    const loanToSettle = pendingLoansResponse.loans.find(loan => loan.loanType === 'lent');
    if (loanToSettle) {
      const settlementResponse = await apiCall('PATCH', `/loans/${loanToSettle.id}/settle`, {
        amountPaid: 25,
        description: 'Pago parcial recibido'
      });
      console.log(`✅ Préstamo liquidado parcialmente. Estado: ${settlementResponse.status}, Restante: $${settlementResponse.remainingAmount}\n`);
    }

    // 9. Final verification
    console.log('9. 🔍 Verificación final...');
    const finalLoansResponse = await apiCall('GET', '/loans/pending');
    console.log(`✅ Estado final:`);
    console.log(`   - Total que te deben: $${finalLoansResponse.summary.totalLent}`);
    console.log(`   - Total que debes: $${finalLoansResponse.summary.totalBorrowed}`);
    console.log(`   - Balance neto: $${finalLoansResponse.summary.netBalance}`);
    console.log(`   - Préstamos activos: ${finalLoansResponse.loans.length}\n`);

    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📋 Resumen de funcionalidades probadas:');
    console.log('✅ Gestión de contactos');
    console.log('✅ Gastos compartidos');
    console.log('✅ Préstamos simples (prestados y recibidos)');
    console.log('✅ Consulta de préstamos pendientes');
    console.log('✅ Liquidación de préstamos');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
    process.exit(1);
  }
}

// Check if API server is running
console.log('🔍 Verificando que el servidor API esté ejecutándose en http://localhost:3001...\n');

axios.get(`${API_BASE}/`)
  .then(() => {
    console.log('✅ Servidor API encontrado. Iniciando pruebas...\n');
    runTests();
  })
  .catch(() => {
    console.error('❌ Error: El servidor API no está ejecutándose en http://localhost:3001');
    console.log('💡 Asegúrate de ejecutar: cd api-server && npm run dev');
    process.exit(1);
  });
