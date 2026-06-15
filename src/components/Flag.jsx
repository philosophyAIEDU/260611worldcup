import React from 'react';
import { FLAG_ISO } from '../data/flagCodes.js';
import { CLUB_CREST } from '../data/clubs/index.js';

// 팀 마크: 국가대표는 SVG 국기(flag-icons), 클럽은 고유 색상 크레스트.
export default function Flag({ code, size = 18 }) {
  const crest = CLUB_CREST[code];
  if (crest) {
    const px = Math.round(size * 1.2);
    return (
      <span
        className="club-crest"
        style={{
          width: px,
          height: px,
          background: crest.bg,
          color: crest.fg,
          borderColor: crest.accent,
          fontSize: Math.max(7, Math.round(size * 0.42)),
        }}
        role="img"
        aria-label={code}
      >
        {crest.abbr}
      </span>
    );
  }

  const iso = FLAG_ISO[code];
  if (!iso) return null;
  return (
    <span
      className={`fi fi-${iso} flag`}
      style={{ fontSize: size, verticalAlign: '-0.15em' }}
      role="img"
      aria-label={code}
    />
  );
}
