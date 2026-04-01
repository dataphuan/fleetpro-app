import { useEffect, useMemo, useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'fleetpro_pwa_prompt_dismissed';

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  }, []);

  const isIosSafari = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
    return isIOS && isSafari;
  }, []);

  useEffect(() => {
    if (isStandalone) return;

    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    if (dismissed) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isIosSafari) {
      setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone, isIosSafari]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setIsVisible(false);
  };

  if (!isVisible || isStandalone) return null;

  return (
    <div className="px-4 pt-3">
      <Alert className="border-blue-200 bg-blue-50 text-blue-900">
        <Smartphone className="h-4 w-4" />
        <AlertTitle>Cai app len man hinh chinh</AlertTitle>
        <AlertDescription>
          {deferredPrompt
            ? 'Cai icon FleetPro de mo nhanh, check-in dinh vi va cap nhat hanh trinh on dinh hon.'
            : 'Tren iPhone: bam nut Chia se -> Them vao Man hinh chinh de cai icon FleetPro.'}
        </AlertDescription>
        <div className="mt-3 flex gap-2">
          {deferredPrompt ? (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleInstall}>
              <Download className="mr-2 h-4 w-4" /> Cai app
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            De sau
          </Button>
        </div>
      </Alert>
    </div>
  );
}
