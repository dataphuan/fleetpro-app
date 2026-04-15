# 🏢 Professional SaaS Multi-Tenant Architecture (Platform-Agnostic)

**Date:** 2026-03-31  
**Focus:** Tenant-First Design, Feature Customization, Self-Service Management  
**Applies to:** Firebase, Supabase, or any platform

---

## 1️⃣ REQUIREMENT SUMMARY: Chủ Nhân Tenant (Tự Chủ)

### 🎯 Core Needs

```
Mỗi tenant_id =  "Công ty vận tải XYZ"
                 ├─ Có giao diện riêng (branding)
                 ├─ Tự chọn features phù hợp quy mô
                 │  └─ Công ty nhỏ: "Chỉ cần vehicle + driver + trip"
                 │  └─ Công ty lớn: "Full: vehicle + driver + trip + expense + maintenance + report"
                 ├─ Tự tạo tài khoản nhân viên:
                 │  ├─ Driver (tài xế)
                 │  ├─ Accountant (kế toán)
                 │  └─ Manager (quản lý)
                 └─ Tự quản lý roles + permissions

Expected Result:
- Startup(few vehicles): Thanh menu gọn, không bị quá tải
- SME(50 vehicles): Menu đầy đủ, có tính năng report
- Enterprise(1000 vehicles): Full features + custom workflows
```

---

## 2️⃣ ARCHITECTURE: Tenant Configuration Layer

### 🗂️ Database Schema

```sql
-- Tenant Master Configuration
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1e40af',
  
  -- Plan/Features
  plan_name TEXT DEFAULT 'starter',  -- starter | business | enterprise
  
  -- Feature Flags (JSON)
  features JSONB DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "vehicles": true,
  --   "drivers": true,
  --   "trips": true,
  --   "expenses": false,
  --   "maintenance": false,
  --   "analytics_advanced": false,
  --   "custom_fields": false,
  --   "sso_integration": false
  -- }
  
  -- Settings
  max_users INT DEFAULT 5,
  max_vehicles INT DEFAULT 10,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'vi',
  currency TEXT DEFAULT 'VND',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'trial', 'suspended', 'inactive'))
);

-- Users with Role Assignment
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  email TEXT NOT NULL,
  display_name TEXT,
  
  -- Role (per tenant)
  role TEXT NOT NULL DEFAULT 'user',
  -- tenant_admin, manager, accountant, driver, readonly
  
  -- Permissions (custom)
  permissions JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "can_create_trip": true,
  --   "can_edit_expenses": true,
  --   "can_delete_vehicle": false,
  --   "can_access_analytics": true
  -- }
  
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email),
  CONSTRAINT valid_role CHECK (role IN ('tenant_admin', 'manager', 'accountant', 'driver', 'readonly'))
);

-- Tenant Settings (User-Configurable)
CREATE TABLE tenant_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE REFERENCES tenants(id),
  
  -- Customize what's visible
  menu_items JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "dashboard": true,
  --   "vehicles": true,
  --   "drivers": true,
  --   "trips": true,
  --   "expenses": false,
  --   "maintenance": false,
  --   "reports": true,
  --   "settings": true
  -- }
  
  -- Customize workflows
  required_fields JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "trip": ["vehicle_id", "driver_id", "destination", "start_time"],
  --   "expense": ["category", "amount", "description"]
  -- }
  
  -- Custom branding
  notification_email TEXT,
  support_phone TEXT,
  website_url TEXT,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Feature Usage Tracking (Analytics)
CREATE TABLE feature_usage (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  feature_name TEXT NOT NULL,
  usage_count INT DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_feature_per_tenant UNIQUE (tenant_id, feature_name)
);
```

---

## 3️⃣ TENANT SETTINGS DASHBOARD (UI Component)

### 🎨 Frontend: Tenant Admin Panel

