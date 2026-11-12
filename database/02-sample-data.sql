-- داده‌های نمونه برای تست سیستم کاغذ آنلاین
-- این فایل شامل داده‌های نمونه برای تست عملکرد سیستم است

-- نکته: این داده‌ها فقط برای محیط development استفاده شوند

-- ==========================================
-- کاربران نمونه
-- ==========================================

-- کاربر ادمین
INSERT INTO profiles (id, username, full_name, email, is_verified, is_premium, bio, website) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', 'مدیر سیستم', 'admin@kaghazonline.com', true, true, 'مدیر و توسعه‌دهنده سیستم کاغذ آنلاین', 'https://kaghazonline.com'),
('00000000-0000-0000-0000-000000000002', 'john_doe', 'جان دو', 'john@example.com', true, false, 'نویسنده و بلاگر', 'https://johndoe.com'),
('00000000-0000-0000-0000-000000000003', 'sara_writer', 'سارا نویسنده', 'sara@example.com', true, true, 'نویسنده حرفه‌ای و مترجم', null),
('00000000-0000-0000-0000-000000000004', 'ali_tech', 'علی تکنولوژی', 'ali@example.com', false, false, 'علاقه‌مند به فناوری و برنامه‌نویسی', null),
('00000000-0000-0000-0000-000000000005', 'maryam_poet', 'مریم شاعر', 'maryam@example.com', true, false, 'شاعر و نویسنده شعر معاصر', 'https://maryampoet.ir')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- اسناد نمونه
-- ==========================================

-- سند خوش‌آمدگویی (عمومی)
INSERT INTO documents (id, user_id, title, document_id, content, is_public, is_main, order_index, view_count, like_count, tags) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 
encrypt('خوش آمدید به کاغذ آنلاین'), 'welcome-to-kaghazonline',
encrypt('<h1>خوش آمدید به کاغذ آنلاین!</h1>
<p>کاغذ آنلاین یک پلتفرم حرفه‌ای برای نوشتن، ویرایش و اشتراک‌گذاری اسناد است.</p>
<h2>ویژگی‌های کلیدی:</h2>
<ul>
<li>ویرایشگر پیشرفته با پشتیبانی کامل از زبان فارسی</li>
<li>امکان اشتراک‌گذاری اسناد به صورت عمومی یا خصوصی</li>
<li>محافظت از اسناد با رمز عبور</li>
<li>آپلود و مدیریت فایل‌ها</li>
<li>رمزنگاری کامل اطلاعات</li>
</ul>
<p>امیدواریم از استفاده از این پلتفرم لذت ببرید!</p>'), 
true, true, 0, 150, 25, ARRAY['راهنما', 'خوش‌آمدگویی']),

-- راهنمای استفاده (عمومی)
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
encrypt('راهنمای استفاده از کاغذ آنلاین'), 'user-guide',
encrypt('<h1>راهنمای استفاده</h1>
<h2>ایجاد سند جدید</h2>
<p>برای ایجاد سند جدید، روی دکمه "سند جدید" در داشبورد کلیک کنید.</p>
<h2>ویرایش سند</h2>
<p>می‌توانید از ویرایشگر پیشرفته برای فرمت‌دهی متن، اضافه کردن تصاویر و لینک‌ها استفاده کنید.</p>
<h2>اشتراک‌گذاری</h2>
<p>اسناد خود را می‌توانید به صورت عمومی یا با رمز عبور به اشتراک بگذارید.</p>'),
true, false, 1, 89, 12, ARRAY['راهنما', 'آموزش']),

-- مقاله تکنولوژی (عمومی)
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004',
encrypt('آینده هوش مصنوعی در ایران'), 'ai-future-iran',
encrypt('<h1>آینده هوش مصنوعی در ایران</h1>
<p>هوش مصنوعی یکی از مهم‌ترین فناوری‌های قرن بیست و یکم محسوب می‌شود...</p>
<h2>وضعیت فعلی</h2>
<p>در حال حاضر ایران در زمینه هوش مصنوعی پیشرفت‌های قابل توجهی داشته است.</p>
<h2>چالش‌ها</h2>
<ul>
<li>کمبود متخصص</li>
<li>محدودیت‌های فناوری</li>
<li>نیاز به سرمایه‌گذاری بیشتر</li>
</ul>'),
true, false, 0, 234, 45, ARRAY['فناوری', 'هوش مصنوعی', 'ایران']),

-- شعر (عمومی)
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005',
encrypt('باغ کلمات'), 'garden-of-words',
encrypt('<h1>باغ کلمات</h1>
<div style="text-align: center; line-height: 2;">
<p>در باغ کلمات قدم می‌زنم<br>
با هر نفس، شعر می‌آفرینم</p>
<p>حروف مثل گل‌های رنگارنگ<br>
در دل کاغذ، جان می‌گیرند</p>
<p>کلمات پرواز می‌کنند<br>
از قلم تا قلب خواننده</p>
</div>'),
true, false, 0, 67, 18, ARRAY['شعر', 'ادبیات', 'فارسی']),

