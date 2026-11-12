-- Kaghaz Online - Canonical database schema
-- Creates every table, index, RLS policy, function and trigger the application needs.
-- Safe to run on a fresh Supabase project or to reset an existing one (it drops and recreates public schema objects).
--
-- Run this file first, then 02-storage.sql, then optionally 03-sample-data.sql.

-- ایجاد extension های مورد نیاز
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- حذف جداول موجود (اگر وجود دارند) - با ترتیب صحیح
DROP TABLE IF EXISTS document_comments CASCADE;
DROP TABLE IF EXISTS document_likes CASCADE;
DROP TABLE IF EXISTS document_views CASCADE;
DROP TABLE IF EXISTS document_files CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- حذف functions و triggers موجود
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_document_stats() CASCADE;
DROP FUNCTION IF EXISTS search_documents(TEXT, UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_published_documents(TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_avatars() CASCADE;
DROP FUNCTION IF EXISTS cleanup_user_avatar() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- حذف views موجود
DROP VIEW IF EXISTS public_stats CASCADE;

-- جدول پروفایل کاربران
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL CHECK (length(username) >= 2 AND length(username) <= 30),
    full_name TEXT NOT NULL CHECK (length(full_name) >= 2),
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    location TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$'),
    CONSTRAINT email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- جدول اسناد
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- رمزنگاری شده
    document_id TEXT NOT NULL, -- شناسه عمومی سند (غیر رمزنگاری شده)
    content TEXT DEFAULT '', -- رمزنگاری شده
    is_public BOOLEAN DEFAULT FALSE,
    is_main BOOLEAN DEFAULT FALSE,
    publish_to_profile BOOLEAN DEFAULT FALSE, -- قابلیت انتشار در پروفایل
    password TEXT, -- رمزنگاری شده (اختیاری)
    order_index INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    meta_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, document_id),
    CHECK (length(document_id) >= 1 AND length(document_id) <= 50),
    CHECK (document_id ~ '^[a-z0-9-]+$')
);

-- جدول فایل های اسناد
CREATE TABLE document_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    original_filename TEXT NOT NULL, -- رمزنگاری شده
    file_url TEXT NOT NULL, -- مسیر فایل در Supabase Storage
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type TEXT NOT NULL,
    is_image BOOLEAN DEFAULT FALSE,
    alt_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول بازدیدها (برای آمار)
CREATE TABLE document_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    viewer_ip INET,
    viewer_user_agent TEXT,
    referrer TEXT,
    country TEXT,
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول لایک ها
CREATE TABLE document_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- یک کاربر یا IP فقط یک بار می‌تواند لایک کند
    UNIQUE(document_id, user_id),
    UNIQUE(document_id, ip_address)
);

-- جدول کامنت ها (برای آینده)
CREATE TABLE document_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- رمزنگاری شده
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول فولوورها (برای آینده)
CREATE TABLE user_follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- یک کاربر نمی‌تواند خودش را فالو کند
    CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);

-- ایجاد ایندکس ها برای بهبود performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_document_id ON documents(document_id);
CREATE INDEX idx_documents_is_public ON documents(is_public);
CREATE INDEX idx_documents_publish_to_profile ON documents(publish_to_profile);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_updated_at ON documents(updated_at);
CREATE INDEX idx_documents_order_index ON documents(order_index);
CREATE INDEX idx_documents_user_document ON documents(user_id, document_id);
CREATE INDEX idx_documents_user_published ON documents(user_id, publish_to_profile) WHERE publish_to_profile = true;

CREATE INDEX idx_document_files_document_id ON document_files(document_id);
CREATE INDEX idx_document_files_user_id ON document_files(user_id);
CREATE INDEX idx_document_files_created_at ON document_files(created_at);

CREATE INDEX idx_document_views_document_id ON document_views(document_id);
CREATE INDEX idx_document_views_created_at ON document_views(created_at);

CREATE INDEX idx_document_likes_document_id ON document_likes(document_id);
CREATE INDEX idx_document_likes_user_id ON document_likes(user_id);

-- ایجاد function برای updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ایجاد triggers برای updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_files_updated_at 
    BEFORE UPDATE ON document_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_comments_updated_at 
    BEFORE UPDATE ON document_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- تنظیم Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- سیاست های امنیتی برای profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- سیاست های امنیتی برای documents
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public documents" ON documents
    FOR SELECT USING (is_public = true);

CREATE POLICY "Anyone can view published profile documents" ON documents
    FOR SELECT USING (publish_to_profile = true AND is_public = true);

CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- سیاست های امنیتی برای document_files
CREATE POLICY "Users can view files of accessible documents" ON document_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_files.document_id 
            AND (documents.user_id = auth.uid() OR documents.is_public = true)
        )
    );

CREATE POLICY "Users can insert files to own documents" ON document_files
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_files.document_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own document files" ON document_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own document files" ON document_files
    FOR DELETE USING (auth.uid() = user_id);

-- سیاست های امنیتی برای document_views
CREATE POLICY "Anyone can insert views" ON document_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own document views" ON document_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_views.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- سیاست های امنیتی برای document_likes
CREATE POLICY "Anyone can view likes" ON document_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert likes" ON document_likes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own likes" ON document_likes
    FOR DELETE USING (auth.uid() = user_id);

-- سیاست های امنیتی برای document_comments
CREATE POLICY "Anyone can view approved comments" ON document_comments
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view own comments" ON document_comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert comments" ON document_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON document_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON document_comments
    FOR DELETE USING (auth.uid() = user_id);

