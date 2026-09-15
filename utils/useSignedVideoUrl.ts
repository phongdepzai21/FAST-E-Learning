import { useState, useEffect } from 'react';

export function useSignedVideoUrl(rawUrl: string | undefined): { signedUrl: string, isLoading: boolean } {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const url = rawUrl ? String(rawUrl).trim() : "";
    if (!url) {
      setSignedUrl("");
      setIsLoading(false);
      return;
    }

    if (url.startsWith("gs://") || url.includes("firebasestorage.googleapis.com")) {
      let isMounted = true;
      setIsLoading(true);
      
      fetch("/api/video/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url })
      })
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setSignedUrl(data.signedUrl || url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch signed URL:", err);
        if (isMounted) {
          setSignedUrl(url);
          setIsLoading(false);
        }
      });

      return () => {
        isMounted = false;
      };
    } else {
      setSignedUrl(url);
      setIsLoading(false);
    }
  }, [rawUrl]);

  return { signedUrl, isLoading };
}
