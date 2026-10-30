'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  name: string;
  className: string;
}

// Falls back to the initial-letter avatar when the logo URL is dead, instead of showing a broken-image icon and alt text.
export function ShopLogoImage({ src, name, className }: Props) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The server-rendered <img> can fail before React hydrates, and that error event is then never seen by onError.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div
        aria-hidden
        className={`${className} flex items-center justify-center rounded-2xl bg-muted font-serif text-3xl font-bold text-primary`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo hosts are not known in advance
    <img
      ref={ref}
      src={src}
      alt={`${name} logo`}
      className={`${className} rounded-2xl object-cover`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
