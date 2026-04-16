-- Drop all old-project tables and ENUMs from V0011-V0030
-- Order: drop dependent tables first, then parent tables, then ENUMs

-- ============================================================================
-- DROP SEEDED DATA (from V0029)
-- ============================================================================

DELETE FROM plan_feature_limits;
DELETE FROM limits;
DELETE FROM features;

-- ============================================================================
-- DROP TABLES (in dependency order)
-- ============================================================================

-- V0030: Blast email templates
DROP TABLE IF EXISTS blast_email_templates CASCADE;
DROP TABLE IF EXISTS campaign_email_templates CASCADE;

-- V0026: Segments, email blasts, blast recipients
DROP TABLE IF EXISTS blast_recipients CASCADE;
DROP TABLE IF EXISTS email_blasts CASCADE;
DROP TABLE IF EXISTS segments CASCADE;

-- V0024/V0025: Integrations
DROP TABLE IF EXISTS integration_deliveries CASCADE;
DROP TABLE IF EXISTS integration_subscriptions CASCADE;

-- V0021: Campaign settings tables
DROP TABLE IF EXISTS campaign_tracking_integrations CASCADE;
DROP TABLE IF EXISTS campaign_share_messages CASCADE;
DROP TABLE IF EXISTS campaign_form_fields CASCADE;
DROP TABLE IF EXISTS campaign_referral_settings CASCADE;
DROP TABLE IF EXISTS campaign_form_settings CASCADE;
DROP TABLE IF EXISTS campaign_branding_settings CASCADE;
DROP TABLE IF EXISTS campaign_email_settings CASCADE;

-- V0019: User channel codes
DROP TABLE IF EXISTS user_channel_codes CASCADE;

-- V0017: Security and audit tables
DROP TABLE IF EXISTS fraud_detections CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;

-- V0016: Webhooks
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;

-- V0015: Analytics
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS campaign_analytics CASCADE;

-- V0014: Email templates and logs
DROP TABLE IF EXISTS email_logs CASCADE;

-- V0013: Rewards
DROP TABLE IF EXISTS user_rewards CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;

-- V0012: Waitlist users and referrals
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS waitlist_users CASCADE;

-- V0011: Campaigns
DROP TABLE IF EXISTS campaigns CASCADE;

-- ============================================================================
-- DROP ENUMS
-- ============================================================================

DROP TYPE IF EXISTS device_os CASCADE;
DROP TYPE IF EXISTS device_type CASCADE;
DROP TYPE IF EXISTS blast_recipient_status CASCADE;
DROP TYPE IF EXISTS email_blast_status CASCADE;
DROP TYPE IF EXISTS segment_status CASCADE;
DROP TYPE IF EXISTS integration_type CASCADE;
DROP TYPE IF EXISTS tracking_integration_type CASCADE;
DROP TYPE IF EXISTS sharing_channel CASCADE;
DROP TYPE IF EXISTS captcha_provider CASCADE;
DROP TYPE IF EXISTS form_field_type CASCADE;
DROP TYPE IF EXISTS fraud_detection_status CASCADE;
DROP TYPE IF EXISTS fraud_detection_type CASCADE;
DROP TYPE IF EXISTS actor_type CASCADE;
DROP TYPE IF EXISTS api_key_status CASCADE;
DROP TYPE IF EXISTS api_key_rate_limit_tier CASCADE;
DROP TYPE IF EXISTS webhook_delivery_status CASCADE;
DROP TYPE IF EXISTS webhook_status CASCADE;
DROP TYPE IF EXISTS email_log_status CASCADE;
DROP TYPE IF EXISTS email_template_type CASCADE;
DROP TYPE IF EXISTS user_reward_status CASCADE;
DROP TYPE IF EXISTS reward_status CASCADE;
DROP TYPE IF EXISTS reward_delivery_method CASCADE;
DROP TYPE IF EXISTS reward_trigger_type CASCADE;
DROP TYPE IF EXISTS reward_type CASCADE;
DROP TYPE IF EXISTS referral_source CASCADE;
DROP TYPE IF EXISTS referral_status CASCADE;
DROP TYPE IF EXISTS user_source CASCADE;
DROP TYPE IF EXISTS waitlist_user_status CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS campaign_type CASCADE;
