import React from 'react';
import { Feedback } from '../../types';
import { Star, MessageSquare } from 'lucide-react';

interface FeedbackViewProps {
  feedback: Feedback[];
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ feedback }) => {
  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.food_rating + f.taste_rating + f.packing_rating + f.delivery_rating) / 4, 0) / feedback.length).toFixed(1)
    : '5.0';

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]" style={{ backgroundColor: '#F3F1F6' }}>
      <div>
        <h1 className="text-2xl font-black text-[#252525] font-serif">Customer Feedback</h1>
        <p className="text-xs text-[#5F6368]">{feedback.length} reviews — average {avgRating} / 5</p>
      </div>

      {feedback.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#DDD6C8] shadow-sm">
          <MessageSquare className="w-12 h-12 text-[#5F6368] mx-auto mb-2" />
          <p className="text-[#1F2933] font-bold">No customer feedback recorded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {feedback.map((fb) => (
            <div key={fb.id} className="bg-white rounded-2xl p-5 border border-[#DDD6C8] shadow-sm space-y-3">
              <div className="flex justify-between items-start border-b border-[#DDD6C8] pb-2">
                <div>
                  <h3 className="font-extrabold text-[#1F2933] text-sm">{fb.customer_name}</h3>
                  <p className="text-[10px] text-[#5F6368]">Order {fb.order_id} • Driver: {fb.driver_name || 'N/A'}</p>
                </div>
                <div className="flex text-[#B8862D] text-sm font-bold">
                  {'★'.repeat(fb.food_rating)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#5F6368] bg-[#F7F4EC] border border-[#DDD6C8] p-3 rounded-xl font-medium">
                <div>Food Quality: <strong className="text-[#1F2933]">{fb.food_rating}/5</strong></div>
                <div>Taste: <strong className="text-[#1F2933]">{fb.taste_rating}/5</strong></div>
                <div>Packing: <strong className="text-[#1F2933]">{fb.packing_rating}/5</strong></div>
                <div>Delivery: <strong className="text-[#1F2933]">{fb.delivery_rating}/5</strong></div>
              </div>

              {fb.comment && (
                <p className="text-xs text-[#1F2933] italic bg-[#FFF0CC] p-2.5 rounded-xl border border-[#E8C66A]">
                  "{fb.comment}"
                </p>
              )}

              <p className="text-[10px] text-[#5F6368] text-right">{fb.created_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
