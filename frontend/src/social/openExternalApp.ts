/** Safe to import from server components: browser globals are only read when called. */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;

  const mobileUserAgent = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  const iPadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return mobileUserAgent || iPadDesktopMode;
}

function isAndroid(): boolean {
  return typeof window !== "undefined" && /Android/i.test(navigator.userAgent);
}

function getMessengerUsername(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const username = parsedUrl.pathname.split("/").filter(Boolean)[0];
    return username ? decodeURIComponent(username) : null;
  } catch {
    return null;
  }
}

/**
 * Force-opens an installed Messenger app from a user click.
 * Android uses Chrome's intent URL with an HTTPS browser fallback. iOS uses
 * Messenger's custom scheme without a timer because the target audience has
 * Messenger installed and a delayed fallback would navigate the background
 * browser tab away from the website.
 */
export function openMessengerApp(
  messengerUrl: string,
  pageId?: string,
): void {
  if (typeof window === "undefined" || !messengerUrl) return;

  const username = getMessengerUsername(messengerUrl);
  const threadId = pageId?.trim();
  if (!username || !threadId || !/^\d+$/.test(threadId) || !isMobile()) {
    window.open(messengerUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if (isAndroid()) {
    const encodedFallback = encodeURIComponent(messengerUrl);
    window.location.assign(
      `intent://user-thread/${threadId}#Intent;scheme=fb-messenger;package=com.facebook.orca;S.browser_fallback_url=${encodedFallback};end`,
    );
    return;
  }

  window.location.assign(`fb-messenger://user-thread/${threadId}`);
}
