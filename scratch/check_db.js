const admin = require("firebase-admin");
require("dotenv").config({ path: "../.env" });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing firebase env vars");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = admin.firestore();

async function run() {
  console.log("=== COMPANIES ===");
  const companies = await db.collection("companies").get();
  companies.docs.forEach(d => console.log(`Company ID: ${d.id}, Name: ${d.data().name}`));

  console.log("\n=== USERS ===");
  const users = await db.collection("users").get();
  users.docs.forEach(d => console.log(`User ID: ${d.id}, Email: ${d.data().email}, CompanyID: ${d.data().company_id}, Name: ${d.data().name}`));

  console.log("\n=== CLIENTS ===");
  const clients = await db.collection("clients").get();
  clients.docs.forEach(d => console.log(`Client ID: ${d.id}, Name: ${d.data().name}, CPF: ${d.data().cpf}`));

  console.log("\n=== VEHICLES ===");
  const vehicles = await db.collection("vehicles").get();
  vehicles.docs.forEach(d => console.log(`Vehicle ID: ${d.id}, Brand: ${d.data().brand}, Model: ${d.data().model}, Category: ${d.data().category}, Status: ${d.data().status}`));

  console.log("\n=== CONTRACTS ===");
  const contracts = await db.collection("contracts").get();
  contracts.docs.forEach(d => console.log(`Contract ID: ${d.id}, Num: ${d.data().contract_number}, CompanyID: ${d.data().company_id}, Status: ${d.data().status}, Total: ${d.data().total_value}, ClientID: ${d.data().client_id}, VehicleID: ${d.data().vehicle_id}`));

  console.log("\n=== FINANCIAL ENTRIES ===");
  const entries = await db.collection("financial_entries").get();
  entries.docs.forEach(d => console.log(`Entry ID: ${d.id}, Description: ${d.data().description}, Amount: ${d.data().amount}, Type: ${d.data().type}, CompanyID: ${d.data().company_id}`));

  console.log("\n=== WARRANTIES ===");
  const warranties = await db.collection("contract_warranties").get();
  warranties.docs.forEach(d => console.log(`Warranty ID: ${d.id}, ContractID: ${d.data().contract_id}, Status: ${d.data().status}`));

  console.log("\n=== REVISIONS ===");
  const reviews = await db.collection("contract_reviews").get();
  reviews.docs.forEach(d => {
    console.log(`Review ID: ${d.id}, ContractID: ${d.data().contract_id}`);
    if (d.data().revisions) {
      d.data().revisions.forEach(r => console.log(`  - Revision #${r.number}, status: ${r.status}, km: ${r.km_expected}`));
    }
  });
}

run().catch(console.error);
