import type { Profile } from "@/lib/arcade-data";
import { getAvatarGradient } from "@/lib/avatar-colors";

function AvatarDisplay({ avatar, name, avatarId }: { avatar: string | null; name: string; avatarId?: string }) {
  const [from, to] = getAvatarGradient(avatarId);
  const bg = `linear-gradient(160deg, ${from}, ${to})`;

  return (
    <div className="relative h-full w-full" style={{ background: bg }}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="absolute inset-0 h-full w-full object-contain p-6 drop-shadow-2xl transition-all duration-500"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="font-display text-7xl font-black text-white/90">
            {name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

export function ProfileCard({
  profile,
  active,
  onHover,
  onSelect,
  delayMs = 0,
}: {
  profile: Profile;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  delayMs?: number;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`arcade-slide-up group relative flex w-full aspect-[3/5] flex-col overflow-hidden rounded-3xl border-2 text-left transition-all duration-300 ${
        active
          ? "scale-[1.04] border-primary bg-card"
          : "scale-100 border-border bg-card/60 opacity-80"
      }`}
    >
      <div className="relative flex-1 overflow-hidden">
        <AvatarDisplay avatar={profile.avatar} name={profile.name} avatarId={profile.avatarId} />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/4 ${active ? "bg-gradient-to-t from-primary via-primary/60 to-transparent" : "bg-gradient-to-t from-card via-card/60 to-transparent"}`} />
        <div className="absolute inset-x-0 bottom-0 px-7 py-6">
          <h2 className={`font-display text-4xl font-black uppercase leading-none tracking-tight ${active ? "text-primary-foreground" : "text-foreground/90"}`}>
            {profile.name}
          </h2>
          {profile.tagline ? (
            <p className={`mt-2 text-xs uppercase tracking-[0.3em] opacity-80 ${active ? "text-primary-foreground" : "text-foreground"}`}>
              {profile.tagline}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function NewUserCard({
  active,
  onHover,
  onSelect,
  delayMs = 0,
}: {
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  delayMs?: number;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`arcade-slide-up group relative flex w-full aspect-[3/5] flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed bg-card/20 transition-all duration-300 ${
        active
          ? "scale-[1.04] border-primary text-primary"
          : "border-border text-muted-foreground hover:text-primary"
      }`}
    >
      <span className="grid size-24 place-items-center rounded-full border-2 border-current font-display text-5xl font-bold">
        +
      </span>
      <span className="font-display text-3xl font-bold uppercase tracking-widest">New User</span>
    </button>
  );
}
