/**
 * SVG avatar icons for each preset — clean, minimal, Messianic-themed designs.
 * Replaces the old emoji symbols with purpose-built vector icons.
 */
import type { ReactNode, CSSProperties } from "react";

const S = {
  viewBox: "0 0 24 24",
  "aria-hidden": true as const,
  style: { display: "block" as const },
};

function DefaultIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="currentColor">
      <path fillRule="evenodd" d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0H5z" />
    </svg>
  );
}

function MenorahIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 4v14M8 8v6M16 8v6M5 12v5M19 12v5M4 18h16" />
    </svg>
  );
}

function StarOfDavidIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
      <path d="M12 3l7.5 13.5H4.5L12 3zM12 21l-7.5-13.5h15L12 21z" />
    </svg>
  );
}

function FishIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M3 12c3.5-6 15.5-6 19 0C18.5 18 6.5 18 3 12z" />
      <path d="M18.5 8.5l4-4.5M18.5 15.5l4 4.5" />
    </svg>
  );
}

function OliveIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M5 19C8 16 13 10 19 4" />
      <path d="M12 12c-1-3 1.5-6 4.5-4-1 3-3.5 5-4.5 4z" fill="currentColor" opacity={0.5} />
      <path d="M9 15c-1-3 1.5-6 4.5-4-1 3-3.5 5-4.5 4z" fill="currentColor" opacity={0.5} />
    </svg>
  );
}

function ShofarIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20C9 16 14 10 20 4" />
      <path d="M5 20l5-5" />
      <path d="M16 5c1.5 4 1 8-2 11" />
    </svg>
  );
}

function DoveIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 14C8 14 5 11.5 5 9c0-2 2-3 4-2C10 5 12 3.5 15 4.5l5-1.5-1 5c1 2 0 5-3 6L13 22" />
      <path d="M13 22l-2-5" />
    </svg>
  );
}

function ScrollIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="6" y="4" width="12" height="16" rx="1" />
      <path d="M6 9h12M6 14h12M9 4v16M15 4v16" />
      <circle cx="9" cy="4" r="2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="20" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="4" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="20" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PomegranateIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="12" cy="14" r="7" />
      <path d="M12 7V4M9 4h6" />
      <path d="M9 12c1 2 5 2 6 0M9 16c1 2 5 2 6 0" />
    </svg>
  );
}

function GrapesIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="currentColor">
      <circle cx="9" cy="9.5" r="2.2" />
      <circle cx="15" cy="9.5" r="2.2" />
      <circle cx="9" cy="14.5" r="2.2" />
      <circle cx="15" cy="14.5" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="12" cy="19" r="2.2" />
      <path fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="M12 4.5v3M12 4.5c2-1.5 4.5.5 4.5.5" />
    </svg>
  );
}

function LambIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18v-4C5 13 4 11 5 8c1-2 4-3 7-1 3-2 6-1 7 1 1 2 0 4-2 5v4" />
      <path d="M7 18h2.5M14.5 18H17" />
      <path d="M6 9C5 7 7 4.5 9 4.5M18 9c1-2-1-4.5-3-4.5" />
    </svg>
  );
}

function CandlesIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M8 20v-8M16 20v-8" />
      <rect x="5" y="12" width="6" height="3" rx="0.5" />
      <rect x="13" y="12" width="6" height="3" rx="0.5" />
      <ellipse cx="8" cy="7.5" rx="1" ry="2" fill="currentColor" stroke="none" opacity={0.7} />
      <ellipse cx="16" cy="7.5" rx="1" ry="2" fill="currentColor" stroke="none" opacity={0.7} />
    </svg>
  );
}

function WaterIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M2 11c2.5-4 5-5 7-3s3.5 5.5 6 3 3.5-5 7-3" />
      <path d="M2 17c2.5-4 5-5 7-3s3.5 5.5 6 3 3.5-5 7-3" />
    </svg>
  );
}

function AlephIcon({ size }: { size: number }) {
  return (
    <svg {...S} width={size} height={size} fill="currentColor">
      <text x="12" y="17.5" textAnchor="middle" fontSize="15" fontWeight="600" fontFamily="serif" fill="currentColor">
        א
      </text>
    </svg>
  );
}

type IconComponent = (props: { size: number }) => ReactNode;

const ICON_MAP: Record<string, IconComponent> = {
  default: DefaultIcon,
  menorah: MenorahIcon,
  star: StarOfDavidIcon,
  fish: FishIcon,
  olive: OliveIcon,
  shofar: ShofarIcon,
  dove: DoveIcon,
  scroll: ScrollIcon,
  pomegranate: PomegranateIcon,
  grapes: GrapesIcon,
  lamb: LambIcon,
  candles: CandlesIcon,
  water: WaterIcon,
  aleph: AlephIcon,
};

export function AvatarIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = ICON_MAP[id] ?? DefaultIcon;
  return <Icon size={size} />;
}

/** Render an avatar — handles preset icons AND data-URL / http photo uploads. */
export function AvatarDisplay({
  avatarId,
  bg,
  fg,
  username,
  className,
  size = 18,
  style,
}: {
  avatarId: string;
  bg: string;
  fg: string;
  username?: string;
  className?: string;
  size?: number;
  style?: CSSProperties;
}) {
  const isPhoto = avatarId.startsWith("data:") || avatarId.startsWith("http");
  if (isPhoto) {
    return (
      <span
        className={className}
        style={{ ...style, background: "#333", padding: 0, overflow: "hidden" }}
      >
        <img
          src={avatarId}
          alt={username ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }}
        />
      </span>
    );
  }
  if (avatarId === "default") {
    return (
      <span className={className} style={{ ...style, background: bg, color: fg }}>
        {username ? username.charAt(0).toUpperCase() : <AvatarIcon id="default" size={size} />}
      </span>
    );
  }
  return (
    <span className={className} style={{ ...style, background: bg, color: fg }}>
      <AvatarIcon id={avatarId} size={size} />
    </span>
  );
}