-- سند خصوصی
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
encrypt('یادداشت‌های شخصی'), 'personal-notes',
encrypt('<h1>یادداشت‌های شخصی</h1>
<p>این سند شامل یادداشت‌های شخصی من است...</p>
<h2>اهداف امسال</h2>
<ul>
<li>تکمیل پروژه کتاب</li>
<li>یادگیری زبان جدید</li>
<li>سفر به شمال</li>
</ul>'),
false, false, 0, 5, 0, ARRAY['شخصی', 'یادداشت']),

-- سند محافظت شده با رمز
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003',
encrypt('پروژه محرمانه'), 'confidential-project',
encrypt('<h1>پروژه محرمانه</h1>
<p>این سند شامل اطلاعات محرمانه پروژه است...</p>
<p><strong>توجه:</strong> این اطلاعات فقط برای اعضای تیم است.</p>'),
true, false, 0, 23, 3, ARRAY['پروژه', 'محرمانه'], encrypt('secret123'))
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- فایل‌های نمونه
-- ==========================================

INSERT INTO document_files (id, document_id, user_id, original_filename, file_url, file_size, mime_type, is_image) VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
encrypt('logo-kaghazonline.png'), '00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/logo.png', 
15420, 'image/png', true),

('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004',
encrypt('ai-research-paper.pdf'), '00000000-0000-0000-0000-000000000004/10000000-0000-0000-0000-000000000003/research.pdf',
2048576, 'application/pdf', false),

('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005',
encrypt('poem-background.jpg'), '00000000-0000-0000-0000-000000000005/10000000-0000-0000-0000-000000000004/background.jpg',
512000, 'image/jpeg', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- بازدیدهای نمونه
-- ==========================================

-- بازدیدهای تصادفی برای اسناد عمومی
INSERT INTO document_views (document_id, viewer_ip, viewer_user_agent, created_at) 
SELECT 
    d.id,
    ('192.168.1.' || (random() * 254 + 1)::int)::inet,
    CASE (random() * 3)::int
        WHEN 0 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        WHEN 1 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        ELSE 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    END,
    NOW() - (random() * interval '30 days')
FROM documents d
WHERE d.is_public = true
CROSS JOIN generate_series(1, (random() * 50 + 10)::int);

-- ==========================================
-- لایک‌های نمونه
-- ==========================================

-- لایک‌های تصادفی برای اسناد عمومی
INSERT INTO document_likes (document_id, user_id, ip_address, created_at)
SELECT DISTINCT
    d.id,
    CASE WHEN random() > 0.5 THEN p.id ELSE NULL END,
    ('10.0.0.' || (random() * 254 + 1)::int)::inet,
    NOW() - (random() * interval '30 days')
FROM documents d
CROSS JOIN profiles p
WHERE d.is_public = true
AND random() > 0.7  -- فقط 30% شانس لایک
LIMIT 100;

-- ==========================================
-- کامنت‌های نمونه (برای آینده)
-- ==========================================

INSERT INTO document_comments (id, document_id, user_id, content, created_at) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
encrypt('عالی! خیلی مفید بود.'), NOW() - interval '2 days'),

('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
encrypt('مقاله جالبی بود. منتظر ادامه هستم.'), NOW() - interval '1 day'),

('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
encrypt('شعر زیبایی بود. دست شما درد نکند.'), NOW() - interval '3 hours')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- فالوهای نمونه
-- ==========================================

INSERT INTO user_follows (follower_id, following_id, created_at) VALUES
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NOW() - interval '10 days'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NOW() - interval '8 days'),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', NOW() - interval '5 days'),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', NOW() - interval '3 days'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', NOW() - interval '1 day')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- ==========================================
-- آپدیت آمار اسناد
-- ==========================================

-- آپدیت تعداد بازدیدها
UPDATE documents SET view_count = (
    SELECT COUNT(*) FROM document_views WHERE document_views.document_id = documents.id
);

-- آپدیت تعداد لایک‌ها
UPDATE documents SET like_count = (
    SELECT COUNT(*) FROM document_likes WHERE document_likes.document_id = documents.id
);

-- ==========================================
-- تست کوئری‌ها
-- ==========================================

-- تست جستجو
SELECT 'Search Test' as test_name, COUNT(*) as result_count
FROM search_documents('کاغذ', null, 10, 0);

-- تست آمار
SELECT 'Stats Test' as test_name, 
       total_users, public_documents, total_views, total_likes
FROM public_stats;

-- تست اسناد محبوب
SELECT 'Popular Documents Test' as test_name, COUNT(*) as result_count
FROM popular_documents;

-- تست آمار کاربران
SELECT 'User Stats Test' as test_name, COUNT(*) as result_count
FROM user_stats;

COMMIT;

-- ==========================================
-- پیام تکمیل
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE 'داده‌های نمونه با موفقیت اضافه شدند!';
    RAISE NOTICE 'تعداد کاربران: %', (SELECT COUNT(*) FROM profiles);
    RAISE NOTICE 'تعداد اسناد: %', (SELECT COUNT(*) FROM documents);
    RAISE NOTICE 'تعداد فایل‌ها: %', (SELECT COUNT(*) FROM document_files);
    RAISE NOTICE 'تعداد بازدیدها: %', (SELECT COUNT(*) FROM document_views);
    RAISE NOTICE 'تعداد لایک‌ها: %', (SELECT COUNT(*) FROM document_likes);
END $$;