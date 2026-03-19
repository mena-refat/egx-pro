import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useSocialProfile } from '../hooks/useSocialProfile';
import { SocialProfilePrivateView } from '../components/features/profile/SocialProfilePrivateView';
import { SocialProfilePublicContent } from '../components/features/profile/SocialProfilePublicContent';

export default function SocialProfilePage() {
  const { t } = useTranslation('common');
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { accessToken, user: authUser } = useAuthStore();
  const isOwnProfile = Boolean(authUser && username && authUser.username === username);

  const { data, loading, error, followLoading, handleFollow, handleUnfollow } = useSocialProfile(
    username,
    accessToken,
    isOwnProfile
  );

  if (isOwnProfile && username) {
    navigate('/profile', { replace: true });
    return null;
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-[var(--text-secondary)]">
        {t('profile.loading', { defaultValue: 'Loading profile...' })}
      </div>
    );
  }

  if (error === 'NOT_FOUND' || !data) {
    return (
      <div className="p-6 text-center text-[var(--text-secondary)]">
        {t('profile.notFound', { defaultValue: 'User not found.' })}
      </div>
    );
  }

  const isPrivateBlocked = data.isPrivate && !data.portfolio?.length && !data.watchlist?.length && !isOwnProfile;

  if (isPrivateBlocked) {
    return (
      <SocialProfilePrivateView
        data={data}
        username={username ?? ''}
        followLoading={followLoading}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />
    );
  }

  return (
    <SocialProfilePublicContent
      data={data}
      username={username ?? ''}
      isOwnProfile={isOwnProfile}
      accessToken={accessToken}
      followLoading={followLoading}
      onFollow={handleFollow}
      onUnfollow={handleUnfollow}
    />
  );
}
