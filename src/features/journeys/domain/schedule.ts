export interface Lesson {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  durationMinutes?: number;
}
export function lessons(value: string): Lesson[] {
  try {
    const data: unknown = JSON.parse(value || '[]');
    return Array.isArray(data) ? (data as Lesson[]) : [];
  } catch {
    return [];
  }
}
