import React from 'react';
import { UserProfile, Order } from '../../types';
import { X, MapPin, Globe, Laptop, Clock, ShieldCheck, ShieldAlert, ShoppingBag, ExternalLink, Activity, Phone, Mail } from 'lucide-react';
import { formatRelativeTime, formatFullTimestamp, getActivityStatus } from '../../lib/timeUtils';
import { formatDistanceText } from '../../lib/geoUtils';

interface CustomerDetailModalProps {
  customer: UserProfile | null;
  orders: Order[];
  onClose: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  orders,
  onClose,
}) => {
  if (!customer) return null;

  const activityBadge = getActivityStatus(customer.last_seen_at || customer.updated_at);
  const locationUpdateText = customer.last_location_update_at
    ? formatRelativeTime(customer.last_location_update_at)
    : customer.latitude
    ? formatRelativeTime(customer.created_at)
    : 'No location recorded';

  // Customer order stats
  const customerOrders = orders.filter((o) => o.customer_email === customer.email || o.user_id === customer.id);
  const totalOrders = customerOrders.length;
  const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const lastOrderDate = customerOrders.length > 0 ? customerOrders[0].created_at : null;

  const hasValidCoords = Boolean(customer.latitude && customer.longitude && (customer.latitude !== 0 || customer.longitude !== 0));
  const googleMapsUrl = hasValidCoords
    ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
    : null;

  const isBlocked = customer.account_status === 'blocked_fraud';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-[#F4F0E8] border border-[#C5A059]/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 text-[#1F2933]">
        
        {/* Modal Header */}
        <div className="bg-[#121212] text-white p-5 rounded-t-3xl flex items-center justify-between border-b border-[#C5A059]/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center font-black text-xl">
              {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-serif text-white">{customer.full_name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                  isBlocked ? 'bg-red-900/60 text-red-200 border-red-500' : 'bg-emerald-900/60 text-emerald-200 border-emerald-500'
                }`}>
                  {isBlocked ? 'Blocked' : '● Active Account'}
                </span>
              </div>
              <p className="text-xs text-gray-300 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#C5A059]" /> {customer.phone || 'N/A'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#C5A059]" /> {customer.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/10 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* 1. CUSTOMER ACTIVITY */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
              <h3 className="text-xs font-black text-[#1F2933] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D95F0A]" />
                <span>CUSTOMER ACTIVITY</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${activityBadge.badgeBg} ${activityBadge.badgeText} ${activityBadge.badgeBorder}`}>
                {activityBadge.dot} {activityBadge.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#5F6368] font-medium block">Current Account Status</span>
                <span className="font-extrabold text-[#146C43] flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#146C43]" />
                  <span>{customer.account_status === 'blocked_fraud' ? 'Blocked for Fraud' : '● Active'}</span>
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Last Seen Relative</span>
                <span className="font-extrabold text-[#1F2933] mt-0.5 block">
                  {formatRelativeTime(customer.last_seen_at || customer.updated_at)}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Exact Last Activity Timestamp</span>
                <span className="font-mono text-[11px] text-[#1F2933] font-bold mt-0.5 block">
                  {formatFullTimestamp(customer.last_seen_at || customer.updated_at)}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Account Created At</span>
                <span className="font-mono text-[11px] text-[#5F6368] mt-0.5 block">
                  {formatFullTimestamp(customer.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. LAST KNOWN LOCATION */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
              <h3 className="text-xs font-black text-[#1F2933] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D95F0A]" />
                <span>LAST KNOWN LOCATION</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${
                customer.gps_allowed !== false
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300'
              }`}>
                {customer.gps_allowed !== false ? 'Permission Granted' : 'Location Permission Denied'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#5F6368] font-medium block">📍 Location Region</span>
                <span className="font-bold text-[#1F2933] mt-0.5 block truncate">
                  {customer.location_city || customer.hostel_address || 'Sohna / Gurgaon Rural, Haryana'}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">GPS Coordinates</span>
                <span className="font-mono text-xs font-bold text-[#D95F0A] mt-0.5 block">
                  {hasValidCoords ? `${customer.latitude?.toFixed(4)}, ${customer.longitude?.toFixed(4)}` : 'Location unavailable'}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">GPS Accuracy</span>
                <span className="font-mono text-xs font-bold text-[#146C43] mt-0.5 block">
                  ±{customer.gps_accuracy || 15} meters
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Last Location Update</span>
                <span className="font-mono text-[11px] text-[#1F2933] font-bold mt-0.5 block">
                  {locationUpdateText}
                </span>
              </div>
            </div>

            {googleMapsUrl && (
              <div className="pt-2 border-t border-[#DDD6C8]">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-[#121212] hover:bg-black text-[#C5A059] font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition border border-[#C5A059]/40 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-[#C5A059]" />
                  <span>Open Location on Google Maps</span>
                </a>
              </div>
            )}
          </div>

          {/* 3. NETWORK & DEVICE INFORMATION */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
              <h3 className="text-xs font-black text-[#1F2933] uppercase tracking-wider flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#D95F0A]" />
                <span>NETWORK & DEVICE SPECIFICATIONS</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#5F6368] font-medium block">Public IP Address</span>
                <span className="font-mono text-xs font-bold text-[#1F2933] mt-0.5 block">
                  🌐 {customer.ip_address || 'IP unavailable'}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Device Category</span>
                <span className="font-bold text-[#1F2933] mt-0.5 block">
                  📱 {customer.device_type || 'Desktop'}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Operating System</span>
                <span className="font-bold text-[#1F2933] mt-0.5 block">
                  💻 {customer.os_name || 'Windows'}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Browser</span>
                <span className="font-bold text-[#D95F0A] mt-0.5 block">
                  🌐 {customer.browser_name || 'Chrome'}
                </span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Timezone</span>
                <span className="font-mono text-xs font-bold text-[#5F6368] mt-0.5 block truncate">
                  🕒 {customer.timezone || 'Asia/Kolkata'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. ORDERS & SPENDING HISTORY */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
              <h3 className="text-xs font-black text-[#1F2933] uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#D95F0A]" />
                <span>ORDER & SPENDING HISTORY</span>
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#5F6368] font-medium block">Total Orders</span>
                <span className="font-black text-sm text-[#1F2933] mt-0.5 block">{totalOrders}</span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Total Amount Spent</span>
                <span className="font-black text-sm text-[#D95F0A] mt-0.5 block">₹{totalSpent.toFixed(0)}</span>
              </div>

              <div>
                <span className="text-[#5F6368] font-medium block">Most Recent Order</span>
                <span className="font-mono text-xs text-[#5F6368] font-bold mt-0.5 block">
                  {lastOrderDate ? formatRelativeTime(lastOrderDate) : 'No orders yet'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
