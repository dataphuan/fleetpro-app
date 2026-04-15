# 🚀 INTEGRATION GUIDE - Onboarding Flow

## Step 1: Add OnboardingFlow to App.tsx

Update your App.tsx or DashboardLayout.tsx to conditionally render the onboarding flow:

```typescript
import { OnboardingFlow } from '@/components/onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';

export function App() {
  const { user, currentTenant } = useAuth();
  const { showOnboarding, isLoading, markCompleted } = useOnboarding({
    tenantId: currentTenant?.id,
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {showOnboarding && (
        <OnboardingFlow
          tenantId={currentTenant?.id || 'demo-company'}
          onComplete={markCompleted}
        />
      )}
      {/* Rest of your app */}
      <DashboardLayout />
    </>
  );
}
```

---

## Step 2: Create Demo Tenant Data (One-Time Setup)

Run this script in Firebase Console or through a backend function:

```javascript
// scripts/setup-demo-tenant.js

const admin = require('firebase-admin');

async function setupDemoTenant() {
  const db = admin.firestore();
  
  // Create demo tenant config
  await db.collection('tenants').doc('demo-company').set({
    tenant_id: 'demo-company',
    tenant_name: 'FleetPro Demo - Công ty Vận tải Demo',
    type: 'demo',
    app_name: 'FleetPro Online',
    color: '#2563eb',
    is_trial: true,
    trial_until: new Date('2026-12-31'),
    features_enabled: [
      'vehicles',
      'drivers',
      'trips',
      'expenses',
      'maintenance',
      'reports',
      'export',
    ],
  });

  // Create sample vehicles
  const vehicleData = [
    {
      plate_number: '29H-12345',
      vehicle_name: 'Toyota Innova',
      type: 'passenger_van',
      capacity: 7,
      year: 2023,
      fuel_type: 'diesel',
      engine_cc: 2000,
      status: 'active',
    },
    {
      plate_number: '29H-67890',
      vehicle_name: 'Hino 700',
      type: 'truck',
      capacity: 8,
      year: 2022,
      fuel_type: 'diesel',
      engine_cc: 6700,
      status: 'active',
    },
  ];

  for (const vehicle of vehicleData) {
    await db.collection('vehicles').add({
      ...vehicle,
      tenant_id: 'demo-company',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log('Demo tenant setup complete!');
}

// Run the function
setupDemoTenant().catch(console.error);
```

---

## Step 3: Configure Demo Account in Firebase Auth

```bash
# 1. Create demo account in Firebase Console:
# Email: demo@fleetpro.demo
# Password: Demo@1234
# Custom Claims: { "tenant_id": "demo-company", "role": "admin", "isDemoMode": true }

# 2. Use Firebase CLI:
firebase functions:shell

> admin.auth().setCustomUserClaims('user-uid', { 
    tenant_id: 'demo-company', 
    role: 'admin', 
    isDemoMode: true 
  })
```

---

## Step 4: Update Login Page

Show demo account option and mark demo mode:

```typescript
// src/pages/LoginPage.tsx

const handleDemoLogin = async () => {
  try {
    const result = await signInWithEmailAndPassword(
      auth,
      'demo@fleetpro.demo',
      'Demo@1234'
    );
    
    // Mark as demo mode
    sessionStorage.setItem('isDemoMode', 'true');
    localStorage.setItem('user_tenant_id', 'demo-company');
    
    // Redirect to dashboard (onboarding will trigger if no data exists)
    navigate('/dashboard');
  } catch (error) {
    console.error('Demo login failed:', error);
  }
};

return (
  <div className="login-container">
    {/* Regular login form */}
    <form onSubmit={handleLogin}>
      {/* Email and password fields */}
    </form>

    {/* Demo Section */}
    <div className="demo-section">
      <h3>🎯 TÀI KHOẢN DÙNG THỬ (DEMO MODE)</h3>
      <p>Danh sách tài khoản test để trải nghiệm:</p>
      
      <div className="demo-accounts">
        <div className="account-card">
          <span className="role-badge">CEO</span>
          <div>golnk38@gmail.com / Tnc@1980</div>
        </div>
        <div className="account-card">
          <span className="role-badge">MGR</span>
          <div>Coach.chuyen@gmail.com / Tnc@1980</div>
        </div>
      </div>

      <button onClick={handleDemoLogin} className="btn-demo">
        🚀 Bắt đầu với Demo
      </button>
    </div>
  </div>
);
```

