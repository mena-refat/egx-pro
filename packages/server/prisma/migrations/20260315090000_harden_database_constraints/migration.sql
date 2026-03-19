-- Prevent duplicate watchlist entries per user/ticker.
CREATE UNIQUE INDEX "Watchlist_userId_ticker_key" ON "Watchlist"("userId", "ticker");

-- A referred user can only belong to one referral record.
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- Operational indexes for common lookups and maintenance jobs.
CREATE INDEX "User_isDeleted_deletionScheduledFor_idx" ON "User"("isDeleted", "deletionScheduledFor");
CREATE INDEX "User_plan_planExpiresAt_idx" ON "User"("plan", "planExpiresAt");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_userId_isRevoked_expiresAt_idx" ON "RefreshToken"("userId", "isRevoked", "expiresAt");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE INDEX "Portfolio_ticker_idx" ON "Portfolio"("ticker");
CREATE INDEX "Goal_deadline_idx" ON "Goal"("deadline");
CREATE INDEX "Analysis_ticker_createdAt_idx" ON "Analysis"("ticker", "createdAt");
CREATE INDEX "Referral_referrerId_status_createdAt_idx" ON "Referral"("referrerId", "status", "createdAt");
CREATE INDEX "Prediction_status_expiresAt_idx" ON "Prediction"("status", "expiresAt");
CREATE INDEX "Prediction_userId_createdAt_idx" ON "Prediction"("userId", "createdAt");
CREATE INDEX "DiscountCode_active_expiresAt_idx" ON "DiscountCode"("active", "expiresAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- User/account sanity constraints.
ALTER TABLE "User"
ADD CONSTRAINT "User_aiAnalysisUsedThisMonth_non_negative" CHECK ("aiAnalysisUsedThisMonth" >= 0),
ADD CONSTRAINT "User_totalReferrals_non_negative" CHECK ("totalReferrals" >= 0),
ADD CONSTRAINT "User_referralProDaysRemaining_non_negative" CHECK ("referralProDaysRemaining" >= 0),
ADD CONSTRAINT "User_loginStreak_non_negative" CHECK ("loginStreak" >= 0),
ADD CONSTRAINT "User_usernameChangeCount_non_negative" CHECK ("usernameChangeCount" >= 0),
ADD CONSTRAINT "User_failedLoginAttempts_non_negative" CHECK ("failedLoginAttempts" >= 0),
ADD CONSTRAINT "User_investmentHorizon_non_negative" CHECK ("investmentHorizon" IS NULL OR "investmentHorizon" >= 0),
ADD CONSTRAINT "User_monthlyBudget_non_negative" CHECK ("monthlyBudget" IS NULL OR "monthlyBudget" >= 0);

-- Portfolio and goals should never store impossible values.
ALTER TABLE "Portfolio"
ADD CONSTRAINT "Portfolio_shares_positive" CHECK ("shares" > 0),
ADD CONSTRAINT "Portfolio_avgPrice_positive" CHECK ("avgPrice" > 0);

ALTER TABLE "Goal"
ADD CONSTRAINT "Goal_targetAmount_positive" CHECK ("targetAmount" > 0),
ADD CONSTRAINT "Goal_currentAmount_non_negative" CHECK ("currentAmount" >= 0);

ALTER TABLE "Watchlist"
ADD CONSTRAINT "Watchlist_targetPrice_positive" CHECK ("targetPrice" IS NULL OR "targetPrice" > 0);

ALTER TABLE "Analysis"
ADD CONSTRAINT "Analysis_priceAtAnalysis_positive" CHECK ("priceAtAnalysis" IS NULL OR "priceAtAnalysis" > 0),
ADD CONSTRAINT "Analysis_targetPrice_positive" CHECK ("targetPrice" IS NULL OR "targetPrice" > 0),
ADD CONSTRAINT "Analysis_stopLoss_positive" CHECK ("stopLoss" IS NULL OR "stopLoss" > 0),
ADD CONSTRAINT "Analysis_priceAfter7d_positive" CHECK ("priceAfter7d" IS NULL OR "priceAfter7d" > 0),
ADD CONSTRAINT "Analysis_priceAfter30d_positive" CHECK ("priceAfter30d" IS NULL OR "priceAfter30d" > 0),
ADD CONSTRAINT "Analysis_accuracyScore_range" CHECK ("accuracyScore" IS NULL OR ("accuracyScore" >= 0 AND "accuracyScore" <= 100));

ALTER TABLE "Prediction"
ADD CONSTRAINT "Prediction_targetPrice_positive" CHECK ("targetPrice" > 0),
ADD CONSTRAINT "Prediction_priceAtCreation_positive" CHECK ("priceAtCreation" > 0),
ADD CONSTRAINT "Prediction_resolvedPrice_positive" CHECK ("resolvedPrice" IS NULL OR "resolvedPrice" > 0),
ADD CONSTRAINT "Prediction_pointsEarned_non_negative" CHECK ("pointsEarned" IS NULL OR "pointsEarned" >= 0),
ADD CONSTRAINT "Prediction_accuracyPct_range" CHECK ("accuracyPct" IS NULL OR ("accuracyPct" >= 0 AND "accuracyPct" <= 100));

ALTER TABLE "UserPredictionStats"
ADD CONSTRAINT "UserPredictionStats_totalPredictions_non_negative" CHECK ("totalPredictions" >= 0),
ADD CONSTRAINT "UserPredictionStats_correctPredictions_non_negative" CHECK ("correctPredictions" >= 0),
ADD CONSTRAINT "UserPredictionStats_totalPoints_non_negative" CHECK ("totalPoints" >= 0),
ADD CONSTRAINT "UserPredictionStats_accuracyRate_range" CHECK ("accuracyRate" >= 0 AND "accuracyRate" <= 100),
ADD CONSTRAINT "UserPredictionStats_currentStreak_non_negative" CHECK ("currentStreak" >= 0),
ADD CONSTRAINT "UserPredictionStats_bestStreak_non_negative" CHECK ("bestStreak" >= 0);

ALTER TABLE "DiscountCode"
ADD CONSTRAINT "DiscountCode_value_non_negative" CHECK ("value" >= 0),
ADD CONSTRAINT "DiscountCode_maxUses_positive" CHECK ("maxUses" IS NULL OR "maxUses" > 0),
ADD CONSTRAINT "DiscountCode_usedCount_non_negative" CHECK ("usedCount" >= 0);
