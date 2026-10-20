import { writable } from 'svelte/store';
import { FilterModeStore } from './filter-mode.js';
import { HintModeStore } from './hint-mode.js';
import { OpenModeStore } from './open-mode.js';

export interface FriendDetailLink {
  url: string;
  type: 'internal' | 'external' | 'protocol';
}

/** Every keyboard hint mode of the app; the shortcut handlers drive them, the pages render them. */
export class KeyboardModesStore {
  public readonly friends = new OpenModeStore<string>();
  public readonly friendLinks = new OpenModeStore<FriendDetailLink>();
  public readonly collectives = new OpenModeStore<string>();
  /** The friend ids of the members listed on a collective detail page. */
  public readonly members = new OpenModeStore<string>();
  public readonly encounters = new OpenModeStore<string>();
  /** The friend ids linked on an encounter detail page. */
  public readonly encounterFriends = new OpenModeStore<string>();
  public readonly editCircle = new HintModeStore();
  public readonly deleteCircle = new HintModeStore();
  /** Shared by `editCircle` and `deleteCircle`. */
  public readonly visibleCircleIds = writable<string[]>([]);
  public readonly filter = new FilterModeStore();

  /** Leaves every mode; the visible item lists stay, they belong to the rendered page. */
  public reset() {
    for (const mode of this.modes()) {
      mode.reset();
    }
  }

  private modes() {
    return [
      this.friends,
      this.friendLinks,
      this.collectives,
      this.members,
      this.encounters,
      this.encounterFriends,
      this.editCircle,
      this.deleteCircle,
      this.filter,
    ];
  }
}
