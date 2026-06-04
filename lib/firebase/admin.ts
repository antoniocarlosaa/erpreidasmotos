import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      // Corrige quebras de linha que possam vir formatadas incorretamente no .env
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("Firebase Admin inicializado com sucesso via Service Account.");
    } else {
      // Fallback para inicialização padrão do ambiente
      admin.initializeApp();
      console.log("Firebase Admin inicializado com credenciais padrão do ambiente.");
    }
  } catch (error) {
    console.error("Erro na inicialização do Firebase Admin:", error);
  }
}

const firestoreDb = admin.firestore();
try {
  firestoreDb.settings({ ignoreUndefinedProperties: true });
} catch (error) {
  // Ignora se já estiver inicializado
}
export const db = firestoreDb;
export const auth = admin.auth();
export { admin };
