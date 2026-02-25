-- =====================================================
-- SUPABASE SETUP SCRIPT (Venn Open-Source Base Schema)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create base tables
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  aura_points INTEGER DEFAULT 250,
  user_role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circle_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  media_urls JSONB,
  media_metadata JSONB,
  content JSONB,
  visibility TEXT DEFAULT 'public',
  circle_ids UUID[],
  subcircle_id UUID,
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  upvotes_count INTEGER DEFAULT 0,
  downvotes_count INTEGER DEFAULT 0,
  net_votes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  wilson_score REAL DEFAULT 0.0,
  trending_velocity REAL DEFAULT 0.0,
  engagement_score REAL DEFAULT 0.0,
  hidden_from_feeds BOOLEAN DEFAULT false,
  hidden_from_for_you BOOLEAN DEFAULT false,
  under_review BOOLEAN DEFAULT false,
  review_tag TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  anonymous_username TEXT,
  processing_status TEXT DEFAULT 'completed',
  is_edited BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.circle_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL, -- 'upvote', 'downvote'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'post', 'comment', etc.
  report_type TEXT NOT NULL,
  report_category TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_feed_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  hidden_post_ids UUID[] DEFAULT ARRAY[]::UUID[],
  excluded_circles UUID[] DEFAULT ARRAY[]::UUID[],
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_metrics (
  post_id UUID PRIMARY KEY REFERENCES public.circle_posts(id) ON DELETE CASCADE,
  video_qualified_views_total BIGINT NOT NULL DEFAULT 0,
  watch_time_sum_seconds BIGINT NOT NULL DEFAULT 0,
  video_duration_seconds REAL NOT NULL DEFAULT 0,
  photo_text_impressions_total BIGINT NOT NULL DEFAULT 0,
  upvotes_last_24h INTEGER NOT NULL DEFAULT 0,
  weighted_reports_last_24h REAL NOT NULL DEFAULT 0.0,
  impressions_last_24h BIGINT NOT NULL DEFAULT 0,
  report_rate REAL NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  current_subcircle_id UUID,
  mentor_subcircle_ids UUID[],
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.circle_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. Enable RLS on all tables
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feed_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. RLS Policies
-- =====================================================

-- Users: anyone can read, users can update own profile
CREATE POLICY "Users are viewable by everyone" ON public.users
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Circle Posts: public posts readable by all, users manage own posts
CREATE POLICY "Public posts are viewable by everyone" ON public.circle_posts
  FOR SELECT USING (
    visibility = 'public' OR user_id = auth.uid()
  );
CREATE POLICY "Authenticated users can create posts" ON public.circle_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.circle_posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.circle_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Post Votes: users can read all votes, manage own
CREATE POLICY "Votes are viewable by everyone" ON public.post_votes
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.post_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON public.post_votes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.post_votes
  FOR DELETE USING (auth.uid() = user_id);

-- User Follows: readable by all, users manage own follows
CREATE POLICY "Follows are viewable by everyone" ON public.user_follows
  FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- User Reports: users can create reports, read own
CREATE POLICY "Users can create reports" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- User Feed Preferences: users manage own
CREATE POLICY "Users can view own preferences" ON public.user_feed_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_feed_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_feed_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Post Metrics: readable by all
CREATE POLICY "Metrics are viewable by everyone" ON public.post_metrics
  FOR SELECT USING (true);

-- Circle Members: readable by all authenticated, users manage own
CREATE POLICY "Members are viewable by authenticated" ON public.circle_members
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can join circles" ON public.circle_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave circles" ON public.circle_members
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own membership" ON public.circle_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Post Comments: readable by all, users manage own
CREATE POLICY "Comments are viewable by everyone" ON public.post_comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.post_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. Helper Functions
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_wilson_score(
  p_upvotes INTEGER,
  p_downvotes INTEGER
)
RETURNS REAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  n INTEGER;
  z REAL := 1.96;
  phat REAL;
BEGIN
  n := p_upvotes + p_downvotes;
  IF n < 10 THEN
    RETURN 0.0;
  END IF;
  phat := p_upvotes::REAL / n::REAL;
  RETURN (
    phat + z * z / (2.0 * n) - z * SQRT((phat * (1.0 - phat) + z * z / (4.0 * n)) / n)
  ) / (1.0 + z * z / n);
END;
$$;

-- =====================================================
-- 5. Core Feed Algorithm (get_ranked_feed)
-- =====================================================
CREATE OR REPLACE FUNCTION get_ranked_feed(
  p_user_id UUID,
  p_feed_type TEXT DEFAULT 'for_you',
  p_limit INTEGER DEFAULT 20,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_post_id UUID DEFAULT NULL,
  p_exclude_post_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_user_subcircle_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_user_mentor_subcircle_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content_type TEXT,
  media_urls JSONB,
  media_metadata JSONB,
  content JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  visibility TEXT,
  circle_ids UUID[],
  subcircle_id UUID,
  tags TEXT[],
  likes_count INTEGER,
  upvotes_count INTEGER,
  downvotes_count INTEGER,
  net_votes INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  reposts_count INTEGER,
  views_count INTEGER,
  wilson_score REAL,
  trending_velocity REAL,
  engagement_score REAL,
  is_published BOOLEAN,
  hidden_from_feeds BOOLEAN,
  hidden_from_for_you BOOLEAN,
  under_review BOOLEAN,
  review_tag TEXT,
  is_anonymous BOOLEAN,
  anonymous_username TEXT,
  processing_status TEXT,
  is_edited BOOLEAN,
  is_pinned BOOLEAN,
  feed_score REAL,
  feed_position_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_blocked_user_ids UUID[];
  v_following_ids UUID[];
  v_hidden_post_ids UUID[];
BEGIN
  SELECT COALESCE((SELECT ufp.blocked_user_ids::UUID[] FROM user_feed_preferences ufp WHERE ufp.user_id = p_user_id), ARRAY[]::UUID[]) INTO v_blocked_user_ids;
  SELECT COALESCE((SELECT ufp.hidden_post_ids::UUID[] FROM user_feed_preferences ufp WHERE ufp.user_id = p_user_id), ARRAY[]::UUID[]) INTO v_hidden_post_ids;
  IF p_feed_type = 'following' THEN
    SELECT COALESCE(ARRAY_AGG(uf.following_id), ARRAY[]::UUID[]) FROM user_follows uf WHERE uf.follower_id = p_user_id INTO v_following_ids;
  END IF;

  IF p_feed_type = 'following' THEN
    RETURN QUERY
    SELECT
      cp.id, cp.user_id::UUID, cp.content_type::TEXT, cp.media_urls::JSONB, cp.media_metadata::JSONB,
      cp.content::JSONB, cp.created_at::TIMESTAMPTZ, cp.updated_at::TIMESTAMPTZ, cp.visibility::TEXT,
      cp.circle_ids::UUID[], cp.subcircle_id::UUID, cp.tags::TEXT[], cp.likes_count::INTEGER,
      cp.upvotes_count::INTEGER, cp.downvotes_count::INTEGER, cp.net_votes::INTEGER,
      cp.comments_count::INTEGER, cp.shares_count::INTEGER, cp.reposts_count::INTEGER,
      cp.views_count::INTEGER, cp.wilson_score::REAL, cp.trending_velocity::REAL,
      cp.engagement_score::REAL, cp.is_published::BOOLEAN, cp.hidden_from_feeds::BOOLEAN,
      COALESCE((cp.hidden_from_for_you)::BOOLEAN, false), cp.under_review::BOOLEAN, cp.review_tag::TEXT,
      cp.is_anonymous::BOOLEAN, cp.anonymous_username::TEXT, cp.processing_status::TEXT,
      cp.is_edited::BOOLEAN, cp.is_pinned::BOOLEAN, 0.0::REAL AS feed_score, 'following'::TEXT AS feed_position_type
    FROM circle_posts cp
    WHERE cp.is_published = true
      AND (cp.user_id = ANY(v_following_ids) OR cp.user_id = p_user_id)
      AND NOT (cp.user_id = ANY(v_blocked_user_ids))
      AND NOT (cp.id = ANY(v_hidden_post_ids))
      AND NOT (cp.id = ANY(p_exclude_post_ids))
      AND COALESCE(cp.hidden_from_feeds, false) = false
      AND (p_cursor_created_at IS NULL OR cp.created_at < p_cursor_created_at OR (cp.created_at = p_cursor_created_at AND cp.id < p_cursor_post_id))
    ORDER BY cp.created_at DESC
    LIMIT p_limit;
  ELSE
    -- For You feed: all public published posts
    RETURN QUERY
    SELECT
      cp.id, cp.user_id::UUID, cp.content_type::TEXT, cp.media_urls::JSONB, cp.media_metadata::JSONB,
      cp.content::JSONB, cp.created_at::TIMESTAMPTZ, cp.updated_at::TIMESTAMPTZ, cp.visibility::TEXT,
      cp.circle_ids::UUID[], cp.subcircle_id::UUID, cp.tags::TEXT[], cp.likes_count::INTEGER,
      cp.upvotes_count::INTEGER, cp.downvotes_count::INTEGER, cp.net_votes::INTEGER,
      cp.comments_count::INTEGER, cp.shares_count::INTEGER, cp.reposts_count::INTEGER,
      cp.views_count::INTEGER, cp.wilson_score::REAL, cp.trending_velocity::REAL,
      cp.engagement_score::REAL, cp.is_published::BOOLEAN, cp.hidden_from_feeds::BOOLEAN,
      COALESCE((cp.hidden_from_for_you)::BOOLEAN, false), cp.under_review::BOOLEAN, cp.review_tag::TEXT,
      cp.is_anonymous::BOOLEAN, cp.anonymous_username::TEXT, cp.processing_status::TEXT,
      cp.is_edited::BOOLEAN, cp.is_pinned::BOOLEAN, 0.0::REAL AS feed_score, 'world'::TEXT AS feed_position_type
    FROM circle_posts cp
    WHERE cp.is_published = true
      AND cp.visibility = 'public'
      AND NOT (cp.user_id = ANY(v_blocked_user_ids))
      AND NOT (cp.id = ANY(v_hidden_post_ids))
      AND NOT (cp.id = ANY(p_exclude_post_ids))
      AND COALESCE(cp.hidden_from_feeds, false) = false
      AND (p_cursor_created_at IS NULL OR cp.created_at < p_cursor_created_at OR (cp.created_at = p_cursor_created_at AND cp.id < p_cursor_post_id))
    ORDER BY cp.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- =====================================================
-- 6. Permissions
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 7. User Sync Trigger (Auth -> Public)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'username'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 8. Storage Buckets (run these separately if needed)
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('public-media', 'public-media', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('circle-media', 'circle-media', false);
--
-- Storage RLS: Allow authenticated uploads and public reads
-- CREATE POLICY "Authenticated users can upload" ON storage.objects
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Public read access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'public-media');
-- CREATE POLICY "Users can delete own files" ON storage.objects
--   FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[2]);
