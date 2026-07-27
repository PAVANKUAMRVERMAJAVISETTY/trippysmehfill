import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/feedback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rate your order — Trippy's Mehfill" },
      { name: "description", content: "Tell us how your Trippy's Mehfill order was: food, taste, packing and delivery." },
      { property: "og:title", content: "Rate your order — Trippy's Mehfill" },
      { property: "og:description", content: "Share your feedback on your Hyderabadi feast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedbackPage,
});

function Stars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n} star`}
            onClick={() => onChange(n)}
            className={`text-2xl leading-none ${n <= value ? "text-accent" : "text-muted-foreground/40"}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackPage() {
  const [orderId, setOrderId] = useState("");
  const [summary, setSummary] = useState<{ order_no: number; customer_name: string; status: string; has_feedback: boolean } | null>(null);
  const [scores, setScores] = useState({ food: 5, taste: 5, packing: 5, delivery: 5 });
  const [comments, setComments] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order") ?? "";
    setOrderId(id);
    if (!id) return;
    supabase.rpc("order_summary", { p_order_id: id }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setSummary(row as typeof summary);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.rpc("submit_feedback", {
      p_order_id: orderId,
      p_food: scores.food,
      p_taste: scores.taste,
      p_packing: scores.packing,
      p_delivery: scores.delivery,
      p_comments: comments,
    });
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Thank you for your feedback!");
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold">Rate your order</h1>
        {!orderId && <p className="mt-3 text-muted-foreground">Open the feedback link we sent you on WhatsApp.</p>}
        {orderId && !summary && <p className="mt-3 text-muted-foreground">Loading your order…</p>}
        {summary && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Order #{summary.order_no} · {summary.customer_name}
            </p>
            {done || summary.has_feedback ? (
              <p className="mt-6 rounded-xl bg-secondary p-4">
                Thank you for ordering from Trippy's Mehfill — your feedback is recorded. See you in Mehfill!
              </p>
            ) : summary.status !== "delivered" ? (
              <p className="mt-6 rounded-xl bg-muted p-4 text-muted-foreground">
                You can rate this order once it has been delivered.
              </p>
            ) : (
              <form className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5" onSubmit={submit}>
                <Stars label="Food" value={scores.food} onChange={(v) => setScores({ ...scores, food: v })} />
                <Stars label="Taste" value={scores.taste} onChange={(v) => setScores({ ...scores, taste: v })} />
                <Stars label="Packing" value={scores.packing} onChange={(v) => setScores({ ...scores, packing: v })} />
                <Stars label="Delivery" value={scores.delivery} onChange={(v) => setScores({ ...scores, delivery: v })} />
                <Textarea
                  placeholder="Comments (optional)"
                  maxLength={1000}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
                <Button className="w-full">Submit</Button>
              </form>
            )}
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
