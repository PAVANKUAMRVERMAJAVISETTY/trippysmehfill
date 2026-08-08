import React, { useState } from 'react';
import { Order, Feedback } from '../../types';
import { X, Star, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { feedbackService } from '../../services/supabase';

interface CustomerFeedbackModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (fb: Feedback) => void;
}

export const CustomerFeedbackModal: React.FC<CustomerFeedbackModalProps> = ({
  order,
  isOpen,
  onClose,
  onSubmitSuccess
}) => {
  const [foodRating, setFoodRating] = useState(5);
  const [tasteRating, setTasteRating] = useState(5);
  const [packingRating, setPackingRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const renderStarSelector = (value: number, setValue: (val: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          type="button"
          key={s}
          onClick={() => setValue(s)}
          className="p-1 focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 ${
              s <= value ? 'text-[#C5A059] fill-[#C5A059]' : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newFeedback: Feedback = {
      id: 'fb-' + Date.now(),
      order_id: order.order_number,
      customer_name: order.customer_name,
      food_rating: foodRating,
      taste_rating: tasteRating,
      packing_rating: packingRating,
      delivery_rating: deliveryRating,
      driver_name: order.driver_name,
      comment,
      created_at: new Date().toLocaleString()
    };

    if (isSupabaseConfigured) {
      try {
        const saved = await feedbackService.submitFeedback(newFeedback);
        newFeedback.id = saved.id;
      } catch (err) {
        console.error('Failed to save feedback to Supabase', err);
      }
    }

    setIsSubmitting(false);
    onSubmitSuccess(newFeedback);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#121212] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10 text-gray-200">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0d0d0d]">
          <div>
            <h2 className="text-lg font-bold text-white font-serif tracking-wide">Rate Your Order</h2>
            <p className="text-xs text-gray-400">Order {order.order_number}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-200 block mb-1">Food Quality</label>
            {renderStarSelector(foodRating, setFoodRating)}
          </div>

          <div>
            <label className="font-bold text-gray-200 block mb-1">Taste & Spice Level</label>
            {renderStarSelector(tasteRating, setTasteRating)}
          </div>

          <div>
            <label className="font-bold text-gray-200 block mb-1">Packaging Hygiene</label>
            {renderStarSelector(packingRating, setPackingRating)}
          </div>

          <div>
            <label className="font-bold text-gray-200 block mb-1">Delivery Speed & Partner</label>
            {renderStarSelector(deliveryRating, setDeliveryRating)}
          </div>

          <div>
            <label className="font-bold text-gray-200 block mb-1">Comments (Optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
              className="w-full p-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Submit Feedback</span>
          </button>
        </form>
      </div>
    </div>
  );
};
