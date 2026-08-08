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
    <div className="bg-[#F5F1E8] text-[#1F2933] border-t border-b border-[#D8D2C5] overflow-x-auto no-scrollbar shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1.5 py-2.5 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#B8862D] text-white border-[#8F691F] shadow-sm font-extrabold'
                  : 'bg-white text-[#374151] border-[#D8D2C5] hover:bg-[#F0E7D5] hover:text-[#1F2933]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'registrations' && pendingCount > 0 && (
                <span className="bg-[#C0392B] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-[#922B21]">
                  {pendingCount}
                </span>
              )}
              {tab.id === 'payments' && pendingPaymentsCount > 0 && (
                <span className="bg-[#C0392B] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-[#922B21]">
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
