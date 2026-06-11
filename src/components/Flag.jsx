import React from 'react';
import { FLAG_ISO } from '../data/flagCodes.js';

// SVG 국기 (flag-icons, 번들 포함 — 오프라인 동작)
export default function Flag({ code, size = 18 }) {
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
