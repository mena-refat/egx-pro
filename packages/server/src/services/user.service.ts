/**
 * user.service.ts — barrel re-export
 * Split into:
 *   user.profile.service.ts     — getProfile, updateProfile, checkUsername, getProfileStats
 *   user.achievements.service.ts — getUnseenAchievements, markAchievementsSeen, getAchievements
 *   user.account.service.ts     — getSecurity, referrals, sessions, uploadAvatar, deleteAccount
 */
import { UserProfileService } from './user.profile.service.ts';
import { UserAchievementsService } from './user.achievements.service.ts';
import { UserAccountService } from './user.account.service.ts';

export const UserService = {
  ...UserProfileService,
  ...UserAchievementsService,
  ...UserAccountService,
};
