import { Router } from 'express';
import { adminAuthenticate, requirePermission, requireSuperAdmin } from '../middleware/adminAuth.middleware.ts';
import { AdminAuthController } from '../controllers/admin/adminAuth.controller.ts';
import { AdminUsersController } from '../controllers/admin/adminUsers.controller.ts';
import { AdminDiscountsController } from '../controllers/admin/adminDiscounts.controller.ts';
import { AdminSupportController } from '../controllers/admin/adminSupport.controller.ts';
import { AdminAnalyticsController } from '../controllers/admin/adminAnalytics.controller.ts';
import { AdminAdminsController } from '../controllers/admin/adminAdmins.controller.ts';
import { AdminNotificationsController } from '../controllers/admin/adminNotifications.controller.ts';
import { AdminBlocklistController } from '../controllers/admin/adminBlocklist.controller.ts';

const router = Router();

router.post('/auth/login', (req, res, next) => {
  void AdminAuthController.login(req, res).catch(next);
});

router.get('/auth/me', adminAuthenticate, (req, res, next) => {
  void AdminAuthController.me(req as any, res).catch(next);
});

router.post('/auth/change-password', adminAuthenticate, (req, res, next) => {
  void AdminAuthController.changePassword(req as any, res).catch(next);
});

router.patch('/auth/profile', adminAuthenticate, (req, res, next) => {
  void AdminAuthController.updateProfile(req as any, res).catch(next);
});

router.post('/auth/2fa/setup', adminAuthenticate, (req, res, next) => {
  void AdminAuthController.twoFaSetup(req as any, res).catch(next);
});

router.post('/auth/2fa/enable', adminAuthenticate, (req, res, next) => {
  void AdminAuthController.twoFaEnable(req as any, res).catch(next);
});

router.post('/auth/2fa/disable', adminAuthenticate, (req, res, next) => {
  void AdminAuthController.twoFaDisable(req as any, res).catch(next);
});

router.get(
  '/users',
  adminAuthenticate,
  requirePermission('users.view'),
  (req, res, next) => {
    void AdminUsersController.list(req as any, res).catch(next);
  }
);

router.post(
  '/users/invite',
  adminAuthenticate,
  requirePermission('users.edit'),
  (req, res, next) => {
    void AdminUsersController.inviteUser(req as any, res).catch(next);
  }
);

router.get(
  '/users/stats',
  adminAuthenticate,
  requirePermission('analytics.view'),
  (req, res, next) => {
    void AdminUsersController.stats(req as any, res).catch(next);
  }
);

router.get(
  '/users/:id',
  adminAuthenticate,
  requirePermission('users.view'),
  (req, res, next) => {
    void AdminUsersController.getOne(req as any, res).catch(next);
  }
);

router.patch(
  '/users/:id/plan',
  adminAuthenticate,
  requirePermission('users.edit'),
  (req, res, next) => {
    void AdminUsersController.updatePlan(req as any, res).catch(next);
  }
);

router.patch(
  '/users/:id/toggle-delete',
  adminAuthenticate,
  requirePermission('users.delete'),
  (req, res, next) => {
    void AdminUsersController.toggleDelete(req as any, res).catch(next);
  }
);

router.get(
  '/discounts',
  adminAuthenticate,
  requirePermission('discounts.view'),
  (req, res, next) => {
    void AdminDiscountsController.list(req as any, res).catch(next);
  }
);

router.post(
  '/discounts',
  adminAuthenticate,
  requirePermission('discounts.manage'),
  (req, res, next) => {
    void AdminDiscountsController.create(req as any, res).catch(next);
  }
);

router.patch(
  '/discounts/:id',
  adminAuthenticate,
  requirePermission('discounts.manage'),
  (req, res, next) => {
    void AdminDiscountsController.update(req as any, res).catch(next);
  }
);

router.delete(
  '/discounts/:id',
  adminAuthenticate,
  requirePermission('discounts.manage'),
  (req, res, next) => {
    void AdminDiscountsController.remove(req as any, res).catch(next);
  }
);

router.get(
  '/support/my-stats',
  adminAuthenticate,
  requirePermission('support.reply'),
  (req, res, next) => {
    void AdminSupportController.myStats(req as any, res).catch(next);
  }
);

router.get(
  '/support/agents',
  adminAuthenticate,
  requirePermission('support.manage'),
  (req, res, next) => {
    void AdminSupportController.getAgents(req as any, res).catch(next);
  }
);

router.get(
  '/support/agents/stats',
  adminAuthenticate,
  requirePermission('support.manage'),
  (req, res, next) => {
    void AdminSupportController.agentStats(req as any, res).catch(next);
  }
);

