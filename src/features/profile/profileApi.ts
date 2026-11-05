import { authFetch } from '@/shared/api/client';

export interface Profile {
  id: string;
  name: string;
  email: string;
  organization: string;
  position: string;
  phone: string;
  avatar: string;
}

async function readProfileResponse(response: Response): Promise<Profile> {
  const payload = (await response.json()) as Profile & { error?: string };
  if (!response.ok) throw new Error(payload.error);
  return payload;
}

export async function loadProfile(): Promise<Profile> {
  return readProfileResponse(await authFetch('/api/profile'));
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const response = await authFetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  return readProfileResponse(response);
}
