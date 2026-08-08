import React from 'react';
import { UserProfile } from '../../types';
import { Check, X, UserCheck, ShieldAlert, Phone, Mail, MapPin } from 'lucide-react';

interface PendingRegistrationsViewProps {
  pendingUsers: UserProfile[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

export const PendingRegistrationsView: React.FC<PendingRegistrationsViewProps> = ({
  pendingUsers,
  onApprove,
  onReject
}) => {
  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]" style={{ backgroundColor: '#F3F5F7' }}>
      
      <div>
        <h1 className="text-2xl font-black text-[#252525] font-serif">Pending registrations</h1>
        <p className="text-xs text-[#5F6368]">
          Approve real customers before they can sign in and order. This blocks fake orders.
        </p>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#DDD6C8] shadow-sm">
          <UserCheck className="w-12 h-12 text-[#146C43] mx-auto mb-2" />
          <p className="text-[#1F2933] font-bold">No registrations waiting for approval.</p>
          <p className="text-xs text-[#5F6368] mt-1">All new user accounts are currently up to date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-2xl p-5 border border-[#DDD6C8] shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-[#1F2933] text-base capitalize">{user.full_name}</h3>
                  <span className="px-2 py-0.5 bg-[#FFF0CC] text-[#8A5A00] border border-[#E8C66A] font-bold text-[10px] rounded uppercase">
                    Pending
                  </span>
                </div>

                <div className="space-y-1 text-xs text-[#5F6368]">
                  <div className="flex items-center gap-1.5 text-[#1F2933] font-medium">
                    <Mail className="w-3.5 h-3.5 text-[#D95F0A]" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[#1F2933]">
                    <Phone className="w-3.5 h-3.5 text-[#D95F0A]" />
                    <span>{user.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[#5F6368]">
                    <MapPin className="w-3.5 h-3.5 text-[#B8862D] shrink-0 mt-0.5" />
                    <span>{user.hostel_address}</span>
                  </div>
                  {user.created_at && (
                    <p className="text-[10px] text-[#5F6368] pt-1">Registered: {user.created_at}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons matching video frame 0:31 */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DDD6C8]">
                <button
                  onClick={() => onApprove(user.id)}
                  className="py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm border border-[#B94D00] transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => onReject(user.id)}
                  className="py-2.5 bg-[#FDE2E1] hover:bg-[#F5A6A1] text-[#922B21] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#F5A6A1] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
