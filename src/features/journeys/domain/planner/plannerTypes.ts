export type StopPriority = 'must' | 'preferred' | 'optional';
export type DataConfidence = 'confirmed' | 'estimated' | 'stale' | 'unknown';

export interface PlanningStop {
  id: string;
  title: string;
  latitude?: number;
  longitude?: number;
  priority: StopPriority;
  locked: boolean;
  fixedStartLocal?: string;
  visitMinutes: number;
  openingHours?: { from: string; to: string; confidence: DataConfidence };
  notes?: string;
}
export interface DayPlanPreferences {
  startLocal: string;
  finishLocal: string;
  walkingPace: 'relaxed' | 'normal' | 'fast';
  includeBreaks: boolean;
  returnToStart: boolean;
  maxWalkingMinutes?: number;
}
export interface RoadCost {
  seconds: number;
  meters: number;
  coordinates?: [number, number][];
}
export type RoadMatrix = (from: PlanningStop, to: PlanningStop) => RoadCost | undefined;
export type PlanningIssue = {
  stopId?: string;
  kind: 'closed' | 'too_long' | 'overlap' | 'unreachable' | 'unknown_hours' | 'missing_coordinates' | 'time_zone';
  severity: 'blocking' | 'warning' | 'info';
};

export const defaultDayPreferences: DayPlanPreferences = {
  startLocal: '09:00', finishLocal: '17:00', walkingPace: 'normal', includeBreaks: false, returnToStart: false,
};