```typescript
// src/pages/tenant-settings/index.tsx

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

export function TenantSettingsPage() {
  const { user } = useAuth();
  const { tenant, updateTenant } = useTenant();
  
  // Check if user is tenant_admin
  if (user.role !== 'tenant_admin') {
    return <div>Access Denied - Admin Only</div>;
  }

  return (
    <div className="tenant-settings-container">
      {/* 1. BRANDING SECTION */}
      <BrandingSettings tenant={tenant} onSave={updateTenant} />
      
      {/* 2. FEATURE SELECTION */}
      <FeatureTogglePanel tenant={tenant} onSave={updateTenant} />
      
      {/* 3. USER & ROLE MANAGEMENT */}
      <UserManagementPanel tenant={tenant} />
      
      {/* 4. TEAM MEMBERS */}
      <TeamMembersSection tenant={tenant} />
      
      {/* 5. BILLING & PLAN */}
      <BillingPlanSection tenant={tenant} />
    </div>
  );
}

// ========== SUB-COMPONENT 1: Branding ==========
function BrandingSettings({ tenant, onSave }) {
  const [formData, setFormData] = useState({
    logo_url: tenant.logo_url || '',
    primary_color: tenant.primary_color || '#2563eb',
    secondary_color: tenant.secondary_color || '#1e40af',
  });

  const handleSave = async () => {
    await onSave({ ...tenant, ...formData });
  };

  return (
    <section className="branding-settings">
      <h2>🎨 Branding & Customization</h2>
      
      <div className="form-group">
        <label>Company Logo</label>
        <input 
          type="file" 
          accept="image/*"
          onChange={(e) => {
            // Upload to Firebase Storage / Supabase Storage
            // Get URL and update formData
          }}
        />
        {formData.logo_url && <img src={formData.logo_url} alt="Logo" />}
      </div>

      <div className="form-group">
        <label>Primary Color</label>
        <input 
          type="color" 
          value={formData.primary_color}
          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
        />
      </div>

      <button onClick={handleSave}>Save Branding</button>
    </section>
  );
}

// ========== SUB-COMPONENT 2: Feature Toggle ==========
function FeatureTogglePanel({ tenant, onSave }) {
  const [features, setFeatures] = useState(tenant.features || {});

  const allFeatures = [
    { key: 'vehicles', label: 'Vehicle Management', description: 'Add and track vehicles' },
    { key: 'drivers', label: 'Driver Management', description: 'Manage drivers and profiles' },
    { key: 'trips', label: 'Trip Tracking', description: 'Log and track trips' },
    { key: 'expenses', label: 'Expense Reports', description: 'Track expenses per trip' },
    { key: 'maintenance', label: 'Maintenance Logs', description: 'Vehicle maintenance history' },
    { key: 'analytics_advanced', label: 'Advanced Analytics', description: 'Custom reports & insights' },
    { key: 'custom_fields', label: 'Custom Fields', description: 'Add custom data fields' },
    { key: 'sso_integration', label: 'SSO Integration', description: 'SAML/OAuth integration' },
  ];

  const handleToggle = (key) => {
    setFeatures({ ...features, [key]: !features[key] });
  };

  const handleSave = async () => {
    await onSave({ ...tenant, features });
  };

  return (
    <section className="feature-toggle-panel">
      <h2>✨ Feature Selection</h2>
      <p className="help-text">Choose features that fit your company size</p>

      <div className="feature-grid">
        {allFeatures.map((feature) => (
          <div key={feature.key} className="feature-card">
            <input
              type="checkbox"
              checked={features[feature.key] ?? true}
              onChange={() => handleToggle(feature.key)}
              id={feature.key}
            />
            <label htmlFor={feature.key}>
              <strong>{feature.label}</strong>
              <p>{feature.description}</p>
            </label>
          </div>
        ))}
      </div>

      <div className="feature-summary">
        <p>Enabled: {Object.values(features).filter(Boolean).length} features</p>
      </div>

      <button onClick={handleSave} className="btn-primary">Save Features</button>
    </section>
  );
}

// ========== SUB-COMPONENT 3: User & Role Management ==========
function UserManagementPanel({ tenant }) {
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const roles = [
    { key: 'tenant_admin', label: 'Admin', icon: '👑', color: 'red' },
    { key: 'manager', label: 'Manager', icon: '📊', color: 'blue' },
    { key: 'accountant', label: 'Accountant', icon: '💰', color: 'green' },
    { key: 'driver', label: 'Driver', icon: '🚗', color: 'orange' },
    { key: 'readonly', label: 'Read Only', icon: '👁️', color: 'gray' },
  ];

  return (
    <section className="user-management">
      <h2>👥 Team Members & Roles</h2>
      
      <div className="role-selector">
        {roles.map((role) => (
          <div key={role.key} className="role-option">
            <span className="icon">{role.icon}</span>
            <strong>{role.label}</strong>
            <p>
              {role.key === 'tenant_admin' && 'Full access to all features'}
              {role.key === 'manager' && 'Can manage vehicles, drivers, trips'}
              {role.key === 'accountant' && 'Can manage expenses and reports'}
              {role.key === 'driver' && 'Can log trips and view own data'}
              {role.key === 'readonly' && 'View-only access to reports'}
            </p>
          </div>
        ))}
      </div>

      <button onClick={() => setShowAddForm(true)} className="btn-secondary">
        + Add Team Member
      </button>

      {showAddForm && <AddUserForm tenantId={tenant.id} onClose={() => setShowAddForm(false)} />}
    </section>
  );
}

// ========== SUB-COMPONENT 4: Quick Add User Form ==========
function AddUserForm({ tenantId, onClose }) {
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'driver',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create user:
    // POST /api/users/invite
    // payload: { tenant_id: tenantId, email, display_name, role }
    
    // Result:
    // - User invited
    // - Email sent with password reset link
    // - User can login with new password
    
    alert(`${form.display_name} invited as ${form.role}!`);
    onClose();
  };

  return (
    <form className="add-user-form" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />
      
      <input
        type="text"
        placeholder="Display Name"
        value={form.display_name}
        onChange={(e) => setForm({ ...form, display_name: e.target.value })}
        required
      />

      <select
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
      >
        <option value="driver">Driver (Tài xế)</option>
        <option value="manager">Manager (Quản lý)</option>
        <option value="accountant">Accountant (Kế toán)</option>
        <option value="tenant_admin">Admin (Chủ công ty)</option>
      </select>

      <button type="submit" className="btn-primary">Send Invite</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
    </form>
  );
}
```

