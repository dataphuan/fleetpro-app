import { useEffect, useMemo, useState } from 'react';
import { Smartphone, Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer } from 'vaul';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'fleetpro_pwa_prompt_dismissed_at';
const COOLDOWN_DAYS = 7;

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

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

    // Check cooldown
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const dismissDate = new Date(parseInt(lastDismissed, 10));
      const now = new Date();
      const diffDays = (now.getTime() - dismissDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays < COOLDOWN_DAYS) return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      
      // Delay showing for 2 seconds for better UX
      setTimeout(() => {
        setIsOpen(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isIosSafari) {
      setTimeout(() => {
        setShowIosTip(true);
        setIsOpen(true);
      }, 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone, isIosSafari]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsOpen(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsOpen(false);
  };

  if (isStandalone) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[1001]" />
        <Drawer.Content className="bg-slate-50 flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[1002] outline-none border-t border-slate-200 shadow-2xl">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 my-3" />
          <div className="p-6 pt-2 overflow-y-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cài đặt FleetPro Driver</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed">
                  Cài đặt biểu tượng FleetPro lên màn hình chính để mở nhanh, check-in định vị và cập nhật hành trình ổn định hơn.
                </p>
              </div>

              {showIosTip && (
                <div className="w-full bg-blue-50 rounded-xl p-4 flex items-start space-x-3 border border-blue-100 italic text-sm text-blue-800">
                  <Share className="w-5 h-5 flex-shrink-0 text-blue-600" />
                  <p>
                    Bấm nút <span className="font-bold">Chia sẻ</span> ở thanh dưới trình duyệt, sau đó chọn <span className="font-bold">Thêm vào MH chính</span>.
                  </p>
                </div>
              )}

              <div className="w-full grid grid-cols-1 gap-3 pt-2">
                {deferredPrompt && (
                  <Button 
                    className="w-full h-14 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95" 
                    onClick={handleInstall}
                  >
                    <Download className="w-5 h-5" />
                    <span>Cài đặt ngay</span>
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  className="w-full h-12 text-slate-500 font-medium hover:bg-slate-200 transition-colors" 
                  onClick={handleDismiss}
                >
                  Để sau
                </Button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
