-- V0034's free-tier seed matched zero rows because of a Stripe lookup_key collision that prevented the free price from ever being created under description='free'; the price is now created under description='gt_free' instead, so this migration performs the same seed against the new description value.

-- Boolean features for free tier
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL,
    CASE f.name
        WHEN 'platform_connections' THEN true
        WHEN 'media_library' THEN true
        ELSE false
    END
FROM prices p
CROSS JOIN features f
WHERE p.description = 'gt_free'
AND f.name IN ('platform_connections', 'ai_content_generation', 'scheduling',
               'analytics', 'blog', 'media_library', 'github_integration', 'remove_branding');

-- Resource limits for free tier
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'gt_free' AND f.name = 'posts_per_month' AND l.limit_name = 'posts_per_month_free';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'gt_free' AND f.name = 'platforms' AND l.limit_name = 'platforms_free';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'gt_free' AND f.name = 'media_storage_mb' AND l.limit_name = 'media_storage_mb_free';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'gt_free' AND f.name = 'team_members' AND l.limit_name = 'team_members_free';
