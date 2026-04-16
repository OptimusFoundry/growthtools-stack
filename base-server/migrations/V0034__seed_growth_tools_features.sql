-- Seed Growth Tools features, limits, and plan mappings

-- ============================================================================
-- FEATURES
-- ============================================================================

INSERT INTO features (name, description) VALUES
    ('platform_connections', 'Connect social media platform accounts'),
    ('ai_content_generation', 'Generate posts and content with Claude AI'),
    ('scheduling', 'Schedule posts for future publishing'),
    ('analytics', 'View engagement metrics and performance data'),
    ('blog', 'Create and publish SEO-optimized blog posts'),
    ('media_library', 'Upload and manage images and videos'),
    ('github_integration', 'Auto-generate posts from GitHub activity'),
    ('remove_branding', 'Remove Growth Tools branding'),
    ('posts_per_month', 'Number of posts per month'),
    ('platforms', 'Number of connected platforms'),
    ('media_storage_mb', 'Media storage in megabytes'),
    ('team_members', 'Number of team members');

-- ============================================================================
-- LIMITS
-- ============================================================================

-- Posts per month
INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'posts_per_month_free', 10 FROM features WHERE name = 'posts_per_month';

INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'posts_per_month_pro', 100 FROM features WHERE name = 'posts_per_month';

-- Platforms
INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'platforms_free', 2 FROM features WHERE name = 'platforms';

INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'platforms_pro', 5 FROM features WHERE name = 'platforms';

-- Media storage (MB)
INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'media_storage_mb_free', 100 FROM features WHERE name = 'media_storage_mb';

INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'media_storage_mb_pro', 1000 FROM features WHERE name = 'media_storage_mb';

INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'media_storage_mb_team', 10000 FROM features WHERE name = 'media_storage_mb';

-- Team members
INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'team_members_free', 1 FROM features WHERE name = 'team_members';

INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'team_members_pro', 1 FROM features WHERE name = 'team_members';

INSERT INTO limits (feature_id, limit_name, limit_value)
SELECT id, 'team_members_team', 5 FROM features WHERE name = 'team_members';

-- ============================================================================
-- FREE TIER
-- ============================================================================

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
WHERE p.description = 'free'
AND f.name IN ('platform_connections', 'ai_content_generation', 'scheduling',
               'analytics', 'blog', 'media_library', 'github_integration', 'remove_branding');

-- Resource limits for free tier
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'free' AND f.name = 'posts_per_month' AND l.limit_name = 'posts_per_month_free';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'free' AND f.name = 'platforms' AND l.limit_name = 'platforms_free';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'free' AND f.name = 'media_storage_mb' AND l.limit_name = 'media_storage_mb_free';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'free' AND f.name = 'team_members' AND l.limit_name = 'team_members_free';

-- ============================================================================
-- PRO MONTHLY
-- ============================================================================

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL,
    CASE f.name
        WHEN 'remove_branding' THEN false
        ELSE true
    END
FROM prices p
CROSS JOIN features f
WHERE p.description = 'lc_pro_monthly'
AND f.name IN ('platform_connections', 'ai_content_generation', 'scheduling',
               'analytics', 'blog', 'media_library', 'github_integration', 'remove_branding');

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_monthly' AND f.name = 'posts_per_month' AND l.limit_name = 'posts_per_month_pro';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_monthly' AND f.name = 'platforms' AND l.limit_name = 'platforms_pro';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_monthly' AND f.name = 'media_storage_mb' AND l.limit_name = 'media_storage_mb_pro';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_monthly' AND f.name = 'team_members' AND l.limit_name = 'team_members_pro';

-- ============================================================================
-- PRO ANNUAL
-- ============================================================================

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL,
    CASE f.name
        WHEN 'remove_branding' THEN false
        ELSE true
    END
FROM prices p
CROSS JOIN features f
WHERE p.description = 'lc_pro_annual'
AND f.name IN ('platform_connections', 'ai_content_generation', 'scheduling',
               'analytics', 'blog', 'media_library', 'github_integration', 'remove_branding');

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_annual' AND f.name = 'posts_per_month' AND l.limit_name = 'posts_per_month_pro';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_annual' AND f.name = 'platforms' AND l.limit_name = 'platforms_pro';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_annual' AND f.name = 'media_storage_mb' AND l.limit_name = 'media_storage_mb_pro';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_pro_annual' AND f.name = 'team_members' AND l.limit_name = 'team_members_pro';

-- ============================================================================
-- TEAM MONTHLY
-- ============================================================================

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL, true
FROM prices p
CROSS JOIN features f
WHERE p.description = 'lc_team_monthly'
AND f.name IN ('platform_connections', 'ai_content_generation', 'scheduling',
               'analytics', 'blog', 'media_library', 'github_integration', 'remove_branding');

-- Team: unlimited posts and platforms (NULL limit_id)
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL, true
FROM prices p CROSS JOIN features f
WHERE p.description = 'lc_team_monthly' AND f.name = 'posts_per_month';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL, true
FROM prices p CROSS JOIN features f
WHERE p.description = 'lc_team_monthly' AND f.name = 'platforms';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_team_monthly' AND f.name = 'media_storage_mb' AND l.limit_name = 'media_storage_mb_team';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_team_monthly' AND f.name = 'team_members' AND l.limit_name = 'team_members_team';

-- ============================================================================
-- TEAM ANNUAL
-- ============================================================================

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL, true
FROM prices p
CROSS JOIN features f
WHERE p.description = 'lc_team_annual'
AND f.name IN ('platform_connections', 'ai_content_generation', 'scheduling',
               'analytics', 'blog', 'media_library', 'github_integration', 'remove_branding');

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL, true
FROM prices p CROSS JOIN features f
WHERE p.description = 'lc_team_annual' AND f.name = 'posts_per_month';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, NULL, true
FROM prices p CROSS JOIN features f
WHERE p.description = 'lc_team_annual' AND f.name = 'platforms';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_team_annual' AND f.name = 'media_storage_mb' AND l.limit_name = 'media_storage_mb_team';

INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
SELECT p.id, f.id, l.id, true
FROM prices p CROSS JOIN features f JOIN limits l ON l.feature_id = f.id
WHERE p.description = 'lc_team_annual' AND f.name = 'team_members' AND l.limit_name = 'team_members_team';
