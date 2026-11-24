'use client';
// 캐릭터 말풍선 위젯 — 캐릭터를 누르면 대사가 말풍선으로 하나씩 떠오릅니다.
// (원본: 캐릭터 말풍선 위젯 v2.0 / 폰트: 갈무리 Galmuri, SIL Open Font License 1.1)
// 고칠 것은 아래 「설정」 칸뿐입니다. 그 밑은 건드리지 마세요.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePathname } from 'next/navigation';

/* ===================== 설정 (여기만 고치세요) ===================== */

// 캐릭터 이미지 — 저장소의 public 폴더에 올린 파일 이름 (예: /character.png)
const IMAGE = '/character.png';
// 임시 이미지 주소 — 위 파일이 아직 없을 때만 대신 쓰입니다. 티스토리 주소는 기한이 지나면 안 보입니다
// (이 주소는 2026-11-30 23:59 이후 만료). public에 파일을 올린 뒤에는 쓰이지 않습니다.
const IMAGE_TEMP =
  'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FEzbSM%2FdJMcaam95II%2FAAAAAAAAAAAAAAAAAAAAAO928kA1zPT9PvyB0zkmB_OkxAj-cKBUG_TpLI2H-e8U%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1796050799%26allow_ip%3D%26allow_referer%3D%26signature%3DEh%252FZxmOpyITTJRp5Fn7ube4mzvg%253D';

// 대사 — 캐릭터를 누를 때마다 위에서부터 차례로 나옵니다 (따옴표 안에 적고, 줄 끝에 쉼표)
const LINES = ['같○l', '인테己løł를', 'ぁĦ봐요', '🩶', '🩵'];

const RANDOM = false;          // true 로 바꾸면 순서 없이 무작위로 나옵니다
const MAX = 3;                 // 화면에 동시에 보이는 말풍선 수
const HOME_ONLY = true;       // true: 메인 화면에서만 보임 · false: 모든 화면에서 보임
const SHOW_ON_MOBILE = false;   // false: 모바일(화면 폭 768px 이하)에서는 숨김 · true: 모바일에서도 보임

const SIZE = 200;              // 캐릭터 가로 크기 (px)
const BUBBLE_WIDTH = 180;      // 말풍선 최대 너비 (px)
const FONT_SIZE = 14;          // 말풍선 글자 크기 (px)
const AREA = 210;              // 말풍선이 쌓이는 높이 (px) — 말풍선이 잘리면 키우세요
const ALIGN: 'center' | 'right' | 'left' = 'center'; // 가로 위치: 'center'(가운데) · 'right'(오른쪽) · 'left'(왼쪽)
const SIDE = 60;              // 오른쪽·왼쪽 정렬일 때 화면 끝에서 떨어진 거리 (px) — 가운데면 쓰이지 않음
const FEET_Y = 1000;            // 캐릭터 발 끝의 위치 — 화면 맨 위에서 아래로 몇 px인지. 클수록 아래로 내려감 (말풍선이 위쪽 이미지와 겹치면 키우세요)
const MIN_BOTTOM = 40;         // 화면이 낮아도 캐릭터가 화면 아래에서 이만큼은 떨어지게 (px)
const RADIUS = 18;             // 말풍선 모서리 둥글기 (px)
const SPEED = 0.32;            // 말풍선 움직임 속도 (초)

const BUBBLE_COLOR = '#ffffff'; // 말풍선 바탕색
const LINE_COLOR = '#37324a';   // 말풍선 테두리색
const TEXT_COLOR = '#37324a';   // 글자색

/* ===================== 여기부터는 고치지 마세요 ===================== */

const FALLBACK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><circle cx='60' cy='62' r='46' fill='%23f4f2fb' stroke='%2337324a' stroke-width='2'/><circle cx='46' cy='58' r='5' fill='%2337324a'/><circle cx='74' cy='58' r='5' fill='%2337324a'/><path d='M50 76 q10 9 20 0' fill='none' stroke='%2337324a' stroke-width='2' stroke-linecap='round'/></svg>";

const SOURCES = [IMAGE, IMAGE_TEMP, FALLBACK];
const OPACITY = [1, 0.6, 0.32, 0.2]; // 위로 갈수록 연해지는 단계

const CSS = `
.cw{--char:120px;--bubw:180px;--font:14px;--area:210px;--ink:#37324a;--text:#37324a;--bubble:#fff;
  --radius:18px;--tail:14px;--spd:.32s;--right:60px;--bottom:100px;--mobile:flex;
  width:max(var(--char),calc(var(--bubw) + 8px));margin:0 auto;display:flex;flex-direction:column;align-items:center;
  position:fixed;right:var(--right);bottom:var(--bottom);z-index:60;
  text-align:center;color:var(--text);font:var(--font)/1.8 'Galmuri14','Galmuri11',monospace}
.cw *{box-sizing:border-box}
.cw-bubbles{width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:var(--area)}
.cw-row{display:grid;grid-template-rows:0fr;transition:grid-template-rows var(--spd) ease}
.cw-row.on{grid-template-rows:1fr}
.cw-row>div{overflow:hidden;padding:4px 4px 24px}
.cw-bub{position:relative;margin:0 auto;max-width:var(--bubw);word-break:keep-all;padding:11px 15px;
  background:var(--bubble);border:1px solid var(--ink);border-radius:var(--radius);opacity:0;
  transform:translateY(8px) scale(.9);transition:transform var(--spd) cubic-bezier(.34,1.5,.64,1),opacity var(--spd)}
.cw-bub::after{content:'';position:absolute;left:50%;bottom:calc(var(--tail) / -2 - 1px);width:var(--tail);height:var(--tail);
  margin-left:calc(var(--tail) / -2);background:var(--bubble);border:1px solid var(--ink);border-top:0;border-left:0;
  border-radius:0 0 3px 0;transform:rotate(45deg)}
.cw-row.on .cw-bub{opacity:var(--o,1);transform:none}
.cw-row.out{grid-template-rows:1fr;transition:none}
.cw-row.out .cw-bub{opacity:0;transform:translateY(-6px) scale(.97);transition:opacity var(--spd) ease,transform var(--spd) ease}
.cw-char{display:block;width:var(--char);height:auto;cursor:pointer;user-select:none;-webkit-user-drag:none}
@media(prefers-reduced-motion:reduce){.cw-row,.cw-bub{transition-duration:0s}}
@media(max-width:768px){.cw{display:var(--mobile)}}
`;

