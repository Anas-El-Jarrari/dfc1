'use client';

export type KimPose = 'listen' | 'search' | 'counter' | 'unknown' | 'wait' | 'done';

interface KimProps {
  pose?: KimPose;
  size?: number;
  className?: string;
}

export default function Kim({ pose = 'listen', size = 80, className = '' }: KimProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={`kim ${className}`}
      aria-label="Kim, die Friedenstaube"
      role="img"
    >
      {/* Body */}
      <ellipse cx="50" cy="60" rx="28" ry="24" fill="#FFFDF9" stroke="#8C5A45" strokeWidth="3" />
      {/* Head: nods gently, the eye blinks */}
      <g className="kim-head">
        <circle cx="68" cy="40" r="16" fill="#FFFDF9" stroke="#8C5A45" strokeWidth="3" />
        <circle cx="64" cy="45" r="3.5" fill="#F2B8A0" opacity="0.7" />
        <g className="kim-eye">
          <circle cx="73" cy="37" r="4" fill="#3B2F2A" />
          <circle cx="74.5" cy="35.5" r="1.2" fill="white" />
        </g>
        <path d="M82 41 L90 44 L82 46 Z" fill="#E0A84A" />
      </g>
      {/* Wing */}
      {pose === 'done' ? (
        // Raised wing for done
        <path d="M30 55 Q20 30 50 45" fill="#F9E7DC" stroke="#8C5A45" strokeWidth="2.5" />
      ) : pose === 'unknown' ? (
        // Both wings raised - shrug
        <>
          <path d="M22 55 Q12 35 42 48" fill="#F9E7DC" stroke="#8C5A45" strokeWidth="2.5" />
          <path d="M78 55 Q88 35 58 48" fill="#F9E7DC" stroke="#8C5A45" strokeWidth="2.5" />
        </>
      ) : pose === 'counter' ? (
        // Wing pointing to side
        <path d="M22 58 Q5 50 25 70" fill="#F9E7DC" stroke="#8C5A45" strokeWidth="2.5" />
      ) : (
        // Default wing
        <path d="M22 58 Q15 45 45 52" fill="#F9E7DC" stroke="#8C5A45" strokeWidth="2.5" />
      )}
      {/* Feet */}
      <line x1="43" y1="82" x2="38" y2="92" stroke="#C28A5B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="43" y1="82" x2="43" y2="92" stroke="#C28A5B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="43" y1="82" x2="48" y2="92" stroke="#C28A5B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="57" y1="82" x2="52" y2="92" stroke="#C28A5B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="57" y1="82" x2="57" y2="92" stroke="#C28A5B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="57" y1="82" x2="62" y2="92" stroke="#C28A5B" strokeWidth="2.5" strokeLinecap="round" />

      {/* Pose-specific extras */}
      {pose === 'search' && (
        // Magnifying glass in wing
        <g transform="translate(18, 48)">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#8C5A45" strokeWidth="2.5" />
          <line x1="13" y1="13" x2="17" y2="17" stroke="#8C5A45" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      {pose === 'wait' && (
        // Olive branch - sitting
        <g transform="translate(28, 70)">
          <path d="M0 10 Q10 0 20 5 Q15 10 20 15" fill="none" stroke="#6B7F3A" strokeWidth="2" />
          <ellipse cx="8" cy="4" rx="4" ry="2.5" fill="#6B7F3A" transform="rotate(-30 8 4)" />
          <ellipse cx="16" cy="8" rx="4" ry="2.5" fill="#6B7F3A" transform="rotate(10 16 8)" />
        </g>
      )}
      {pose === 'done' && (
        // Checkmark
        <g transform="translate(10, 25)">
          <path d="M0 12 L5 18 L14 5" fill="none" stroke="#4E7D3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {pose === 'listen' && (
        // Head tilted indicator - subtle circle
        <ellipse cx="68" cy="40" rx="16" ry="16" fill="none" stroke="none" transform="rotate(-15 68 40)" />
      )}
    </svg>
  );
}
