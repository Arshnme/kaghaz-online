-- کوئری‌های مدیریتی برای کاغذ آنلاین
-- این فایل شامل کوئری‌های مفید برای مدیریت و نگهداری دیتابیس است

-- ==========================================
-- آمار کلی سیستم
-- ==========================================

-- آمار کاربران
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
    COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
    COUNT(*) FILTER (WHERE is_premium = true) as premium_users
FROM profiles;

-- آمار اسناد
SELECT 
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE is_public = true) as public_documents,
    COUNT(*) FILTER (WHERE is_public = false) as private_documents,
    COUNT(*) FILTER (WHERE password IS NOT NULL) as password_protected,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_documents_30d,
    SUM(view_count) as total_views,
    SUM(like_count) as total_likes,
    AVG(view_count) as avg_views_per_document
FROM documents;

-- آمار فایل‌ها
SELECT 
    COUNT(*) as total_files,
    SUM(file_size) as total_size_bytes,
    pg_size_pretty(SUM(file_size)) as total_size_readable,
    AVG(file_size) as avg_file_size,
    COUNT(*) FILTER (WHERE is_image = true) as image_files,
    COUNT(DISTINCT mime_type) as unique_mime_types
FROM document_files;

-- ==========================================
-- کوئری‌های بهینه‌سازی
-- ==========================================

-- پیدا کردن جداول بزرگ
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- بررسی استفاده از ایندکس‌ها
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- پیدا کردن کوئری‌های کند
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%documents%' OR query LIKE '%profiles%'
ORDER BY mean_time DESC 
LIMIT 10;

-- ==========================================
-- کوئری‌های تمیزکاری
-- ==========================================

-- حذف فایل‌های یتیم (فایل‌هایی که سند آن‌ها حذف شده)
DELETE FROM document_files 
WHERE document_id NOT IN (SELECT id FROM documents);

-- حذف بازدیدهای قدیمی (بیش از 1 سال)
DELETE FROM document_views 
WHERE created_at < NOW() - INTERVAL '1 year';

-- حذف پروفایل‌های غیرفعال (بدون سند و بیش از 6 ماه غیرفعال)
DELETE FROM profiles 
WHERE id NOT IN (SELECT DISTINCT user_id FROM documents)
AND created_at < NOW() - INTERVAL '6 months';

-- ==========================================
-- کوئری‌های گزارش‌گیری
-- ==========================================

-- محبوب‌ترین اسناد
SELECT 
    d.title,
    d.document_id,
    p.username,
    p.full_name,
    d.view_count,
    d.like_count,
    d.created_at
FROM documents d
JOIN profiles p ON d.user_id = p.id
WHERE d.is_public = true
ORDER BY d.view_count DESC, d.like_count DESC
LIMIT 20;

-- فعال‌ترین کاربران
SELECT 
    p.username,
    p.full_name,
    COUNT(d.id) as document_count,
    SUM(d.view_count) as total_views,
    SUM(d.like_count) as total_likes,
    MAX(d.updated_at) as last_activity
FROM profiles p
LEFT JOIN documents d ON p.id = d.user_id
GROUP BY p.id, p.username, p.full_name
ORDER BY document_count DESC, total_views DESC
LIMIT 20;

-- آمار روزانه ثبت نام
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- آمار روزانه ایجاد سند
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_documents,
    COUNT(*) FILTER (WHERE is_public = true) as public_documents
FROM documents
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ==========================================
-- کوئری‌های امنیتی
-- ==========================================

-- بررسی اسناد بدون مالک
SELECT d.* 
FROM documents d
LEFT JOIN profiles p ON d.user_id = p.id
WHERE p.id IS NULL;

-- بررسی فایل‌های بدون مالک
SELECT df.* 
FROM document_files df
LEFT JOIN profiles p ON df.user_id = p.id
WHERE p.id IS NULL;

-- بررسی نام‌های کاربری تکراری
SELECT username, COUNT(*) 
FROM profiles 
GROUP BY username 
HAVING COUNT(*) > 1;

-- بررسی ایمیل‌های تکراری
SELECT email, COUNT(*) 
FROM profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- ==========================================
-- کوئری‌های بک‌آپ و بازیابی
-- ==========================================