interface Bubble {
  key: number;
  text: string;
  on: boolean;   // 떠오른 상태
  out: boolean;  // 사라지는 중
}

export function CharacterWidget() {
  const pathname = usePathname();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [srcIdx, setSrcIdx] = useState(0);
  const keyRef = useRef(0);
  const lineRef = useRef(0);
  const armed = useRef<Set<number>>(new Set());   // 이미 떠오르게 예약한 말풍선
  const dying = useRef<Set<number>>(new Set());   // 이미 지우기 예약한 말풍선
  const timers = useRef<number[]>([]);

  // 갈무리 폰트 (한 번만 불러옴)
  useEffect(() => {
    if (document.getElementById('cw-galmuri')) return;
    const l = document.createElement('link');
    l.id = 'cw-galmuri';
    l.rel = 'stylesheet';
    l.href = 'https://cdn.jsdelivr.net/npm/galmuri@latest/dist/galmuri.css';
    document.head.appendChild(l);
  }, []);

  // 새 말풍선은 한 박자 뒤에 떠오르게, 밀려난 말풍선은 사라진 뒤 지우기
  useEffect(() => {
    bubbles.filter(b => !b.on && !b.out && !armed.current.has(b.key)).forEach(b => {
      armed.current.add(b.key);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setBubbles(p => p.map(x => (x.key === b.key && !x.out ? { ...x, on: true } : x)));
      }));
    });
    bubbles.filter(b => b.out && !dying.current.has(b.key)).forEach(b => {
      dying.current.add(b.key);
      timers.current.push(window.setTimeout(() => {
        setBubbles(p => p.filter(x => x.key !== b.key));
      }, SPEED * 1000 + 30));
    });
  }, [bubbles]);

  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

  // 메인이 아닌 화면으로 가면 떠 있던 말풍선을 비워서, 돌아왔을 때 새로 시작하게 함
  useEffect(() => {
    if (HOME_ONLY && pathname !== '/') setBubbles([]);
  }, [pathname]);

  if (LINES.length === 0) return null;
  if (HOME_ONLY && pathname !== '/') return null;

  const click = () => {
    const key = ++keyRef.current;
    const text = RANDOM
      ? LINES[Math.floor(Math.random() * LINES.length)]
      : LINES[lineRef.current++ % LINES.length];
    setBubbles(prev => {
      const live = prev.filter(b => !b.out);
      const retire = new Set(live.slice(0, Math.max(0, live.length + 1 - MAX)).map(b => b.key));
      return [
        ...prev.map(b => (retire.has(b.key) ? { ...b, on: false, out: true } : b)),
        { key, text, on: false, out: false },
      ];
    });
  };

  const live = bubbles.filter(b => !b.out);
  const place: CSSProperties =
    ALIGN === 'center' ? { left: '50%', right: 'auto', transform: 'translateX(-50%)' }
    : ALIGN === 'left' ? { left: SIDE, right: 'auto' }
    : { right: SIDE };
  const vars = {
    ...place,
    '--char': `${SIZE}px`,
    '--bubw': `${BUBBLE_WIDTH}px`,
    '--font': `${FONT_SIZE}px`,
    '--area': `${AREA}px`,
    '--bottom': `max(${MIN_BOTTOM}px, calc(100vh - ${FEET_Y}px))`,
    '--radius': `${RADIUS}px`,
    '--spd': `${SPEED}s`,
    '--bubble': BUBBLE_COLOR,
    '--ink': LINE_COLOR,
    '--text': TEXT_COLOR,
    '--mobile': SHOW_ON_MOBILE ? 'flex' : 'none',
  } as CSSProperties;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cw" style={vars}>
        <div className="cw-bubbles">
          {bubbles.map(b => {
            const k = live.indexOf(b);
            const o = b.out ? undefined : (OPACITY[live.length - 1 - k] ?? 0.15);
            return (
              <div key={b.key} className={`cw-row${b.on ? ' on' : ''}${b.out ? ' out' : ''}`}>
                <div>
                  <p className="cw-bub" style={o === undefined ? undefined : ({ '--o': o } as CSSProperties)}>
                    {b.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="cw-char"
          src={SOURCES[srcIdx]}
          alt="캐릭터"
          draggable={false}
          onClick={click}
          onError={() => setSrcIdx(i => Math.min(i + 1, SOURCES.length - 1))}
        />
      </div>
    </>
  );
}