router.post(
  '/support/bulk-assign',
  adminAuthenticate,
  requirePermission('support.manage'),
  (req, res, next) => {
    void AdminSupportController.bulkAssign(req as any, res).catch(next);
  }
);

router.get(
  '/support',
  adminAuthenticate,
  requirePermission('support.view'),
  (req, res, next) => {
    void AdminSupportController.list(req as any, res).catch(next);
  }
);

router.get(
  '/support/stats',
  adminAuthenticate,
  requirePermission('support.view'),
  (req, res, next) => {
    void AdminSupportController.stats(req as any, res).catch(next);
  }
);

router.patch(
  '/support/:id/reply',
  adminAuthenticate,
  requirePermission('support.reply'),
  (req, res, next) => {
    void AdminSupportController.reply(req as any, res).catch(next);
  }
);

router.patch(
  '/support/:id/status',
  adminAuthenticate,
  requirePermission('support.assign'),
  (req, res, next) => {
    void AdminSupportController.updateStatus(req as any, res).catch(next);
  }
);

router.patch(
  '/support/:id/assign',
  adminAuthenticate,
  requirePermission('support.manage'),
  (req, res, next) => {
    void AdminSupportController.assignTicket(req as any, res).catch(next);
  }
);

router.get(
  '/analytics/overview',
  adminAuthenticate,
  requirePermission('analytics.view'),
  (req, res, next) => {
    void AdminAnalyticsController.overview(req as any, res).catch(next);
  }
);

router.get(
  '/analytics/audit',
  adminAuthenticate,
  requireSuperAdmin,
  (req, res, next) => {
    void AdminAnalyticsController.auditLogs(req as any, res).catch(next);
  }
);

router.get(
  '/analytics/revenue',
  adminAuthenticate,
  requirePermission('analytics.view'),
  (req, res, next) => {
    void AdminAnalyticsController.revenueOverview(req as any, res).catch(next);
  }
);

router.get(
  '/analytics/revenue/chart',
  adminAuthenticate,
  requirePermission('analytics.view'),
  (req, res, next) => {
    void AdminAnalyticsController.revenueChart(req as any, res).catch(next);
  }
);

router.get(
  '/analytics/revenue/subscribers',
  adminAuthenticate,
  requirePermission('analytics.view'),
  (req, res, next) => {
    void AdminAnalyticsController.paidUsersList(req as any, res).catch(next);
  }
);

router.get(
  '/analytics/growth',
  adminAuthenticate,
  requirePermission('analytics.view'),
  (req, res, next) => {
    void AdminAnalyticsController.userGrowth(req as any, res).catch(next);
  }
);

router.get(
  '/analytics/health',
  adminAuthenticate,
  requirePermission('analytics.view'),
  (req, res, next) => {
    void AdminAnalyticsController.platformHealth(req as any, res).catch(next);
  }
);

router.get('/admins', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  void AdminAdminsController.list(req as any, res).catch(next);
});

router.post('/admins', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  void AdminAdminsController.create(req as any, res).catch(next);
});

router.patch('/admins/:id/permissions', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  void AdminAdminsController.updatePermissions(req as any, res).catch(next);
});

router.patch('/admins/:id/profile', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  void AdminAdminsController.updateAdminProfile(req as any, res).catch(next);
});

router.post('/admins/:id/reset-password', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  void AdminAdminsController.resetAdminPassword(req as any, res).catch(next);
});

router.post('/admins/:id/reset-2fa', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  void AdminAdminsController.resetAdmin2FA(req as any, res).catch(next);
});

// Blocklist
router.get('/blocklist', adminAuthenticate, requirePermission('blocklist.manage'), (req, res, next) => {
  void AdminBlocklistController.list(req as any, res).catch(next);
});
router.post('/blocklist', adminAuthenticate, requirePermission('blocklist.manage'), (req, res, next) => {
  void AdminBlocklistController.add(req as any, res).catch(next);
});
router.delete('/blocklist/:id', adminAuthenticate, requirePermission('blocklist.manage'), (req, res, next) => {
  void AdminBlocklistController.remove(req as any, res).catch(next);
});

router.delete('/admins/:id', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  void AdminAdminsController.deleteAdmin(req as any, res).catch(next);
});

router.post(
  '/notifications/broadcast',
  adminAuthenticate,
  requirePermission('notifications.send'),
  (req, res, next) => {
    void AdminNotificationsController.broadcast(req as any, res).catch(next);
  }
);

export default router;

