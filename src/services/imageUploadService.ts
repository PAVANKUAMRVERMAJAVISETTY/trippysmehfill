/**
 * imageUploadService — uploads a dish photo taken from the admin's camera or gallery.
 *
 * 🎯 INTERVIEW QUESTION: "Why upload to object storage instead of storing the image
 *    in Postgres?" Answer: binary blobs bloat the DB, break replication performance and
 *    can't be served by a CDN. Storage keeps rows small and reads cheap.
 */
import { supabase } from "@/database/supabaseClient";
import { MENU_IMAGE_BUCKET } from "@/database/schemaDefinitions";

// Ten years in seconds — the signed link stays valid for the dish's lifetime.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

/**
 * [DATABASE QUERY] Uploads the file to storage and writes the public link back on the dish row.
 * Returns the URL that was saved so the caller can update its local state instantly.
 */
export async function uploadMenuImage(menuItemId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5 MB");

  // Unique path per upload so browsers never serve a stale cached photo.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${menuItemId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  // The bucket is private, so we mint a long-lived signed link for the storefront.
  const { data: signed, error: signError } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !signed?.signedUrl) throw new Error(signError?.message ?? "Could not link the image");

  // [DATABASE QUERY] Persist the link on the dish so every customer sees the new photo.
  const { error: updateError } = await supabase
    .from("menu_items")
    .update({ image_url: signed.signedUrl })
    .eq("id", menuItemId);
  if (updateError) throw new Error(updateError.message);

  return signed.signedUrl;
}
