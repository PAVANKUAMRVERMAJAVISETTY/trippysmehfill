import React from 'react';
import { Info } from 'lucide-react';
import { KitchenSettings } from '../../types';

interface ClosedHomepageBannerProps {
  settings: KitchenSettings;
  onOpenClosedModal?: () => void;
}

export const ClosedHomepageBanner: React.FC<ClosedHomepageBannerProps> = ({ settings, onOpenClosedModal }) => {
  if (settings.is_open) return null;

  return (
    <div className="bg-[#E8F1FA] text-[#1E4F7A] px-4 py-3 border-b border-[#8FB6D9] shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-1.5 rounded-full bg-[#2563A6]/15 text-[#2563A6] shrink-0">
            <Info className="w-4 h-4 text-[#2563A6]" />
          </div>
          <div>
            <span className="font-extrabold tracking-wide text-[#2563A6] uppercase mr-2 font-serif">
              Restaurant Closed
            </span>
            <span className="text-[#1E4F7A] font-medium">
              Opening Time: <strong className="text-[#1E4F7A] font-mono">{settings.opening_time || '09:00 AM'}</strong> | Closing Time: <strong className="text-[#1E4F7A] font-mono">{settings.closing_time || '10:00 PM'}</strong> — Please come back during business hours.
            </span>
          </div>
        </div>

        {onOpenClosedModal && (
          <button
            onClick={onOpenClosedModal}
            className="px-3.5 py-1 bg-white hover:bg-[#F0E8D8] text-[#2563A6] font-bold rounded-xl text-[11px] transition shrink-0 border border-[#8FB6D9] shadow-sm cursor-pointer"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};
