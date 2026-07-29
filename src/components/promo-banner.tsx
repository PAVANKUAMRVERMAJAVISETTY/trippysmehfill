import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const KEY = "tm-banner-seen";

/** Admin-controlled promotional modal — shows once per day per customer. */
export function PromoBanner() {
  const [open, setOpen] = useState(false);

  const { data: banner } = useQuery({
    queryKey: ["active-banner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banners")
        .select("id, title, image_url, link_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!banner) return;
    const today = new Date().toDateString();
    if (localStorage.getItem(`${KEY}-${banner.id}`) === today) return;
    setOpen(true);
  }, [banner]);

  function dismiss() {
    if (banner) localStorage.setItem(`${KEY}-${banner.id}`, new Date().toDateString());
    setOpen(false);
  }

  if (!open || !banner) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={banner.title || "Offer"}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {banner.image_url && (
          <img src={banner.image_url} alt={banner.title || "Offer"} className="max-h-[60vh] w-full object-cover" />
        )}
        <div className="space-y-3 p-5 text-center">
          {banner.title && <h2 className="text-lg font-bold text-primary">{banner.title}</h2>}
          <div className="flex gap-2">
            {banner.link_url && (
              <Button asChild className="flex-1">
                <a href={banner.link_url}>Know more</a>
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={dismiss}>
              Continue to menu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
