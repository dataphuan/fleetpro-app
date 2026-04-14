import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, MonitorSmartphone } from 'lucide-react';

export function TenantSwitcher() {
    const { role, tenantId, switchTenant } = useAuth();

    // Only render for Super Admins who are currently impersonating another tenant
    if (role !== 'superadmin' || tenantId === 'system-admin') return null;

    const handleExit = async () => {
        await switchTenant('system-admin');
    };

    return (
        <div className="hidden md:flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full shadow-sm ml-4 mb-2 md:mb-0">
            <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <MonitorSmartphone className="w-4 h-4 text-indigo-600" />
            <div className="flex flex-col">
                <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest leading-none">Super Admin</span>
                <span className="text-xs font-medium text-slate-700 leading-none mt-1">Đang nhập vai</span>
            </div>
            <Badge variant="outline" className="bg-white text-indigo-900 border-indigo-200 font-mono text-[10px] ml-1">
                {tenantId}
            </Badge>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExit}
                className="h-7 hover:bg-indigo-100 text-indigo-700 ml-1 px-2"
                title="Thoát nhập vai"
            >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs font-bold">THOÁT</span>
            </Button>
        </div>
    );
}