-- بک‌آپ اطلاعات کاربر خاص
CREATE OR REPLACE FUNCTION backup_user_data(user_uuid UUID)
RETURNS TABLE (
    table_name TEXT,
    data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'profiles'::TEXT, to_jsonb(p.*) FROM profiles p WHERE p.id = user_uuid
    UNION ALL
    SELECT 'documents'::TEXT, to_jsonb(d.*) FROM documents d WHERE d.user_id = user_uuid
    UNION ALL
    SELECT 'document_files'::TEXT, to_jsonb(df.*) FROM document_files df WHERE df.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- استفاده: SELECT * FROM backup_user_data('user-uuid-here');

-- ==========================================
-- کوئری‌های مانیتورینگ
-- ==========================================

-- بررسی سلامت دیتابیس
SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value
UNION ALL
SELECT 
    'Active Connections' as metric,
    COUNT(*)::TEXT as value
FROM pg_stat_activity
WHERE state = 'active'
UNION ALL
SELECT 
    'Total Tables' as metric,
    COUNT(*)::TEXT as value
FROM information_schema.tables
WHERE table_schema = 'public';

-- بررسی فضای خالی جداول
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup * 100.0 / GREATEST(n_live_tup + n_dead_tup, 1), 2) as dead_tuple_percent
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY dead_tuple_percent DESC;

-- ==========================================
-- کوئری‌های تست
-- ==========================================

-- تست عملکرد جستجو
EXPLAIN ANALYZE
SELECT d.*, p.username 
FROM documents d
JOIN profiles p ON d.user_id = p.id
WHERE d.title ILIKE '%test%' 
AND d.is_public = true
ORDER BY d.updated_at DESC
LIMIT 10;

-- تست عملکرد فیلتر کاربر
EXPLAIN ANALYZE
SELECT * FROM documents 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY order_index;

-- ==========================================
-- کوئری‌های تنظیمات
-- ==========================================

-- تنظیم timeout برای کوئری‌های طولانی
SET statement_timeout = '30s';

-- تنظیم work_mem برای کوئری‌های پیچیده
SET work_mem = '256MB';

-- فعال کردن آمارگیری کوئری‌ها
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ==========================================
-- Views مفید
-- ==========================================

-- View برای اسناد محبوب
CREATE OR REPLACE VIEW popular_documents AS
SELECT 
    d.id,
    d.title,
    d.document_id,
    d.view_count,
    d.like_count,
    d.created_at,
    p.username,
    p.full_name,
    (d.view_count * 0.7 + d.like_count * 0.3) as popularity_score
FROM documents d
JOIN profiles p ON d.user_id = p.id
WHERE d.is_public = true
ORDER BY popularity_score DESC;

-- View برای آمار کاربران
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    p.id,
    p.username,
    p.full_name,
    COUNT(d.id) as document_count,
    COUNT(d.id) FILTER (WHERE d.is_public = true) as public_document_count,
    SUM(d.view_count) as total_views,
    SUM(d.like_count) as total_likes,
    MAX(d.updated_at) as last_document_update
FROM profiles p
LEFT JOIN documents d ON p.id = d.user_id
GROUP BY p.id, p.username, p.full_name;

-- ==========================================
-- Functions مفید
-- ==========================================

-- Function برای محاسبه امتیاز محبوبیت
CREATE OR REPLACE FUNCTION calculate_popularity_score(
    view_count INTEGER,
    like_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC AS $$
DECLARE
    days_old INTEGER;
    time_decay NUMERIC;
    base_score NUMERIC;
BEGIN
    days_old := EXTRACT(DAY FROM NOW() - created_at);
    time_decay := GREATEST(0.1, 1.0 / (1.0 + days_old * 0.01));
    base_score := (view_count * 0.7 + like_count * 0.3);
    
    RETURN base_score * time_decay;
END;
$$ LANGUAGE plpgsql;

-- Function برای پاک‌سازی خودکار
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- حذف بازدیدهای قدیمی
    DELETE FROM document_views 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- حذف فایل‌های یتیم
    DELETE FROM document_files 
    WHERE document_id NOT IN (SELECT id FROM documents);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Scheduled Jobs (برای استفاده با pg_cron)
-- ==========================================

-- نصب pg_cron extension (نیاز به دسترسی superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- اجرای پاک‌سازی روزانه در ساعت 2 شب
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

-- آپدیت آمار جداول هفتگی
-- SELECT cron.schedule('update-stats', '0 3 * * 0', 'ANALYZE;');

COMMIT;