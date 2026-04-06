// Media upload service using Lovable Cloud storage
import { supabase } from "@/integrations/supabase/client";

export interface MediaAttachment {
  id: string;
  type: "image" | "audio" | "file";
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export async function uploadMedia(file: File): Promise<MediaAttachment> {
  const ext = file.name.split(".").pop() || "bin";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${id}.${ext}`;

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage
    .from("chat-media")
    .getPublicUrl(path);

  const type = getMediaType(file.type);

  return {
    id,
    type,
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

function getMediaType(mime: string): "image" | "audio" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
