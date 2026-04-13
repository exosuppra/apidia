import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface FichePreviewImageProps {
  alt: string;
  containerClassName?: string;
  gradient: string;
  icon: string;
  iconClassName?: string;
  imageClassName?: string;
  src?: string;
}

function normalizeImageSrc(src?: string): string {
  if (!src) return "";

  const trimmed = src.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  return trimmed.replace(/^http:\/\//i, "https://");
}

export default function FichePreviewImage({
  alt,
  containerClassName,
  gradient,
  icon,
  iconClassName,
  imageClassName,
  src,
}: FichePreviewImageProps) {
  const normalizedSrc = useMemo(() => normalizeImageSrc(src), [src]);
  const [hasError, setHasError] = useState(!normalizedSrc);

  useEffect(() => {
    setHasError(!normalizedSrc);
  }, [normalizedSrc]);

  if (!normalizedSrc || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br",
          gradient,
          containerClassName,
        )}
      >
        <span className={cn("drop-shadow", iconClassName)}>{icon}</span>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden bg-muted", containerClassName)}>
      <img
        src={normalizedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn("h-full w-full object-cover", imageClassName)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}