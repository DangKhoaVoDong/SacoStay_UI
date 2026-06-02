import { Router } from '@angular/router';
import type { AppNotification } from '../models/notification.models';

function parseQuery(link: string): Record<string, string> {
  const i = link.indexOf('?');
  if (i < 0) return {};
  const params = new URLSearchParams(link.slice(i + 1));
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/** Điều hướng khi bấm thông báo — khớp linkUrl từ BE. */
export function navigateFromNotification(
  router: Router,
  n: AppNotification,
  isLandlord: boolean
): void {
  const link = (n.linkUrl ?? '').trim();
  if (!link) return;

  const pathOnly = link.split('?')[0];
  const q = parseQuery(link);

  if (pathOnly.startsWith('/chat/')) {
    const peerId = pathOnly.replace(/^\/chat\//, '').trim();
    if (peerId) {
      void router.navigate(isLandlord ? ['/landlord-chat'] : ['/chat'], {
        queryParams: { with: peerId, role: isLandlord ? 'tenant' : 'tenant' }
      });
    }
    return;
  }

  if (pathOnly === '/chat' || link.includes('with=')) {
    const withId = q['with'];
    if (withId) {
      void router.navigate(isLandlord ? ['/landlord-chat'] : ['/chat'], {
        queryParams: { with: withId, role: q['role'] || 'tenant' }
      });
    }
    return;
  }

  if (pathOnly === '/owner/my-posts' || link.includes('roomPostId=')) {
    const roomPostId = q['roomPostId'];
    void router.navigate(['/owner/my-posts'], {
      queryParams: roomPostId ? { roomPostId } : {}
    });
    return;
  }

  if (pathOnly === '/membership' || link.includes('payment=success')) {
    void router.navigate(['/tenant-pricing']);
    return;
  }

  if (pathOnly.startsWith('/rooms/')) {
    void router.navigateByUrl(link);
    return;
  }

  if (pathOnly.startsWith('/')) {
    void router.navigateByUrl(link);
  }
}
