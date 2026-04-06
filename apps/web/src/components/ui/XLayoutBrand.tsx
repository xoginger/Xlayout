/**
 * Creado y diseñado por XO
 * XLayout Brand — Componentes de marca SVG reutilizables
 * ─────────────────────────────────────────────────────────────────────────────
 * Fuente única de identidad visual para todo el proyecto.
 * Usa los SVG vectoriales oficiales como base.
 */

import React from 'react';

// ─── Colores oficiales de marca ─────────────────────────────────────────────
export const BRAND_COLORS = {
  cyanLight: '#00D4FF',
  cyanMid: '#00BFFF',
  blueRoyal: '#2563EB',
  navyDark: '#1E3A8A',
  bluePrimary: '#1D4ED8',
  bgDark: '#2e3339',
} as const;

// ─── Icono X (compacto) — para sidebar, favicon, toolbar, elementos pequeños ───
interface XIconProps {
  size?: number;
  className?: string;
}

export const XIcon = ({ size = 32, className = '' }: XIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="none"
    width={size}
    height={size}
    className={className}
  >
    {/* Brazo superior-izquierdo (cyan claro) */}
    <path d="M28 36 L84 36 L140 128 L112 172" fill={BRAND_COLORS.cyanLight} />
    {/* Brazo inferior-izquierdo (cyan medio) */}
    <path d="M112 84 L140 128 L84 220 L28 220" fill={BRAND_COLORS.cyanMid} />
    {/* Brazo superior-derecho (navy oscuro) */}
    <path d="M228 36 L172 36 L116 128 L144 172" fill={BRAND_COLORS.navyDark} />
    {/* Brazo inferior-derecho (azul medio) */}
    <path d="M144 84 L116 128 L172 220 L228 220" fill={BRAND_COLORS.blueRoyal} />
    {/* Nodo central — diamante */}
    <rect x="108" y="108" width="40" height="40" rx="4" transform="rotate(45 128 128)" fill={BRAND_COLORS.bluePrimary} />
  </svg>
);

// ─── Logo Horizontal — para header, login, splash, branding principal ────────
interface LogoHorizontalProps {
  height?: number;
  className?: string;
  textColor?: string;
}

export const LogoHorizontal = ({ height = 36, className = '', textColor = 'white' }: LogoHorizontalProps) => {
  // Relación de aspecto del viewBox: 800/200 = 4
  const width = height * 4;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 200"
      fill="none"
      width={width}
      height={height}
      className={className}
    >
      {/* Icono X escalado */}
      <g transform="translate(30, 15) scale(0.66)">
        <path d="M28 36 L84 36 L140 128 L112 172" fill={BRAND_COLORS.cyanLight} />
        <path d="M112 84 L140 128 L84 220 L28 220" fill={BRAND_COLORS.cyanMid} />
        <path d="M228 36 L172 36 L116 128 L144 172" fill={BRAND_COLORS.navyDark} />
        <path d="M144 84 L116 128 L172 220 L228 220" fill={BRAND_COLORS.blueRoyal} />
        <rect x="108" y="108" width="40" height="40" rx="4" transform="rotate(45 128 128)" fill={BRAND_COLORS.bluePrimary} />
      </g>
      {/* Texto XLAYOUT */}
      <text
        x="220"
        y="130"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="72"
        fontWeight="900"
        letterSpacing="12"
        fill={textColor}
      >
        XLAYOUT
      </text>
    </svg>
  );
};

// ─── Loading Spinner — animación de carga con la X de marca ─────────────────
interface LoadingXProps {
  size?: number;
  className?: string;
}

export const LoadingX = ({ size = 48, className = '' }: LoadingXProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="none"
    width={size}
    height={size}
    className={className}
  >
    <style>{`
      @keyframes xPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
      }
      @keyframes xSpin {
        0% { transform: rotate(45deg); }
        100% { transform: rotate(405deg); }
      }
      .xload-tl { animation: xPulse 1.6s ease-in-out infinite 0s; }
      .xload-bl { animation: xPulse 1.6s ease-in-out infinite 0.2s; }
      .xload-tr { animation: xPulse 1.6s ease-in-out infinite 0.4s; }
      .xload-br { animation: xPulse 1.6s ease-in-out infinite 0.6s; }
      .xload-diamond {
        transform-origin: 128px 128px;
        animation: xSpin 2s linear infinite;
      }
    `}</style>
    <path className="xload-tl" d="M28 36 L84 36 L140 128 L112 172" fill={BRAND_COLORS.cyanLight} />
    <path className="xload-bl" d="M112 84 L140 128 L84 220 L28 220" fill={BRAND_COLORS.cyanMid} />
    <path className="xload-tr" d="M228 36 L172 36 L116 128 L144 172" fill={BRAND_COLORS.navyDark} />
    <path className="xload-br" d="M144 84 L116 128 L172 220 L228 220" fill={BRAND_COLORS.blueRoyal} />
    <rect className="xload-diamond" x="108" y="108" width="40" height="40" rx="4" fill={BRAND_COLORS.bluePrimary} />
  </svg>
);

// ─── Logo compacto con nombre — para headers estrechos ──────────────────────
interface LogoCompactProps {
  height?: number;
  className?: string;
  textColor?: string;
}

export const LogoCompact = ({ height = 28, className = '', textColor = 'white' }: LogoCompactProps) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`}>
    <XIcon size={height} />
    <span
      style={{ color: textColor, fontSize: height * 0.5, lineHeight: 1 }}
      className="font-black tracking-widest"
    >
      XLayout
    </span>
  </span>
);
