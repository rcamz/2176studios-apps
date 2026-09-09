import { useEffect, useRef } from 'react';

const PUBLISHER_ID = 'ca-pub-9072302221360810';

const SIZES = {
  horizontal: { width: '100%', height: 90 },
  rectangle:  { width: '100%', height: 250 },
  skyscraper: { width: '100%', height: 260 },
  auto:       { width: '100%', height: 120 },
};

export default function AdUnit({ slotId, format = 'auto', style = {} }) {
  const ref = useRef(false);
  const isPlaceholder = slotId === 'XXXXXXXXXX';

  useEffect(() => {
    if (isPlaceholder || ref.current) return;
    ref.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }, [isPlaceholder]);

  if (isPlaceholder) {
    const { width, height } = SIZES[format] ?? SIZES.auto;
    return (
      <div style={{
        width,
        height,
        background: '#d6dde5',
        border: '1.5px dashed #8fa3b1',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#5a7385',
        fontSize: '0.75rem',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        fontWeight: 600,
        ...style,
      }}>
        Ad — {format} ({height}px)
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
