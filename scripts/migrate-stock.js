const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\\n/g, '\n');
    }
  });
}

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Uso: node scripts/migrate-stock.js <email> <senha>');
  process.exit(1);
}

const email = args[0];
const password = args[1];

// 1. Configurações da origem (estoque-loja)
const oldConfigPath = path.join(
  'C:',
  'Users',
  'REI DAS MOTOS SLZ',
  'Desktop',
  'PROJETOS DEV',
  'PROJETOS',
  'ESTOQUE',
  'estoque-loja',
  'firebase-applet-config.json'
);

if (!fs.existsSync(oldConfigPath)) {
  console.error('Arquivo de configuração do estoque antigo não encontrado em:', oldConfigPath);
  process.exit(1);
}

const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));

async function runMigration() {
  console.log('--- INICIANDO MIGRAÇÃO DO BANCO DE DADOS DE ESTOQUE ---');
  
  // 2. Inicializar o Firebase Admin (destino)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Erro: Credenciais do Firebase de destino não encontradas no arquivo .env.');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  const targetDb = admin.firestore();
  console.log('Conectado ao Firebase de destino (ERP):', projectId);

  // 3. Inicializar Firebase Client (origem)
  const oldApp = initializeApp(oldConfig, 'oldApp');
  const oldAuth = getAuth(oldApp);
  const oldDb = getFirestore(oldApp);
  console.log('Conectado ao Firebase de origem:', oldConfig.projectId);

  // Autenticar na origem
  console.log(`Autenticando usuário ${email} no Firebase de origem...`);
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(oldAuth, email, password);
    console.log('Autenticação bem-sucedida!');
  } catch (err) {
    console.error('Erro na autenticação do Firebase de origem:', err.message);
    process.exit(1);
  }

  // 4. Buscar o company_id correspondente no destino
  console.log('Buscando company_id do usuário no banco de destino...');
  let companyId = null;
  const userSnap = await targetDb.collection('users').where('email', '==', email).get();
  if (!userSnap.empty) {
    const userData = userSnap.docs[0].data();
    companyId = userData.company_id;
    console.log(`Encontrado usuário no ERP com Company ID: ${companyId}`);
  }

  if (!companyId) {
    console.log('Aviso: Usuário não cadastrado no ERP de destino. Procurando alguma empresa ativa...');
    const compSnap = await targetDb.collection('companies').limit(1).get();
    if (!compSnap.empty) {
      companyId = compSnap.docs[0].id;
      console.log(`Usando a empresa encontrada: ${compSnap.docs[0].data().name} (${companyId})`);
    } else {
      console.error('Erro: Nenhuma empresa/company cadastrada no banco de destino. Crie uma empresa no ERP primeiro.');
      process.exit(1);
    }
  }

  const collections = ['products', 'entries', 'exits', 'maintenances', 'appointments'];
  
  for (const collName of collections) {
    console.log(`\nProcessando coleção: ${collName}...`);
    try {
      const snap = await getDocs(collection(oldDb, collName));
      console.log(`Encontrados ${snap.size} documentos em ${collName}. Copiando...`);
      
      let copied = 0;
      // Usando lotes de gravação (batches) de 400 docs para segurança
      let batch = targetDb.batch();
      let count = 0;

      for (const docSnap of snap.docs) {
        const docId = docSnap.id;
        const docData = docSnap.data();

        // Limpa campos undefined para o Firestore do admin
        const cleanData = {};
        for (const [k, v] of Object.entries(docData)) {
          if (v !== undefined) {
            cleanData[k] = v;
          }
        }

        // Insere o company_id para isolamento multi-tenant
        cleanData.company_id = companyId;

        const docRef = targetDb.collection(collName).doc(docId);
        batch.set(docRef, cleanData, { merge: true });
        
        copied++;
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = targetDb.batch();
          count = 0;
          console.log(`Progresso: ${copied} documentos gravados em ${collName}...`);
        }
      }

      if (count > 0) {
        await batch.commit();
      }
      
      console.log(`Sucesso: ${copied} documentos migrados na coleção ${collName}.`);
    } catch (err) {
      console.error(`Erro ao migrar a coleção ${collName}:`, err);
    }
  }

  console.log('\n--- MIGRAÇÃO CONCLUÍDA COM SUCESSO! ---');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Erro geral durante a migração:', err);
  process.exit(1);
});
