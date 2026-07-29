import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** The 10-stage order lifecycle used across the whole platform. */
export const ORDER_STAGES = [
  "payment_pending",
  "payment_successful",
  "accepted",
  "preparing",
  "cooking",
  "packing",
  "ready",
  "assigned",
  "out_for_delivery",
  "delivered",
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

export const STAGE_LABEL: Record<string, string> = {
  payment_pending: "Payment Pending",
  payment_successful: "Payment Successful",
  accepted: "Accepted",
  preparing: "Preparing",
  cooking: "Cooking",
  packing: "Packing",
  ready: "Ready",
  assigned: "Assigned",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  pending: "Pending",
  cancelled: "Cancelled",
};

export const STAGE_STYLE: Record<string, string> = {
  payment_pending: "bg-destructive text-destructive-foreground",
  payment_successful: "bg-accent text-accent-foreground",
  accepted: "bg-accent text-accent-foreground",
  preparing: "bg-secondary text-secondary-foreground",
  cooking: "bg-secondary text-secondary-foreground",
  packing: "bg-secondary text-secondary-foreground",
  ready: "bg-secondary text-secondary-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  out_for_delivery: "bg-primary text-primary-foreground",
  delivered: "bg-primary text-primary-foreground",
  pending: "bg-accent text-accent-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

export function stageIndex(status: string) {
  const i = ORDER_STAGES.indexOf(status as OrderStage);
  if (i >= 0) return i;
  if (status === "pending") return 1;
  return -1;
}

/** Stages the kitchen can advance an order to next. */
export function nextStage(status: string): OrderStage | null {
  const i = stageIndex(status);
  if (i < 0 || i >= ORDER_STAGES.length - 1) return null;
  return ORDER_STAGES[i + 1];
}

export type StoreSettings = {
  is_open: boolean;
  open_time: string;
  close_time: string;
  min_order_value: number;
  free_delivery_threshold: number;
  delivery_charge: number;
  tax_percent: number;
  upi_id: string;
  whatsapp_number: string;
  eta_minutes: number;
  closed_message: string;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  is_open: true,
  open_time: "09:00",
  close_time: "21:00",
  min_order_value: 149,
  free_delivery_threshold: 249,
  delivery_charge: 30,
  tax_percent: 5,
  upi_id: "6301196547@ybl",
  whatsapp_number: "8569955929",
  eta_minutes: 35,
  closed_message: "RESTAURANT IS CURRENTLY CLOSED",
};

export function useStoreSettings() {
  const query = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULT_SETTINGS) as unknown as StoreSettings;
    },
  });
  return { settings: query.data ?? DEFAULT_SETTINGS, isLoading: query.isLoading };
}

/** 12-hour label for the opening-hours banner. */
export function prettyTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, "0")} ${period}`;
}

export type Totals = {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  belowMinimum: boolean;
  amountToMinimum: number;
  amountToFreeDelivery: number;
};

/** Mirrors the server-side pricing in place_order so checkout previews match. */
export function priceOrder(subtotal: number, s: StoreSettings): Totals {
  const deliveryFee = subtotal >= s.free_delivery_threshold ? 0 : s.delivery_charge;
  const tax = Math.round(((subtotal * s.tax_percent) / 100) * 100) / 100;
  return {
    subtotal,
    deliveryFee: subtotal > 0 ? deliveryFee : 0,
    tax,
    total: Math.round((subtotal + (subtotal > 0 ? deliveryFee : 0) + tax) * 100) / 100,
    belowMinimum: subtotal > 0 && subtotal < s.min_order_value,
    amountToMinimum: Math.max(s.min_order_value - subtotal, 0),
    amountToFreeDelivery: Math.max(s.free_delivery_threshold - subtotal, 0),
  };
}

export const MENU_CATEGORIES = ["all", "veg", "nonveg", "combos", "beverages", "desserts"] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<string, string> = {
  all: "All",
  veg: "Veg",
  nonveg: "Non-Veg",
  combos: "Combos",
  beverages: "Beverages",
  desserts: "Desserts",
};
