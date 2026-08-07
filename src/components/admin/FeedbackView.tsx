import React from 'react';
import { Feedback } from '../../types';
import { Star, MessageSquare } from 'lucide-react';
import { averageFeedbackRating } from '../../lib/feedbackStats';

interface FeedbackViewProps {
  feedback: Feedback[];
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ feedback }) => {
  const avgRating = averageFeedbackRating(feedback, '5.0');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">Customer Feedback</h1>
        <p className="text-xs text-gray-500">{feedback.length} reviews — average {avgRating} / 5</p>
      </div>

      {feedback.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-800 font-bold">No customer feedback recorded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {feedback.map((fb) => (
            <div key={fb.id} className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm space-y-3">
              <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">{fb.customer_name}</h3>
                  <p className="text-[10px] text-gray-400">Order {fb.order_id} • Driver: {fb.driver_name || 'N/A'}</p>
                </div>
                <div className="flex text-amber-400 text-sm">
                  {'★'.repeat(fb.food_rating)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl font-medium">
                <div>Food Quality: <strong className="text-gray-900">{fb.food_rating}/5</strong></div>
                <div>Taste: <strong className="text-gray-900">{fb.taste_rating}/5</strong></div>
                <div>Packing: <strong className="text-gray-900">{fb.packing_rating}/5</strong></div>
                <div>Delivery: <strong className="text-gray-900">{fb.delivery_rating}/5</strong></div>
              </div>

              {fb.comment && (
                <p className="text-xs text-gray-800 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                  "{fb.comment}"
                </p>
              )}

              <p className="text-[10px] text-gray-400 text-right">{fb.created_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
