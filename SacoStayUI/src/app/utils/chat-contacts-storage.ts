export interface StoredChatContact {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role?: string;
}

function key(ownerUserId: string): string {
  return `saco_chat_contacts_${ownerUserId}`;
}

export function loadStoredChatContacts(ownerUserId: string): StoredChatContact[] {
  if (!ownerUserId) return [];
  try {
    const raw = localStorage.getItem(key(ownerUserId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChatContact[];
    return Array.isArray(parsed) ? parsed.filter((c) => c?.id) : [];
  } catch {
    return [];
  }
}

export function upsertStoredChatContact(ownerUserId: string, contact: StoredChatContact): void {
  if (!ownerUserId || !contact.id) return;
  const list = loadStoredChatContacts(ownerUserId).filter((c) => c.id !== contact.id);
  list.unshift(contact);
  localStorage.setItem(key(ownerUserId), JSON.stringify(list.slice(0, 50)));
}
