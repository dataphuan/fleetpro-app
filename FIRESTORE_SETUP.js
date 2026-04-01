// 🔥 FIRESTORE SETUP: Create Tenant B + Sample Data
// 
// METHOD 1: Using Firebase Console (Easiest - 2 minutes)
// ======================================================
// 
// 1. Open: https://console.firebase.google.com/project/fleetpro-app/firestore/data
// 
// 2. Create collections as follows:
//
// STEP 1: Create Document: /tenants/internal-tenant-2
// ─────────────────────────────────────────────────────
// Collection: tenants
// Document ID: internal-tenant-2
// Fields:
// {
//   "name": "Tenant B - Production Test",
//   "status": "active",
//   "created_at": (use current timestamp),
//   "config": {
//     "max_vehicles": 50,
//     "max_users": 20,
//     "features": ["dispatch", "finance", "reports"]
//   },
//   "owner": "test@example.com"
// }
//
// STEP 2: Create Sample Data: /tenants/internal-tenant-2/vehicles/{docId}
// ────────────────────────────────────────────────────────────────────────
// Collection Path: tenants/internal-tenant-2/vehicles
// Add Document (auto ID):
// {
//   "name": "Test Vehicle B1",
//   "license_plate": "TEST-B001",
//   "status": "active",
//   "type": "truck"
// }
//
// STEP 3: Create Sample Data: /tenants/internal-tenant-2/trips/{docId}
// ──────────────────────────────────────────────────────────────────────
// Collection Path: tenants/internal-tenant-2/trips
// Add Document (auto ID):
// {
//   "trip_id": "TRIP-B-001",
//   "vehicle_id": "TEST-B001",
//   "status": "completed",
//   "created_at": (current timestamp),
//   "completed_at": (current timestamp)
// }
//
// METHOD 2: Using Firebase CLI (Advanced - if you have CLI)
// ==========================================================
//
// Command to run in terminal:
/*

# Save as firestore-setup.json
{
  "tenants/internal-tenant-2": {
    "name": "Tenant B - Production Test",
    "status": "active",
    "created_at": "2026-03-31T10:00:00Z",
    "config": {
      "max_vehicles": 50,
      "max_users": 20
    }
  },
  "tenants/internal-tenant-2/vehicles/vehicle-b-001": {
    "name": "Test Vehicle B1",
    "license_plate": "TEST-B001",
    "status": "active"
  },
  "tenants/internal-tenant-2/trips/trip-b-001": {
    "trip_id": "TRIP-B-001",
    "status": "completed"
  }
}

# Then run:
firebase firestore:delete --project=fleetpro-app --cli "tenants/internal-tenant-2" --yes
firebase firestore:set --project=fleetpro-app --doc="tenants/internal-tenant-2" --data='{"name":"Tenant B","status":"active"}'

*/
//
// TEST: Verify Setup
// ==================
// Run in Firestore Console's "Queries" section (at bottom right):
// 
// db.collection("tenants").doc("internal-tenant-2").get().then(doc => {
//   if (doc.exists) {
//     console.log("✅ Tenant B created successfully");
//     console.log(doc.data());
//   } else {
//     console.log("❌ Tenant B NOT found");
//   }
// });

console.log("✅ Firestore setup complete!");
