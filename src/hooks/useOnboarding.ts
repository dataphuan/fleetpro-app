import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export interface UseOnboardingOptions {
  tenantId?: string;
  forceShow?: boolean;
}

export const useOnboarding = (options?: UseOnboardingOptions) => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkShouldShowOnboarding = async () => {
      try {
        // Check if demo mode
        const isDemoMode =
          options?.forceShow ||
          sessionStorage.getItem('isDemoMode') === 'true' ||
          localStorage.getItem('user_tenant_id') === 'demo-company';

        // Check if already completed
        const completedKey = `onboarding_completed_${options?.tenantId || 'default'}`;
        const hasSeenOnboarding = localStorage.getItem(completedKey) === 'true';

        // Check if demo data exists in Firestore
        const hasDemoData = await checkDemoDataExists();

        if (isDemoMode && !hasSeenOnboarding && !hasDemoData) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkShouldShowOnboarding();
  }, [user, options?.forceShow, options?.tenantId]);

  const markCompleted = () => {
    const completedKey = `onboarding_completed_${options?.tenantId || 'default'}`;
    localStorage.setItem(completedKey, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    const completedKey = `onboarding_completed_${options?.tenantId || 'default'}`;
    localStorage.removeItem(completedKey);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoading,
    markCompleted,
    resetOnboarding,
  };
};

// Helper function to check if demo data exists
const checkDemoDataExists = async (): Promise<boolean> => {
  try {
    // Check if vehicles, drivers, trips exist
    // This would query Firestore to see if data is already populated
    const vehiclesExist = localStorage.getItem('demo_vehicles_exist') === 'true';
    return vehiclesExist;
  } catch {
    return false;
  }
};

export default useOnboarding;
