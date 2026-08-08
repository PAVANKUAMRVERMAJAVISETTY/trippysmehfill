import React from 'react';
import { LayoutDashboard, Radio, CookingPot, UserCheck, UtensilsCrossed, Package, History, MessageSquare, BarChart3, Users, Settings, Image, ShieldCheck } from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'live_orders'
  | 'payments'
  | 'kitchen'
  | 'registrations'
  | 'menu'
  | 'gallery'
  | 'inventory'
  | 'history'
  | 'feedback'
  | 'driver_stats'
  | 'staff'
  | 'customers'
  | 'settings';

interface AdminHeaderNavProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  pendingCount?: number;
  /** UPI orders waiting for someone to confirm the transfer arrived. */
  pendingPaymentsCount?: number;
}

const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'live_orders', label: 'Live Orders', icon: <Radio className="w-4 h-4" /> },
  { id: 'payments', label: 'Payment Verification', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'kitchen', label: 'Kitchen', icon: <CookingPot className="w-4 h-4" /> },
  { id: 'registrations', label: 'Pending Registrations', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="w-4 h-4" /> },
  { id: 'gallery', label: 'Gallery', icon: <Image className="w-4 h-4" /> },
  { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
  { id: 'history', label: 'Order History', icon: <History className="w-4 h-4" /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'driver_stats', label: 'Driver Stats', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'staff', label: 'Staff & Drivers', icon: <Users className="w-4 h-4" /> },
  { id: 'customers', label: 'Customers', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
];

export const AdminHeaderNav: React.FC<AdminHeaderNavProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  pendingPaymentsCount = 0
}) => {
  return (
    <div className="bg-[#0d0d0d] text-white border-t border-b border-white/10 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-1.5 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#C5A059] text-black shadow-md font-extrabold'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'registrations' && pendingCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
              {tab.id === 'payments' && pendingPaymentsCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {pendingPaymentsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
