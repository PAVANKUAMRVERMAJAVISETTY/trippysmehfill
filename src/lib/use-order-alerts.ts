import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function playAlertTone() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.28, 0.56].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.32, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.24);
    });
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* audio not available */
  }
}

type NewOrder = { order_no: number; customer_name: string; total: number };

/** Realtime "new order" alert: audible tone + toast, for admin & staff dashboards. */
export function useNewOrderAlerts(onNewOrder?: () => void) {
  const cb = useRef(onNewOrder);
  cb.current = onNewOrder;

  useEffect(() => {
    const channel = supabase
      .channel("new-order-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as NewOrder;
        playAlertTone();
        toast.success(`🔔 New order #${order.order_no}`, {
          description: `${order.customer_name} · ₹${Number(order.total || 0).toLocaleString("en-IN")}`,
          duration: 12000,
        });
        cb.current?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
