import { useEffect, useState } from 'react';
import { authStore } from '@/auth/store';
import { t } from '@/shared/i18n';
import '../templates/ui/template-journey.css';
import { loadProfile, saveProfile, type Profile } from './profileApi';
import { prepareProfileImage } from './profileImage';

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void loadProfile()
      .then(setProfile)
      .catch((error: Error) => setError(error.message));
  }, []);
  function patch(update: Partial<Profile>) {
    setProfile((old) => (old ? { ...old, ...update } : old));
    setSaved(false);
  }
  async function save() {
    if (!profile) return;
    setBusy(true);
    setError('');
    try {
      const payload = await saveProfile(profile);
      setProfile(payload);
      authStore.setState((state) => ({
        ...state,
        user: state.user ? { ...state.user, name: payload.name } : null,
      }));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function updateProfileImage(file: File) {
    setBusy(true);
    setError('');
    try {
      const avatar = await prepareProfileImage(file);
      patch({ avatar });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="template-new">
      <h1>{t('Client profile')}</h1>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">{t('Profile saved')}</p>}
      {profile && (
        <form
          className="template-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {profile.avatar && (
            <img
              src={profile.avatar}
              width={96}
              height={96}
              style={{ objectFit: 'cover', borderRadius: '50%' }}
              alt={t('Profile picture')}
            />
          )}
          <label>
            {t('Profile picture')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = '';
                if (file) void updateProfileImage(file);
              }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !profile.avatar}
            onClick={() => patch({ avatar: '' })}
          >
            {t('Remove image')}
          </button>
          <label>
            {t('Name')}
            <input
              required
              maxLength={100}
              value={profile.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <label>
            Email
            <input type="email" value={profile.email} readOnly />
          </label>
          <label>
            {t('Organization')}
            <input
              maxLength={200}
              value={profile.organization}
              onChange={(e) => patch({ organization: e.target.value })}
            />
          </label>
          <label>
            {t('Position')}
            <input
              maxLength={100}
              value={profile.position}
              onChange={(e) => patch({ position: e.target.value })}
            />
          </label>
          <label>
            {t('Phone')}
            <input
              type="tel"
              maxLength={50}
              value={profile.phone}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </label>
          <button type="submit" disabled={busy || !profile.name.trim()}>
            {t('Save profile')}
          </button>
        </form>
      )}
    </main>
  );
}
