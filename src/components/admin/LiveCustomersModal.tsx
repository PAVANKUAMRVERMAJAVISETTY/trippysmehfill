import React from 'react';
import { usePresence, CustomerPresenceSession } from '../../context/PresenceContext';
import { Users, X, Phone, MessageSquare, ExternalLink, Activity, Clock } from 'lucide-react';

function getTimeAgo(isoString: string): string {
  if (!isoString) return 'just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (isNaN(diffMs) || diffMs < 5000) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec} sec ago`;
  const min = Math.floor(sec / 60);
  return `${min} min ago`;
}

export const LiveCustomersModal: React.FC = () => {
  const { liveCustomers, liveCount, isLiveModalOpen, setIsLiveModalOpen } = usePresence();

  if (!isLiveModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#F5F1E8] border border-[#D8D2C5] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-white border-b border-[#D8D2C5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D1FAE5] border border-[#86EFAC] rounded-2xl text-[#146C43] relative">
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#198754] border-2 border-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#252525] font-serif">
                  LIVE CUSTOMERS
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#D1FAE5] text-[#146C43] border border-[#86EFAC]">
                  {liveCount} Online
                </span>
              </div>
              <p className="text-xs text-[#5F6368]">
                Real-time active presence sessions of authenticated customers
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLiveModalOpen(false)}
            className="p-2 text-[#5F6368] hover:text-[#17212B] hover:bg-[#F8F6F0] rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {liveCustomers.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#D8D2C5] text-center space-y-2">
              <Users className="w-12 h-12 text-[#9CA3AF] mx-auto" />
              <h3 className="font-extrabold text-[#252525] text-sm">
                No authenticated customers are currently online.
              </h3>
              <p className="text-xs text-[#5F6368]">
                When an authenticated customer logs into the website, their presence session will appear here in real time.
              </p>
            </div>
          ) : (
            liveCustomers.map((session: CustomerPresenceSession) => {
              const sanitizedPhone = session.phone ? session.phone.replace(/[^0-9]/g, '') : '';
              const whatsappUrl = sanitizedPhone
                ? `https://wa.me/91${sanitizedPhone.startsWith('91') ? sanitizedPhone.slice(2) : sanitizedPhone}`
                : null;

              return (
                <div
                  key={session.user_id}
                  className="bg-white p-4 rounded-2xl border border-[#86EFAC] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] border border-[#86EFAC] text-[#146C43] font-black flex items-center justify-center text-base">
                          {session.full_name ? session.full_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#198754] border-2 border-white animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-[#17212B] text-sm">
                            {session.full_name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#D1FAE5] text-[#146C43] border border-[#86EFAC]">
                            🟢 LIVE NOW
                          </span>
                        </div>
                        <p className="text-xs text-[#5F6368] font-mono">{session.email}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-xl text-[10px] font-extrabold bg-[#FFF0CC] text-[#8A5A00] border border-[#E8C66A] inline-flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>{session.activity}</span>
                      </span>
                      <p className="text-[10px] text-[#5F6368] font-medium mt-1 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-[#B8862D]" />
                        <span>Active {getTimeAgo(session.last_seen)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Address & Contact Bar */}
                  <div className="pt-2 border-t border-[#F0E8D8] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      {session.phone && (
                        <span className="font-bold text-[#17212B] flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#B8862D]" />
                          <span>📞 {session.phone}</span>
                        </span>
                      )}
                      {session.hostel_address && (
                        <p className="text-[11px] text-[#5F6368] mt-0.5 truncate max-w-xs">
                          🏠 {session.hostel_address}
                        </p>
                      )}
                    </div>

                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-xs shrink-0 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Contact on WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#9CA3AF] italic">No phone provided</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#D8D2C5] text-right">
          <button
            onClick={() => setIsLiveModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-white border border-[#D8D2C5] text-[#252525] font-extrabold text-xs hover:bg-[#F8F6F0] transition cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
