export const legacyTripDraftKey = 'codoc/trip-planner/draft/v2';

export function tripDraftStorageKey(owner: string | undefined) {
  return `codoc/trip-planner/draft/v3/${owner ?? 'local'}`;
}

export function hasTripDraft(owner: string | undefined) {
  try {
    return localStorage.getItem(tripDraftStorageKey(owner)) !== null
      || localStorage.getItem(legacyTripDraftKey) !== null;
  } catch {
    return false;
  }
}
