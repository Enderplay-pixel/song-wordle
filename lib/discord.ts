// Client-side Discord OAuth2 (implicit grant — no backend / secret needed).
// Setup: create an app at https://discord.com/developers/applications,
// add the site URL (e.g. https://song-wordle.vercel.app/ and
// http://localhost:3001/) as OAuth2 Redirects, then set the env var
// NEXT_PUBLIC_DISCORD_CLIENT_ID to the application's Client ID.

export interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export const DISCORD_CLIENT_ID =
  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? "";

const STORAGE_KEY = "songWordle_discordUser";

function redirectUri(): string {
  // Must exactly match a redirect registered in the Discord app
  return `${window.location.origin}/`;
}

export function getDiscordLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "token",
    scope: "identify",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// On page load: if Discord redirected back with a token in the URL fragment,
// fetch the user, persist it, and clean the URL. Returns the user or null.
export async function handleDiscordRedirect(): Promise<DiscordUser | null> {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token=")) return null;

  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("access_token");
  // Clean the token out of the URL immediately
  history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!token) return null;

  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    const user: DiscordUser = {
      id: d.id,
      username: d.username,
      displayName: d.global_name || d.username,
      avatarUrl: d.avatar
        ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=64`
        : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

export function loadStoredDiscordUser(): DiscordUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DiscordUser) : null;
  } catch {
    return null;
  }
}

export function logoutDiscord(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