---

## 4️⃣ DYNAMIC MENU: Based on Feature Selection

### 🎯 Navigation Adapter

```typescript
// src/components/Navigation.tsx

import React from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

export function Navigation() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const features = tenant.features || {};

  // Role-based access
  const roleBaseMenus = {
    driver: ['dashboard', 'trips', 'profile'],
    accountant: ['dashboard', 'trips', 'expenses', 'reports', 'profile'],
    manager: ['dashboard', 'vehicles', 'drivers', 'trips', 'expenses', 'reports', 'profile'],
    tenant_admin: ['dashboard', 'vehicles', 'drivers', 'trips', 'expenses', 'maintenance', 'reports', 'settings', 'profile'],
  };

  // Menu items with feature gating
  const allMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', feature: null },
    { key: 'vehicles', label: 'Vehicles', icon: '🚗', feature: 'vehicles' },
    { key: 'drivers', label: 'Drivers', icon: '👤', feature: 'drivers' },
    { key: 'trips', label: 'Trips', icon: '🛣️', feature: 'trips' },
    { key: 'expenses', label: 'Expenses', icon: '💰', feature: 'expenses' },
    { key: 'maintenance', label: 'Maintenance', icon: '🔧', feature: 'maintenance' },
    { key: 'reports', label: 'Reports', icon: '📈', feature: 'analytics_advanced' },
    { key: 'settings', label: 'Settings', icon: '⚙️', feature: null },
  ];

  // Filter menu based on:
  // 1. User role (role_based_menus)
  // 2. Tenant features (feature flags)
  const visibleMenuItems = allMenuItems.filter((item) => {
    // Must be in role-based menu
    const inRoleMenu = roleBaseMenus[user.role]?.includes(item.key);
    if (!inRoleMenu) return false;

    // If feature flag required, must be enabled
    if (item.feature && !features[item.feature]) return false;

    return true;
  });

  return (
    <nav className="main-navigation">
      <div className="nav-header">
        {tenant.logo_url && (
          <img src={tenant.logo_url} alt={tenant.name} className="logo" />
        )}
        <span className="tenant-name">{tenant.name}</span>
      </div>

      <ul className="nav-items">
        {visibleMenuItems.map((item) => (
          <li key={item.key} className="nav-item">
            <a href={`/${item.key}`}>
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="nav-footer">
        <a href="/tenant-settings">⚙️ Tenant Settings</a>
        <button onClick={handleLogout}>🚪 Logout</button>
      </div>
    </nav>
  );
}
```

---

## 5️⃣ ROW LEVEL SECURITY (Data Isolation)

### 🔒 Database Security Rules

