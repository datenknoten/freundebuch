import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { currentFriend } from '$lib/stores/friends';

export function handleSingleKey(e: KeyboardEvent): boolean {
  const pathname = get(page).url.pathname;

  switch (e.key) {
    case 'e':
      // Edit current friend if on friend detail page
      if (get(currentFriend) && pathname.match(/^\/friends\/[^/]+$/)) {
        e.preventDefault();
        goto(`/friends/${get(currentFriend)?.id}/edit`);
        return true;
      }
      break;

    case '/': {
      e.preventDefault();
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
      if (searchInput) {
        searchInput.focus();
      } else {
        goto('/friends');
      }
      return true;
    }

    case '<':
    case ',':
      if (e.shiftKey && pathname === '/friends') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:previous-page'));
        return true;
      }
      break;

    case '>':
    case '.':
      if (e.shiftKey && pathname === '/friends') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:next-page'));
        return true;
      }
      break;
  }

  return false;
}
