import type { LocalTripDraft } from '../../api/tripDraft';

export interface TripPlannerState {
  draft: LocalTripDraft;
  past: LocalTripDraft[];
  future: LocalTripDraft[];
}

export type PlannerCommand =
  | { type: 'edit'; changes: Partial<LocalTripDraft> }
  | { type: 'open'; draft: LocalTripDraft }
  | { type: 'undo' }
  | { type: 'redo' };

const historyLimit = 50;

export function plannerReducer(state: TripPlannerState, command: PlannerCommand): TripPlannerState {
  switch (command.type) {
    case 'open': return { draft: command.draft, past: [], future: [] };
    case 'edit':
      return {
        draft: { ...state.draft, ...command.changes },
        past: [...state.past.slice(1 - historyLimit), state.draft],
        future: [],
      };
    case 'undo': {
      const draft = state.past.at(-1);
      return draft ? { draft, past: state.past.slice(0, -1), future: [state.draft, ...state.future] } : state;
    }
    case 'redo': {
      const [draft, ...future] = state.future;
      return draft ? { draft, past: [...state.past, state.draft], future } : state;
    }
  }
}