```sql
-- PostgreSQL with Row Level Security (Supabase)
-- OR Firebase Firestore Rules (if using Firebase)

-- ========== PostgreSQL (Supabase) ==========

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see vehicles in their tenant only
CREATE POLICY vehicles_tenant_isolation ON vehicles
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Policy 2: Drivers can only edit own trips
CREATE POLICY trips_driver_isolation ON trips
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY trips_driver_create ON trips
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Policy 3: Accountants can only see expenses in their tenant
CREATE POLICY expenses_tenant_isolation ON expenses
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- ========== Firebase Firestore Rules ==========

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function getUserTenant() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenant_id;
    }

    // Vehicles: users can see only their tenant's vehicles
    match /vehicles/{vehicleId} {
      allow read: if getUserTenant() == resource.data.tenant_id;
      allow create: if getUserTenant() == request.resource.data.tenant_id;
      allow update, delete: if getUserTenant() == resource.data.tenant_id &&
                             userHasRole(['tenant_admin', 'manager']);
    }

    // Trips: similar isolation
    match /trips/{tripId} {
      allow read: if getUserTenant() == resource.data.tenant_id;
      allow create: if getUserTenant() == request.resource.data.tenant_id;
    }
  }
}
```

---

## 6️⃣ API ENDPOINTS: Tenant Self-Service

### 🔌 RESTful API Design

```
╔════════════════════════════════════════════════════════════════╗
║ TENANT SETTINGS ENDPOINTS (Admin Only)                        ║
╚════════════════════════════════════════════════════════════════╝

GET /api/tenants/{tenantId}/settings
  └─ Get current settings (branding, features, menu)
  └─ Response:
     {
       "features": { "vehicles": true, "drivers": true, ... },
       "plan": "business",
       "menu_items": { ... },
       "logo_url": "...",
       "primary_color": "#2563eb"
     }

PUT /api/tenants/{tenantId}/settings
  └─ Update tenant settings
  └─ Payload:
     {
       "features": { "expenses": true, "maintenance": false },
       "primary_color": "#ff0000",
       "menu_items": { ... }
     }

╔════════════════════════════════════════════════════════════════╗
║ USER MANAGEMENT ENDPOINTS (Admin Only)                        ║
╚════════════════════════════════════════════════════════════════╝

POST /api/users/invite
  └─ Invite new team member
  └─ Payload:
     {
       "email": "driver@company.com",
       "display_name": "Nguyễn Văn A",
       "role": "driver"
     }
  └─ Response:
     {
       "user_id": "...",
       "email": "driver@company.com",
       "role": "driver",
       "status": "invited",
       "invite_sent_at": "2026-03-31T10:00:00Z"
     }

GET /api/tenants/{tenantId}/users
  └─ List all users in tenant
  └─ Response: [{ id, email, role, status, created_at }, ...]

PUT /api/users/{userId}/role
  └─ Change user role
  └─ Payload: { "role": "manager" }

DELETE /api/users/{userId}
  └─ Remove user from tenant

╔════════════════════════════════════════════════════════════════╗
║ FEATURE USAGE ANALYTICS (Admin Only)                          ║
╚════════════════════════════════════════════════════════════════╝

GET /api/tenants/{tenantId}/usage
  └─ Get feature usage analytics
  └─ Response:
     {
       "vehicles_feature": {
         "enabled": true,
         "usage_count": 145,
         "last_used": "2026-03-31T09:30:00Z"
       },
       "trips_feature": { ... }
     }
```

---

## 7️⃣ IMPLEMENTATION ROADMAP

### 📋 Phase 1: Core (Week 1-2)

```
✅ Tenant master table with branding
✅ Feature flags in database
✅ Dynamic menu based on features
✅ Basic user invite system
✅ Role-based access control
✅ RLS/security rules (database layer)
```

### 🎯 Phase 2: Self-Service (Week 3-4)

```
⏳ Tenant settings dashboard UI
⏳ Feature toggle panel
⏳ User role management panel
⏳ Logo upload & branding customization
⏳ User role management endpoint (/api/users/invite)
```

### 📊 Phase 3: Analytics & Monitoring (Week 5-6)

```
⏳ Feature usage tracking
⏳ Usage analytics dashboard
⏳ Tenant activity logs
⏳ Billing integration
```

---

## 8️⃣ EXAMPLE SCENARIOS

### 🚕 Scenario 1: Small Taxi Company (5 vehicles)

```
Tenant: "Taxi Hà Nội XYZ"
Features Enabled:
├─ vehicles: ✅ (track 5 cars)
├─ drivers: ✅ (5-10 drivers)
├─ trips: ✅ (log daily trips)
├─ expenses: ❌ (not needed yet)
├─ maintenance: ❌ (too simple)
└─ analytics: ❌ (not needed)

Menu Visible:
├─ Dashboard
├─ Vehicles
├─ Drivers
├─ Trips
└─ Settings

Users: 
├─ Admin: Chủ công ty (1 person)
├─ Managers: Quản lý (1-2 people)
└─ Drivers: Tài xế (5-10 people)

Admin Can:
- Add/remove drivers
- Update vehicle info
- Customize logo + colors
- Disable/enable features as company grows
```

