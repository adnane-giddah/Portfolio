import { useState } from 'react';
import { PROFILE } from '../data/profile';

/**
 * The round portrait in the hero — just the photo, an orange rim and a
 * glow. Until public/photo.jpg exists it shows the same circle with the
 * mark in it, so the layout never shifts when the picture is dropped in.
 */
export function HeroPhoto() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="hero-photo">
      {failed ? (
        <div className="hp-empty" role="img" aria-label="Portrait placeholder">
          <span className="hp-mark">e</span>
          <span className="hp-hint">photo.jpg</span>
        </div>
      ) : (
        <img
          className="hp-img"
          src={PROFILE.photo}
          alt={PROFILE.photoAlt}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
