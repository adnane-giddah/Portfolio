import { useRef, useState } from 'react';

interface Props {
  images: string[];
  alt: string;
}


export function ProjectMedia({ images, alt }: Props) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (delta < -40) go(1);
    else if (delta > 40) go(-1);
  };

  return (
    <div
      className="project-media"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={(e) => e.preventDefault()}
    >
      <img src={images[index]} alt={`${alt} — screenshot ${index + 1}`} loading="lazy" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="project-media-nav prev"
            aria-label="Previous screenshot"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="project-media-nav next"
            aria-label="Next screenshot"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
          >
            ›
          </button>
          <div className="project-media-dots">
            {images.map((img, i) => (
              <span
                key={img}
                className={i === index ? 'active' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
