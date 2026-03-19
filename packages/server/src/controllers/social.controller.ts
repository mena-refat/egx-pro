import { Response, NextFunction } from 'express';
import { SocialService } from '../services/social.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { sendSuccess, sendError } from '../lib/apiResponse.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const SocialController = {
  follow: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const username = req.params.username ?? '';
    const follow = await SocialService.follow(userId, username);
    sendSuccess(res, { status: follow.status }, 201);
  }),

  unfollow: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const username = req.params.username ?? '';
    await SocialService.unfollow(userId, username);
    res.status(204).send();
  }),

  followers: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 50), 10) || 50));
    const result = await SocialService.getFollowers(userId, page, limit);
    sendSuccess(res, result);
  }),

  following: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 50), 10) || 50));
    const result = await SocialService.getFollowing(userId, page, limit);
    sendSuccess(res, result);
  }),

  requests: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const requests = await SocialService.getRequests(userId);
    sendSuccess(res, requests);
  }),

  acceptRequest: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const followerId = parseInt(req.params.followerId ?? '', 10);
    if (isNaN(followerId)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    await SocialService.acceptRequest(userId, followerId);
    sendSuccess(res, { success: true });
  }),

  declineRequest: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const followerId = parseInt(req.params.followerId ?? '', 10);
    if (isNaN(followerId)) { sendError(res, 'VALIDATION_ERROR', 400); return; }
    await SocialService.declineRequest(userId, followerId);
    sendSuccess(res, { success: true });
  }),

  profile: run(async (req, res) => {
    const username = req.params.username ?? '';
    const viewer = req.user;
    const data = await SocialService.getPublicProfile(viewer, username);
    sendSuccess(res, data);
  }),

  profileFollowers: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const username = req.params.username ?? '';
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await SocialService.getProfileFollowers(username, userId, page, limit);
    sendSuccess(res, result);
  }),

  profileFollowing: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const username = req.params.username ?? '';
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await SocialService.getProfileFollowing(username, userId, page, limit);
    sendSuccess(res, result);
  }),

  settings: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const { isPrivate, showPortfolio } = req.body as { isPrivate?: boolean; showPortfolio?: boolean };
    const user = await SocialService.updateSettings(userId, { isPrivate, showPortfolio });
    sendSuccess(res, { isPrivate: user.isPrivate, showPortfolio: user.showPortfolio });
  }),

  search: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const q = (req.query.q as string) ?? (req.query.username as string) ?? '';
    const list = await SocialService.search(userId, q);
    sendSuccess(res, list);
  }),

  usernameSearch: run(async (req, res) => {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      sendError(res, 'UNAUTHORIZED', 401);
      return;
    }
    const { q, limit: limitRaw } = req.query as { q?: string; limit?: string };
    const limit = Math.min(20, Math.max(1, parseInt(String(limitRaw ?? '5'), 10) || 5));
    const list = await SocialService.usernameSearch(userId, q ?? '', limit);
    sendSuccess(res, list);
  }),
};

