import { useState, useCallback } from "react";

interface UploadResult {
  objectPath: string;
  servingUrl: string;
}

interface UsePhotoUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function usePhotoUpload(options: UsePhotoUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(5);

      try {
        const metaRes = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        if (!metaRes.ok) {
          const body = await metaRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Errore richiesta URL upload");
        }

        setProgress(30);
        const { uploadURL, objectPath } = (await metaRes.json()) as {
          uploadURL: string;
          objectPath: string;
        };

        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!uploadRes.ok) {
          throw new Error("Errore durante il caricamento del file");
        }

        setProgress(100);
        const result: UploadResult = {
          objectPath,
          servingUrl: `/api/storage${objectPath}`,
        };
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Upload fallito");
        setError(e);
        options.onError?.(e);
        return null;
      } finally {
        setIsUploading(false);
        setTimeout(() => setProgress(0), 800);
      }
    },
    [options]
  );

  return { uploadFile, isUploading, progress, error };
}