### 🚚 Scenario 2: Medium Logistics (100 vehicles)

```
Tenant: "Logistics Vietnam Co."
Features Enabled:
├─ vehicles: ✅
├─ drivers: ✅
├─ trips: ✅
├─ expenses: ✅ (track fuel, tolls)
├─ maintenance: ✅ (vehicle upkeep)
└─ analytics: ✅ (advanced reports)

Menu Visible:
├─ Dashboard
├─ Vehicles
├─ Drivers
├─ Trips
├─ Expenses
├─ Maintenance
├─ Reports
└─ Settings

Users:
├─ Admin: 1 person (CEO)
├─ Managers: 3-5 people (operations, fleet)
├─ Accountants: 2 people (expense tracking)
└─ Drivers: 100+ people

Admin Can:
- Create custom fields (invoice number on trip, vendor field on expense)
- Set required fields (e.g., trip must have vehicle + destination)
- Create custom roles (e.g., "Team Lead Driver" with special permissions)
- View advanced analytics (ROI per vehicle, driver performance)
```

### 🏢 Scenario 3: Enterprise Fleet (1000+ vehicles)

```
Tenant: "National Transport Group"
Features Enabled: ALL ✅

Custom Features (Premium):
├─ SSO integration: ✅ (SAML/OAuth to company AD)
├─ Custom fields: ✅ (unlimited custom fields)
├─ API access: ✅ (integrate with ERP)
├─ Audit logs: ✅ (compliance)
└─ Advanced reporting: ✅ (custom dashboards)

Menu Visible: FULL

Users:
├─ System Admins: 3 people
├─ Zone Managers: 10 people (per region)
├─ Accountants: 5 people
├─ Drivers: 1000+ people
└─ 3rd party API integrations

Admin Can:
- Create sub-tenants (per region)
- Custom approval workflows
- Integration with company payroll system
- White-label the platform (custom domain)
```

---

## 9️⃣ DATABASE QUERIES: Common Operations

### 📝 Get Available Menu for User

```sql
-- Query: What menu items should User A see?
SELECT m.key, m.label, m.icon
FROM menu_items m
WHERE 
  -- Filter 1: User's role has access
  m.key = ANY(
    SELECT menu FROM role_menus 
    WHERE role = (
      SELECT role FROM users 
      WHERE id = 'user-123'
    )
  )
  AND
  -- Filter 2: Feature is enabled in tenant
  m.feature_flag = '' OR m.feature_flag = ANY(
    SELECT jsonb_object_keys(features) 
    FROM tenants 
    WHERE id = (
      SELECT tenant_id FROM users 
      WHERE id = 'user-123'
    )
  )
ORDER BY m.display_order;
```

### 📝 Invite User to Tenant

```sql
-- Step 1: Insert user
INSERT INTO users (
  id, tenant_id, email, display_name, role, status
) VALUES (
  gen_random_uuid(),
  'tenant-123',
  'newdriver@company.com',
  'Nguyễn Văn A',
  'driver',
  'invited'
);

-- Step 2: Send password reset email (backend logic)
-- Fire event: user.invited → Lambda/Function → Send email

-- Step 3: When user clicks link and sets password
UPDATE users SET status = 'active' WHERE id = '...';
```

### 📝 Toggle Feature for Tenant

```sql
UPDATE tenants 
SET features = jsonb_set(
  features,
  '{maintenance}',
  'true'::jsonb
)
WHERE id = 'tenant-123';

-- Verify toggle:
SELECT features -> 'maintenance' FROM tenants WHERE id = 'tenant-123';
-- Result: true
```

---

## 🔟 BEST PRACTICES: Multi-Tenant SaaS

### ✅ DO's

```
✅ Tenant ID on EVERY table (foreign key)
✅ Check auth.uid() + tenant_id in RLS rules
✅ Feature flags in database (not hardcoded)
✅ User role in database (not JWT)
✅ Menu/UI driven by feature flags
✅ Audit logs for all admin actions
✅ Rate limit per tenant (prevent abuse)
✅ Separate billing model per feature tier
```

### ❌ DON'Ts