-- سیاست های امنیتی برای user_follows
CREATE POLICY "Anyone can view follows" ON user_follows
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own follows" ON user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON user_follows
    FOR DELETE USING (auth.uid() = follower_id);

-- ایجاد Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document-files', 'document-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- سیاست های امنیتی برای Storage - document-files
CREATE POLICY "Users can upload files to own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'document-files' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view files they have access to" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'document-files' AND (
            (storage.foldername(name))[1] = auth.uid()::text OR
            EXISTS (
                SELECT 1 FROM documents d
                JOIN document_files df ON d.id = df.document_id
                WHERE df.file_url = name AND d.is_public = true
            )
        )
    );

CREATE POLICY "Users can update own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'document-files' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'document-files' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- سیاست های امنیتی برای Storage - avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- ایجاد function برای ایجاد پروفایل خودکار
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
BEGIN
    -- تولید username منحصر به فرد - اولویت با username از meta_data
    new_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'preferred_username',
        NEW.raw_user_meta_data->>'user_name',
        split_part(NEW.email, '@', 1),
        'user_' || substr(NEW.id::text, 1, 8)
    );
    
    -- تبدیل به lowercase و حذف کاراکترهای غیرمجاز
    new_username := lower(regexp_replace(new_username, '[^a-z0-9_]', '', 'g'));
    
    -- اطمینان از حداقل طول
    IF length(new_username) < 2 THEN
        new_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- اطمینان از منحصر به فرد بودن username
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
        new_username := new_username || '_' || floor(random() * 1000)::text;
    END LOOP;
    
    -- ایجاد پروفایل جدید
    INSERT INTO public.profiles (id, email, full_name, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'name', 
            'کاربر جدید'
        ),
        new_username
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- در صورت خطا، لاگ کن اما عملیات لاگین را متوقف نکن
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ایجاد trigger برای ایجاد پروفایل خودکار
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ایجاد function برای آپدیت آمار سند
CREATE OR REPLACE FUNCTION update_document_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'document_views' THEN
            UPDATE documents SET view_count = view_count + 1 WHERE id = NEW.document_id;
        ELSIF TG_TABLE_NAME = 'document_likes' THEN
            UPDATE documents SET like_count = like_count + 1 WHERE id = NEW.document_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'document_likes' THEN
            UPDATE documents SET like_count = like_count - 1 WHERE id = OLD.document_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ایجاد triggers برای آپدیت آمار
CREATE TRIGGER update_view_count
    AFTER INSERT ON document_views
    FOR EACH ROW EXECUTE FUNCTION update_document_stats();

CREATE TRIGGER update_like_count_insert
    AFTER INSERT ON document_likes
    FOR EACH ROW EXECUTE FUNCTION update_document_stats();

CREATE TRIGGER update_like_count_delete
    AFTER DELETE ON document_likes
    FOR EACH ROW EXECUTE FUNCTION update_document_stats();

-- ایجاد function برای جستجو
CREATE OR REPLACE FUNCTION search_documents(
    search_query TEXT,
    user_id_param UUID DEFAULT NULL,
    limit_param INTEGER DEFAULT 20,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    document_id TEXT,
    content TEXT,
    is_public BOOLEAN,
    user_id UUID,
    username TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER,
    like_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.document_id,
        d.content,
        d.is_public,
        d.user_id,
        p.username,
        p.full_name,
        d.created_at,
        d.updated_at,
        d.view_count,
        d.like_count
    FROM documents d
    JOIN profiles p ON d.user_id = p.id
    WHERE 
        (d.is_public = true OR d.user_id = user_id_param) AND
        (d.title ILIKE '%' || search_query || '%' OR
         d.content ILIKE '%' || search_query || '%' OR
         p.username ILIKE '%' || search_query || '%' OR
         p.full_name ILIKE '%' || search_query || '%')
    ORDER BY d.updated_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ایجاد function برای دریافت اسناد منتشر شده در پروفایل کاربر
CREATE OR REPLACE FUNCTION public.get_user_published_documents(
    username_param TEXT,
    limit_param INTEGER DEFAULT 20,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    document_id TEXT,
    content TEXT,
    is_public BOOLEAN,
    publish_to_profile BOOLEAN,
    user_id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER,
    like_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.document_id,
        d.content,
        d.is_public,
        d.publish_to_profile,
        d.user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        d.created_at,
        d.updated_at,
        d.view_count,
        d.like_count
    FROM public.documents d
    JOIN public.profiles p ON d.user_id = p.id
    WHERE 
        p.username = username_param AND
        d.is_public = true AND
        d.publish_to_profile = true
    ORDER BY d.updated_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Note: the avatar cleanup triggers that used to live here were removed.
-- They called storage.delete_object() from PL/pgSQL, which is not a SQL-callable
-- function in Supabase, so every avatar update failed with
-- "function storage.delete_object(...) does not exist". Old avatar cleanup is
-- now handled in application code (app/api/profile/avatar/route.ts).

-- ایجاد view برای آمار کلی
CREATE OR REPLACE VIEW public_stats AS
SELECT 
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM documents WHERE is_public = true) as public_documents,
    (SELECT COUNT(*) FROM documents) as total_documents,
    (SELECT SUM(view_count) FROM documents) as total_views,
    (SELECT SUM(like_count) FROM documents) as total_likes;

-- تکمیل عملیات
COMMIT;

-- پیام تایید
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Tables created: profiles, documents, document_files, document_views, document_likes, document_comments, user_follows';
    RAISE NOTICE 'Storage buckets: document-files, avatars';
    RAISE NOTICE 'Functions and triggers: All created successfully';
    RAISE NOTICE 'RLS policies: All enabled and configured';
END $$;