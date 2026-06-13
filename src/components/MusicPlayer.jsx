import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n.jsx';
import song1 from '../assets/audio/song1.mp3';
import song2 from '../assets/audio/song2.mp3';

const TRACKS = [song1, song2];

// 페이지 최상단의 눈에 띄는 배경음악 바.
// 브라우저 자동재생 정책상 첫 재생은 사용자가 ▶ 를 눌러야 시작된다.
export default function MusicPlayer() {
  const { t } = useLang();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(0);

  // 곡 변경 시 소스를 바꾸고, 재생 중이었다면 이어서 재생.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.src = TRACKS[track];
    a.volume = 0.45;
    if (playing) a.play().catch(() => {});
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const choose = (i) => {
    if (i === track) {
      toggle();
      return;
    }
    setTrack(i); // 효과가 소스 교체 후 자동 재생
    setPlaying(true);
  };

  return (
    <div className="musicbar">
      <audio ref={audioRef} loop />
      <span className="musicbar-label">🎵 {t('music.bg')}</span>
      <button
        className={`musicbar-btn primary ${playing ? 'on' : ''}`}
        onClick={toggle}
        title={t(playing ? 'music.pause' : 'music.play')}
      >
        {playing ? `⏸ ${t('music.pauseShort')}` : `▶ ${t('music.playShort')}`}
      </button>
      <button
        className={`musicbar-btn ${playing && track === 0 ? 'active' : ''}`}
        onClick={() => choose(0)}
        title={t('music.track', { n: 1 })}
      >
        {t('music.trackShort', { n: 1 })}
      </button>
      <button
        className={`musicbar-btn ${playing && track === 1 ? 'active' : ''}`}
        onClick={() => choose(1)}
        title={t('music.track', { n: 2 })}
      >
        {t('music.trackShort', { n: 2 })}
      </button>
    </div>
  );
}