---

## Step 5: Add "Replay Onboarding" in Settings

```typescript
// src/pages/SettingsPage.tsx

export function SettingsPage() {
  const { resetOnboarding } = useOnboarding();

  return (
    <div className="settings-container">
      {/* Other settings */}

      <div className="settings-section">
        <h3>🎓 Hướng Dẫn & Trợ Giúp</h3>
        
        <button 
          onClick={resetOnboarding}
          className="btn-secondary"
        >
          🎯 Xem lại hướng dẫn nhanh
        </button>

        <a href="/help" className="btn-secondary">
          📚 Tài liệu hướng dẫn chi tiết
        </a>

        <a href="/videos" className="btn-secondary">
          🎥 Video hướng dẫn (5 phút)
        </a>
      </div>
    </div>
  );
}
```

---

## Step 6: Analytics & Tracking

Track onboarding completion:

```typescript
// src/lib/analytics.ts

export const trackOnboardingEvent = (event: string, data?: any) => {
  if (window.gtag) {
    window.gtag('event', `onboarding_${event}`, {
      tenant_id: data?.tenantId,
      step: data?.step,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
};

// Usage in OnboardingFlow.tsx
const handleSaveData = async () => {
  // ... save logic
  trackOnboardingEvent('step_completed', {
    step: currentStep + 1,
    collection: step.collection,
  });
};

const handleSkip = () => {
  trackOnboardingEvent('skipped', {
    step: currentStep + 1,
  });
};
```

---

## Step 7: Testing Checklist

- [ ] Fresh login shows onboarding popup
- [ ] Each step saves data to Firestore
- [ ] Back button goes to previous step
- [ ] Skip button completes onboarding
- [ ] Success screen shows correct counts
- [ ] Refresh page after completion doesn't show onboarding again
- [ ] Mobile responsiveness works
- [ ] Form validation catches missing fields
- [ ] Error handling works (show error message)
- [ ] Completion is tracked in localStorage
- [ ] Settings allow replay of onboarding

---

## Step 8: Optional - Auto-fill Demo Data

For faster testing, pre-populate some data:

```typescript
const AUTO_FILL_DEMO = {
  vehicle: {
    plate_number: '29H-12345',
    vehicle_name: 'Toyota Innova',
    type: 'passenger_van',
    year: 2023,
  },
  driver: {
    full_name: 'Lê Văn A',
    phone: '0987654321',
    id_number: '123456789',
    license_type: 'B2',
  },
  trip: {
    from_location: 'Hà Nội',
    to_location: 'Hải Phòng',
    distance_km: 120,
    fuel_cost: 500000,
  },
};

// In OnboardingFlow.tsx
useEffect(() => {
  const isDemoMode = sessionStorage.getItem('isDemoMode') === 'true';
  if (isDemoMode && step.icon === '🚗') {
    setFormData(AUTO_FILL_DEMO.vehicle);
  }
}, [currentStep]);
```

---

## 🎉 Result

After implementing this onboarding flow:

✅ New users see a 4-step guided experience  
✅ Automatically populates sample data  
✅ Mobile-friendly responsive design  
✅ Can be replayed from Settings  
✅ Tracks completion in localStorage  
✅ Beautiful UI with animations  
✅ Clear call-to-action (CTA) positioning  
✅ Error handling & validation  

