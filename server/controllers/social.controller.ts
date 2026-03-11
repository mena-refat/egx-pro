import { Response, NextFunction } from 'express';
import { SocialService } from '../services/social.service.ts';
import type { AuthRequest } from '../routes/types.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const SocialController = {
  follow: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const username = req.params.username ?? '';
    const follow = await SocialService.follow(userId, username);
    res.status(201).json({ data: { status: follow.status } });
  }),

  unfollow: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const username = req.params.username ?? '';
    await SocialService.unfollow(userId, username);
    res.status(204).send();
  }),

  followers: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const followers = await SocialService.getFollowers(userId);
    res.json({ data: followers });
  }),

  following: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const following = await SocialService.getFollowing(userId);
    res.json({ data: following });
  }),

  requests: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const requests = await SocialService.getRequests(userId);
    res.json({ data: requests });
  }),

  acceptRequest: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const followerId = req.params.followerId ?? '';
    await SocialService.acceptRequest(userId, followerId);
    res.json({ success: true });
  }),

  declineRequest: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const followerId = req.params.followerId ?? '';
    await SocialService.declineRequest(userId, followerId);
    res.json({ success: true });
  }),

  profile: run(async (req, res) => {
    const username = req.params.username ?? '';
    const viewer = req.user;
    const data = await SocialService.getPublicProfile(viewer, username);
    res.json({ data });
  }),

  settings: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const { isPrivate, showPortfolio } = req.body as { isPrivate?: boolean; showPortfolio?: boolean };
    const user = await SocialService.updateSettings(userId, { isPrivate, showPortfolio });
    res.json({ data: { isPrivate: user.isPrivate, showPortfolio: user.showPortfolio } });
  }),

  search: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const q = (req.query.q as string) ?? (req.query.username as string) ?? '';
    const list = await SocialService.search(userId, q);
    res.json({ data: list });
  }),
};