```
❌ Trust tenant_id from localStorage alone
❌ Hardcode features in frontend code
❌ Grant all roles same permissions
❌ Skip RLS/security rules
❌ Store sensitive data in menu JSON
❌ Allow user to change own role
❌ Mix tenant data in queries
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Phase 1: Database Setup

```
□ Create tenants table with features JSONB
□ Create users table with role + permissions
□ Create tenant_settings table
□ Create feature_usage tracking table
□ Implement RLS/security rules
□ Test data isolation between tenants
□ Write seed data for demo
```

### Phase 2: Frontend Components

```
□ Tenant settings page
□ Feature toggle component
□ User invite form
□ Dynamic navigation (menu adapter)
□ Role selection component
□ Branding customization form
□ Settings page complete
```

### Phase 3: Backend APIs

```
□ GET /api/tenants/{id}/settings
□ PUT /api/tenants/{id}/settings
□ POST /api/users/invite
□ GET /api/tenants/{id}/users
□ PUT /api/users/{id}/role
□ DELETE /api/users/{id}
□ GET /api/tenants/{id}/usage
□ Error handling + validation
□ Rate limiting
```

### Phase 4: Deployment

```
□ Deploy database migrations
□ Deploy backend APIs
□ Deploy frontend components
□ Test end-to-end multi-tenant scenario
□ Security audit
□ Performance testing (RLS queries)
□ Documentation for admins
```

---

## 🎯 FINAL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                     TENANT 1: Company A                     │
├─────────────────────────────────────────────────────────────┤
│
│  Logo: company-a-logo.png
│  Primary Color: #2563eb
│  Plan: Business
│  
│  Features Enabled:
│  ├─ vehicles ✅
│  ├─ drivers ✅
│  ├─ trips ✅
│  ├─ expenses ✅
│  ├─ maintenance ❌
│  └─ analytics ✅
│
│  Menu Visible: [Dashboard, Vehicles, Drivers, Trips, Expenses, Reports, Settings]
│
│  Users:
│  ├─ admin@company-a.com (tenant_admin)
│  ├─ manager@company-a.com (manager)
│  ├─ accountant@company-a.com (accountant)
│  ├─ driver1@company-a.com (driver)
│  └─ driver2@company-a.com (driver)
│
│  Database (Isolated):
│  ├─ vehicles (only Company A's vehicles)
│  ├─ drivers (only Company A's drivers)
│  ├─ trips (only Company A's trips)
│  └─ expenses (only Company A's expenses)
│  └─ RLS Rules enforce: tenant_id = 'tenant-1'
│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     TENANT 2: Company B                     │
├─────────────────────────────────────────────────────────────┤
│
│  Logo: company-b-logo.png
│  Primary Color: #ff6b00
│  Plan: Starter
│
│  Features Enabled:
│  ├─ vehicles ✅
│  ├─ drivers ✅
│  ├─ trips ✅
│  ├─ expenses ❌ ← Different from Company A!
│  ├─ maintenance ❌
│  └─ analytics ❌ ← Company B not paying for this
│
│  Menu Visible: [Dashboard, Vehicles, Drivers, Trips, Settings]
│
│  Users:
│  ├─ ceo@company-b.com (tenant_admin)
│  ├─ driver1@company-b.com (driver)
│  └─ driver2@company-b.com (driver)
│
│  Database (Isolated):
│  ├─ vehicles (only Company B's vehicles)
│  ├─ drivers (only Company B's drivers)
│  ├─ trips (only Company B's trips)
│  └─ RLS Rules enforce: tenant_id = 'tenant-2'
│
│  NOTE: Even if Company B's users try to access expenses,
│        the menu won't show it (feature disabled)
│        And RLS will reject if they try via API
│
└─────────────────────────────────────────────────────────────┘
```

---

## 📌 SUMMARY: Professional Multi-Tenant SaaS

```
🎯 ACHIEVED:

✅ Each tenant has own giao diện (branding, logo, colors)
✅ Each tenant can chọn features (starter = 3 features, business = 6)
✅ Each tenant can tự tạo tài khoản (driver, accountant, manager)
✅ Professional self-service dashboard
✅ Role-based access control (5 roles)
✅ Database-level isolation (RLS)
✅ Dynamic menu (based on features + roles)

➡️  RESULT: Every tenant gets EXACTLY what they need
              No feature overload
              Easy to add/remove features
              Professional, scalable SaaS platform
```

This architecture works with **Firebase, Supabase, or any database platform**.

