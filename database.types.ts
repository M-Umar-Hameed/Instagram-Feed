export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ad_analytics_daily: {
        Row: {
          android_impressions: number | null
          category_id: string | null
          circle_id: string | null
          clicks: number | null
          created_at: string | null
          ctr: number | null
          date: string
          estimated_revenue: number | null
          id: string
          impressions: number | null
          ios_impressions: number | null
          placement: string
        }
        Insert: {
          android_impressions?: number | null
          category_id?: string | null
          circle_id?: string | null
          clicks?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          estimated_revenue?: number | null
          id?: string
          impressions?: number | null
          ios_impressions?: number | null
          placement: string
        }
        Update: {
          android_impressions?: number | null
          category_id?: string | null
          circle_id?: string | null
          clicks?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          estimated_revenue?: number | null
          id?: string
          impressions?: number | null
          ios_impressions?: number | null
          placement?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_analytics_daily_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "circle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_analytics_daily_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "ad_analytics_daily_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          click_type: string | null
          clicked_at: string | null
          id: string
          impression_id: string | null
          user_id: string | null
        }
        Insert: {
          click_type?: string | null
          clicked_at?: string | null
          id?: string
          impression_id?: string | null
          user_id?: string | null
        }
        Update: {
          click_type?: string | null
          clicked_at?: string | null
          id?: string
          impression_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_impression_id_fkey"
            columns: ["impression_id"]
            isOneToOne: false
            referencedRelation: "ad_impressions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ad_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ad_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_format: string | null
          ad_type: string | null
          ad_unit_id: string
          category_id: string | null
          circle_id: string | null
          click_timestamp: string | null
          created_at: string | null
          device_type: string | null
          estimated_earnings: number | null
          id: string
          is_clicked: boolean | null
          placement: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          ad_format?: string | null
          ad_type?: string | null
          ad_unit_id: string
          category_id?: string | null
          circle_id?: string | null
          click_timestamp?: string | null
          created_at?: string | null
          device_type?: string | null
          estimated_earnings?: number | null
          id?: string
          is_clicked?: boolean | null
          placement: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          ad_format?: string | null
          ad_type?: string | null
          ad_unit_id?: string
          category_id?: string | null
          circle_id?: string | null
          click_timestamp?: string | null
          created_at?: string | null
          device_type?: string | null
          estimated_earnings?: number | null
          id?: string
          is_clicked?: boolean | null
          placement?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "circle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "ad_impressions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ad_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ad_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_unit_mapping: {
        Row: {
          allowed_categories: string[] | null
          android_ad_unit_id: string
          blocked_categories: string[] | null
          category_id: string | null
          category_name: string
          created_at: string | null
          id: string
          ios_ad_unit_id: string
          is_active: boolean | null
          notes: string | null
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_categories?: string[] | null
          android_ad_unit_id: string
          blocked_categories?: string[] | null
          category_id?: string | null
          category_name: string
          created_at?: string | null
          id?: string
          ios_ad_unit_id: string
          is_active?: boolean | null
          notes?: string | null
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_categories?: string[] | null
          android_ad_unit_id?: string
          blocked_categories?: string[] | null
          category_id?: string | null
          category_name?: string
          created_at?: string | null
          id?: string
          ios_ad_unit_id?: string
          is_active?: boolean | null
          notes?: string | null
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_unit_mapping_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "circle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      aura_history: {
        Row: {
          change_amount: number
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          new_aura: number
          previous_aura: number
          reason: string
          source_event_id: string | null
          source_event_type: string
          user_id: string
        }
        Insert: {
          change_amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          new_aura: number
          previous_aura: number
          reason: string
          source_event_id?: string | null
          source_event_type: string
          user_id: string
        }
        Update: {
          change_amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          new_aura?: number
          previous_aura?: number
          reason?: string
          source_event_id?: string | null
          source_event_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aura_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aura_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aura_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aura_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aura_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aura_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      circle_filter_questions: {
        Row: {
          circle_id: string
          condition: Json | null
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          is_entry_point: boolean | null
          next_action: Json | null
          options: Json | null
          parent_answer_value: string | null
          parent_question_id: string | null
          position_x: number | null
          position_y: number | null
          question: string
          question_type: string
          required: boolean | null
          updated_at: string | null
          validation_rules: Json | null
          variable_name: string | null
          weight: number | null
        }
        Insert: {
          circle_id: string
          condition?: Json | null
          created_at?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          is_entry_point?: boolean | null
          next_action?: Json | null
          options?: Json | null
          parent_answer_value?: string | null
          parent_question_id?: string | null
          position_x?: number | null
          position_y?: number | null
          question: string
          question_type: string
          required?: boolean | null
          updated_at?: string | null
          validation_rules?: Json | null
          variable_name?: string | null
          weight?: number | null
        }
        Update: {
          circle_id?: string
          condition?: Json | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          is_entry_point?: boolean | null
          next_action?: Json | null
          options?: Json | null
          parent_answer_value?: string | null
          parent_question_id?: string | null
          position_x?: number | null
          position_y?: number | null
          question?: string
          question_type?: string
          required?: boolean | null
          updated_at?: string | null
          validation_rules?: Json | null
          variable_name?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_filter_questions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "circle_filter_questions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_filter_questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "circle_filter_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          current_subcircle_id: string | null
          id: string
          is_mentor: boolean | null
          joined_at: string
          last_quiz_session_id: string | null
          last_subcircle_change_at: string | null
          mentor_subcircle_ids: string[] | null
          quiz_answers: Json | null
          quiz_percentage: number | null
          quiz_score: number | null
          role: string
          situation_check_due_date: string | null
          status: string
          subcircle_id: string | null
          user_id: string
          weighted_score: number | null
        }
        Insert: {
          circle_id: string
          current_subcircle_id?: string | null
          id?: string
          is_mentor?: boolean | null
          joined_at?: string
          last_quiz_session_id?: string | null
          last_subcircle_change_at?: string | null
          mentor_subcircle_ids?: string[] | null
          quiz_answers?: Json | null
          quiz_percentage?: number | null
          quiz_score?: number | null
          role: string
          situation_check_due_date?: string | null
          status: string
          subcircle_id?: string | null
          user_id: string
          weighted_score?: number | null
        }
        Update: {
          circle_id?: string
          current_subcircle_id?: string | null
          id?: string
          is_mentor?: boolean | null
          joined_at?: string
          last_quiz_session_id?: string | null
          last_subcircle_change_at?: string | null
          mentor_subcircle_ids?: string[] | null
          quiz_answers?: Json | null
          quiz_percentage?: number | null
          quiz_score?: number | null
          role?: string
          situation_check_due_date?: string | null
          status?: string
          subcircle_id?: string | null
          user_id?: string
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_current_subcircle_id_fkey"
            columns: ["current_subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_last_quiz_session_id_fkey"
            columns: ["last_quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_subcircle_id_fkey"
            columns: ["subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_posts: {
        Row: {
          anonymous_username: string | null
          avg_completion_rate: number | null
          circle_ids: string[] | null
          comments_count: number | null
          content: Json | null
          content_type: string
          created_at: string
          downvotes_count: number | null
          edit_count: number | null
          engagement_score: number | null
          file_size: number | null
          freshness_score: number | null
          hidden_at: string | null
          hidden_from_feeds: boolean | null
          hidden_from_for_you: boolean | null
          hidden_from_profile: boolean | null
          id: string
          is_anonymous: boolean | null
          is_edited: boolean | null
          is_hidden: boolean | null
          is_pinned: boolean | null
          is_published: boolean | null
          is_trending: boolean | null
          last_edited_at: string | null
          likes_count: number | null
          media_metadata: Json | null
          media_urls: Json | null
          net_votes: number | null
          processing_details: Json | null
          processing_status: string | null
          processing_updated_at: string | null
          published_at: string | null
          qualified_views_count: number | null
          report_count: number | null
          report_rate: number | null
          reposts_count: number | null
          review_reason: string | null
          review_tag: string | null
          shares_count: number | null
          status: string | null
          subcircle_id: string | null
          tags: string[] | null
          trending_velocity: number | null
          under_review: boolean | null
          updated_at: string
          upvotes_count: number | null
          user_id: string | null
          views_count: number | null
          visibility: string
          wilson_score: number | null
        }
        Insert: {
          anonymous_username?: string | null
          avg_completion_rate?: number | null
          circle_ids?: string[] | null
          comments_count?: number | null
          content?: Json | null
          content_type: string
          created_at?: string
          downvotes_count?: number | null
          edit_count?: number | null
          engagement_score?: number | null
          file_size?: number | null
          freshness_score?: number | null
          hidden_at?: string | null
          hidden_from_feeds?: boolean | null
          hidden_from_for_you?: boolean | null
          hidden_from_profile?: boolean | null
          id?: string
          is_anonymous?: boolean | null
          is_edited?: boolean | null
          is_hidden?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          is_trending?: boolean | null
          last_edited_at?: string | null
          likes_count?: number | null
          media_metadata?: Json | null
          media_urls?: Json | null
          net_votes?: number | null
          processing_details?: Json | null
          processing_status?: string | null
          processing_updated_at?: string | null
          published_at?: string | null
          qualified_views_count?: number | null
          report_count?: number | null
          report_rate?: number | null
          reposts_count?: number | null
          review_reason?: string | null
          review_tag?: string | null
          shares_count?: number | null
          status?: string | null
          subcircle_id?: string | null
          tags?: string[] | null
          trending_velocity?: number | null
          under_review?: boolean | null
          updated_at?: string
          upvotes_count?: number | null
          user_id?: string | null
          views_count?: number | null
          visibility: string
          wilson_score?: number | null
        }
        Update: {
          anonymous_username?: string | null
          avg_completion_rate?: number | null
          circle_ids?: string[] | null
          comments_count?: number | null
          content?: Json | null
          content_type?: string
          created_at?: string
          downvotes_count?: number | null
          edit_count?: number | null
          engagement_score?: number | null
          file_size?: number | null
          freshness_score?: number | null
          hidden_at?: string | null
          hidden_from_feeds?: boolean | null
          hidden_from_for_you?: boolean | null
          hidden_from_profile?: boolean | null
          id?: string
          is_anonymous?: boolean | null
          is_edited?: boolean | null
          is_hidden?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          is_trending?: boolean | null
          last_edited_at?: string | null
          likes_count?: number | null
          media_metadata?: Json | null
          media_urls?: Json | null
          net_votes?: number | null
          processing_details?: Json | null
          processing_status?: string | null
          processing_updated_at?: string | null
          published_at?: string | null
          qualified_views_count?: number | null
          report_count?: number | null
          report_rate?: number | null
          reposts_count?: number | null
          review_reason?: string | null
          review_tag?: string | null
          shares_count?: number | null
          status?: string | null
          subcircle_id?: string | null
          tags?: string[] | null
          trending_velocity?: number | null
          under_review?: boolean | null
          updated_at?: string
          upvotes_count?: number | null
          user_id?: string | null
          views_count?: number | null
          visibility?: string
          wilson_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_posts_subcircle_id_fkey"
            columns: ["subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_rules: {
        Row: {
          allowed_examples: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          not_allowed_examples: Json
          rule_number: number
          title: string
          updated_at: string | null
        }
        Insert: {
          allowed_examples?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          not_allowed_examples?: Json
          rule_number: number
          title: string
          updated_at?: string | null
        }
        Update: {
          allowed_examples?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          not_allowed_examples?: Json
          rule_number?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      circle_rules_versions: {
        Row: {
          change_summary: string | null
          id: string
          published_at: string | null
          published_by: string | null
          rules_snapshot: Json
          version: number
        }
        Insert: {
          change_summary?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          rules_snapshot: Json
          version: number
        }
        Update: {
          change_summary?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          rules_snapshot?: Json
          version?: number
        }
        Relationships: []
      }
      circles: {
        Row: {
          auto_join: boolean | null
          avatar_url: string | null
          banner_image: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          gsc_config: Json | null
          icon_image: string | null
          id: string
          is_filtered: boolean | null
          is_official: boolean | null
          is_private: boolean | null
          member_count: number | null
          name: string
          parent_circle_id: string | null
          pass_percentage: number | null
          prefix: string | null
          question_flow: Json | null
          settings: Json | null
          tags: string[] | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          auto_join?: boolean | null
          avatar_url?: string | null
          banner_image?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gsc_config?: Json | null
          icon_image?: string | null
          id?: string
          is_filtered?: boolean | null
          is_official?: boolean | null
          is_private?: boolean | null
          member_count?: number | null
          name: string
          parent_circle_id?: string | null
          pass_percentage?: number | null
          prefix?: string | null
          question_flow?: Json | null
          settings?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          visibility: string
        }
        Update: {
          auto_join?: boolean | null
          avatar_url?: string | null
          banner_image?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gsc_config?: Json | null
          icon_image?: string | null
          id?: string
          is_filtered?: boolean | null
          is_official?: boolean | null
          is_private?: boolean | null
          member_count?: number | null
          name?: string
          parent_circle_id?: string | null
          pass_percentage?: number | null
          prefix?: string | null
          question_flow?: Json | null
          settings?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "circle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circles_parent_circle_id_fkey"
            columns: ["parent_circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "circles_parent_circle_id_fkey"
            columns: ["parent_circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_purchases: {
        Row: {
          bundle_id: string
          coins_purchased: number
          created_at: string | null
          id: string
          platform: string
          price_usd: number
          status: string
          store_transaction_data: Json | null
          transaction_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bundle_id: string
          coins_purchased: number
          created_at?: string | null
          id?: string
          platform: string
          price_usd: number
          status?: string
          store_transaction_data?: Json | null
          transaction_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bundle_id?: string
          coins_purchased?: number
          created_at?: string | null
          id?: string
          platform?: string
          price_usd?: number
          status?: string
          store_transaction_data?: Json | null
          transaction_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          bundle_id: string | null
          created_at: string
          gift_id: string | null
          id: string
          metadata: Json | null
          post_id: string | null
          price_usd: number | null
          related_user_id: string | null
          revenue_cat_transaction_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          bundle_id?: string | null
          created_at?: string
          gift_id?: string | null
          id?: string
          metadata?: Json | null
          post_id?: string | null
          price_usd?: number | null
          related_user_id?: string | null
          revenue_cat_transaction_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          bundle_id?: string | null
          created_at?: string
          gift_id?: string | null
          id?: string
          metadata?: Json | null
          post_id?: string | null
          price_usd?: number | null
          related_user_id?: string | null
          revenue_cat_transaction_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reviews: {
        Row: {
          assigned_to: string | null
          content_creator_aura: number | null
          content_snapshot: Json
          content_url: string | null
          created_at: string | null
          id: string
          priority: number | null
          report_id: string
          review_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          content_creator_aura?: number | null
          content_snapshot: Json
          content_url?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          report_id: string
          review_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          content_creator_aura?: number | null
          content_snapshot?: Json
          content_url?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          report_id?: string
          review_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reviews_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_reviews_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_reviews_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reviews_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "user_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_request: boolean | null
          last_message: string | null
          last_message_at: string | null
          last_message_by: string | null
          participant1_id: string | null
          participant2_id: string | null
          request_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_request?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          last_message_by?: string | null
          participant1_id?: string | null
          participant2_id?: string | null
          request_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_request?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          last_message_by?: string | null
          participant1_id?: string | null
          participant2_id?: string | null
          request_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_last_message_by_fkey"
            columns: ["last_message_by"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_last_message_by_fkey"
            columns: ["last_message_by"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_last_message_by_fkey"
            columns: ["last_message_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_impression_tracking: {
        Row: {
          account_age_days: number | null
          created_at: string | null
          creator_id: string
          engagement_rate: number | null
          first_impression_at: string | null
          first_post_at: string | null
          id: string
          impressions_30d: number | null
          impressions_7d: number | null
          is_new_creator: boolean | null
          last_calculated_at: string | null
          new_creator_boost_multiplier: number | null
          total_engagement: number | null
          total_impressions: number | null
          updated_at: string | null
        }
        Insert: {
          account_age_days?: number | null
          created_at?: string | null
          creator_id: string
          engagement_rate?: number | null
          first_impression_at?: string | null
          first_post_at?: string | null
          id?: string
          impressions_30d?: number | null
          impressions_7d?: number | null
          is_new_creator?: boolean | null
          last_calculated_at?: string | null
          new_creator_boost_multiplier?: number | null
          total_engagement?: number | null
          total_impressions?: number | null
          updated_at?: string | null
        }
        Update: {
          account_age_days?: number | null
          created_at?: string | null
          creator_id?: string
          engagement_rate?: number | null
          first_impression_at?: string | null
          first_post_at?: string | null
          id?: string
          impressions_30d?: number | null
          impressions_7d?: number | null
          is_new_creator?: boolean | null
          last_calculated_at?: string | null
          new_creator_boost_multiplier?: number | null
          total_engagement?: number | null
          total_impressions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_impression_tracking_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creator_impression_tracking_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creator_impression_tracking_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_generation_cache: {
        Row: {
          algorithm_version: string | null
          cold_start_phase: string | null
          cursor_position: number | null
          expires_at: string | null
          exploration_ratio: number | null
          feed_type: string
          generated_at: string | null
          id: string
          post_ids: string[]
          post_scores: number[]
          user_id: string
        }
        Insert: {
          algorithm_version?: string | null
          cold_start_phase?: string | null
          cursor_position?: number | null
          expires_at?: string | null
          exploration_ratio?: number | null
          feed_type: string
          generated_at?: string | null
          id?: string
          post_ids: string[]
          post_scores: number[]
          user_id: string
        }
        Update: {
          algorithm_version?: string | null
          cold_start_phase?: string | null
          cursor_position?: number | null
          expires_at?: string | null
          exploration_ratio?: number | null
          feed_type?: string
          generated_at?: string | null
          id?: string
          post_ids?: string[]
          post_scores?: number[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_generation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feed_generation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feed_generation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_interactions: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_01: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_02: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_03: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_04: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_05: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_06: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_07: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_08: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_09: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_10: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_11: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2025_12: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2026_01: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2026_02: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2026_03: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2026_04: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2026_05: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      feed_interactions_2026_06: {
        Row: {
          circle_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
          weight: number
        }
        Insert: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
          weight?: number
        }
        Update: {
          circle_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      gift_analytics: {
        Row: {
          last_gift_at: string | null
          total_gift_value_coins: number | null
          total_gifts_received: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          last_gift_at?: string | null
          total_gift_value_coins?: number | null
          total_gifts_received?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          last_gift_at?: string | null
          total_gift_value_coins?: number | null
          total_gifts_received?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gift_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gift_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_catalog: {
        Row: {
          animation_url: string | null
          category: string
          coin_cost: number
          created_at: string
          description: string | null
          emoji: string | null
          gift_key: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          animation_url?: string | null
          category: string
          coin_cost: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          gift_key: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          animation_url?: string | null
          category?: string
          coin_cost?: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          gift_key?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gift_notifications: {
        Row: {
          created_at: string
          gift_sent_id: string
          id: string
          is_read: boolean
          notification_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gift_sent_id: string
          id?: string
          is_read?: boolean
          notification_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          gift_sent_id?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_notifications_gift_sent_id_fkey"
            columns: ["gift_sent_id"]
            isOneToOne: false
            referencedRelation: "gifts_sent"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_transactions: {
        Row: {
          coin_cost: number
          created_at: string | null
          gift_category: string
          gift_key: string
          id: string
          is_anonymous: boolean | null
          message: string | null
          receiver_id: string
          sender_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          coin_cost: number
          created_at?: string | null
          gift_category: string
          gift_key: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          receiver_id: string
          sender_id: string
          target_id: string
          target_type: string
        }
        Update: {
          coin_cost?: number
          created_at?: string | null
          gift_category?: string
          gift_key?: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          receiver_id?: string
          sender_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      gifts_sent: {
        Row: {
          coin_amount: number
          comment_id: string | null
          created_at: string
          gift_id: string
          id: string
          post_id: string | null
          receiver_id: string
          sender_id: string
          transaction_id: string | null
        }
        Insert: {
          coin_amount: number
          comment_id?: string | null
          created_at?: string
          gift_id: string
          id?: string
          post_id?: string | null
          receiver_id: string
          sender_id: string
          transaction_id?: string | null
        }
        Update: {
          coin_amount?: number
          comment_id?: string | null
          created_at?: string
          gift_id?: string
          id?: string
          post_id?: string | null
          receiver_id?: string
          sender_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gifts_sent_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gift_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_sent_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_mailing_list: {
        Row: {
          beta_testing: boolean | null
          email: string
          id: number
          signup_method: string | null
          signup_timestamp: string | null
        }
        Insert: {
          beta_testing?: boolean | null
          email: string
          id?: never
          signup_method?: string | null
          signup_timestamp?: string | null
        }
        Update: {
          beta_testing?: boolean | null
          email?: string
          id?: never
          signup_method?: string | null
          signup_timestamp?: string | null
        }
        Relationships: []
      }
      message_notifications: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          last_notified_at: string | null
          unread_count: number | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          last_notified_at?: string | null
          unread_count?: number | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          last_notified_at?: string | null
          unread_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          duration: number | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_read: boolean | null
          message_type: string | null
          metadata: Json | null
          mime_type: string | null
          read_at: string | null
          receiver_id: string | null
          sender_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          duration?: number | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          mime_type?: string | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          duration?: number | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          mime_type?: string | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          related_comment_id: string | null
          related_post_id: string | null
          related_user_id: string | null
          sent_push: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          related_comment_id?: string | null
          related_post_id?: string | null
          related_user_id?: string | null
          sent_push?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          related_comment_id?: string | null
          related_post_id?: string | null
          related_user_id?: string | null
          sent_push?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          anonymous_username: string | null
          content: string
          created_at: string | null
          downvotes_count: number | null
          id: string
          is_anonymous: boolean | null
          is_deleted: boolean | null
          is_edited: boolean | null
          likes_count: number | null
          net_votes: number | null
          parent_comment_id: string | null
          post_id: string
          replies_count: number | null
          updated_at: string | null
          upvotes_count: number | null
          user_id: string | null
        }
        Insert: {
          anonymous_username?: string | null
          content: string
          created_at?: string | null
          downvotes_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          likes_count?: number | null
          net_votes?: number | null
          parent_comment_id?: string | null
          post_id: string
          replies_count?: number | null
          updated_at?: string | null
          upvotes_count?: number | null
          user_id?: string | null
        }
        Update: {
          anonymous_username?: string | null
          content?: string
          created_at?: string | null
          downvotes_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          likes_count?: number | null
          net_votes?: number | null
          parent_comment_id?: string | null
          post_id?: string
          replies_count?: number | null
          updated_at?: string | null
          upvotes_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_edit_history: {
        Row: {
          created_at: string | null
          edit_reason: string | null
          edited_at: string | null
          flagged_reason: string | null
          id: string
          is_flagged: boolean | null
          moderator_notes: string | null
          new_content: Json | null
          new_media_urls: Json | null
          new_tags: string[] | null
          post_id: string
          previous_content: Json | null
          previous_media_urls: Json | null
          previous_tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          moderator_notes?: string | null
          new_content?: Json | null
          new_media_urls?: Json | null
          new_tags?: string[] | null
          post_id: string
          previous_content?: Json | null
          previous_media_urls?: Json | null
          previous_tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          moderator_notes?: string | null
          new_content?: Json | null
          new_media_urls?: Json | null
          new_tags?: string[] | null
          post_id?: string
          previous_content?: Json | null
          previous_media_urls?: Json | null
          previous_tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_edit_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_edit_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_edit_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_edit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_edit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_edit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_files: {
        Row: {
          created_at: string | null
          display_order: number
          file_id: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          file_id: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number
          file_id?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "storage_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_files_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_files_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_files_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          metadata: Json | null
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_interactions_post_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_interactions_post_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_interactions_post_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metrics: {
        Row: {
          created_at: string
          impressions_last_24h: number
          photo_text_impressions_total: number
          post_id: string
          report_rate: number
          updated_at: string
          upvotes_last_24h: number
          video_duration_seconds: number
          video_qualified_views_total: number
          watch_time_sum_seconds: number
          weighted_reports_last_24h: number
        }
        Insert: {
          created_at?: string
          impressions_last_24h?: number
          photo_text_impressions_total?: number
          post_id: string
          report_rate?: number
          updated_at?: string
          upvotes_last_24h?: number
          video_duration_seconds?: number
          video_qualified_views_total?: number
          watch_time_sum_seconds?: number
          weighted_reports_last_24h?: number
        }
        Update: {
          created_at?: string
          impressions_last_24h?: number
          photo_text_impressions_total?: number
          post_id?: string
          report_rate?: number
          updated_at?: string
          upvotes_last_24h?: number
          video_duration_seconds?: number
          video_qualified_views_total?: number
          watch_time_sum_seconds?: number
          weighted_reports_last_24h?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_votes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          is_active: boolean | null
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          condition: Json | null
          created_at: string | null
          display_order: number
          id: string
          is_correct: boolean | null
          is_terminal: boolean | null
          next_question_id: string | null
          option_code: string | null
          option_text: string
          option_value: string
          points: number | null
          question_id: string
          target_subcircle_id: string | null
          terminal_subcircle_gsc: string | null
        }
        Insert: {
          condition?: Json | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_correct?: boolean | null
          is_terminal?: boolean | null
          next_question_id?: string | null
          option_code?: string | null
          option_text: string
          option_value: string
          points?: number | null
          question_id: string
          target_subcircle_id?: string | null
          terminal_subcircle_gsc?: string | null
        }
        Update: {
          condition?: Json | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_correct?: boolean | null
          is_terminal?: boolean | null
          next_question_id?: string | null
          option_code?: string | null
          option_text?: string
          option_value?: string
          points?: number | null
          question_id?: string
          target_subcircle_id?: string | null
          terminal_subcircle_gsc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_next_question_id_fkey"
            columns: ["next_question_id"]
            isOneToOne: false
            referencedRelation: "circle_filter_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "circle_filter_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_options_target_subcircle_id_fkey"
            columns: ["target_subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_analytics: {
        Row: {
          answer_distribution: Json | null
          avg_time_seconds: number | null
          calculated_at: string | null
          circle_id: string
          id: string
          median_time_seconds: number | null
          next_questions_distribution: Json | null
          period_end: string
          period_start: string
          period_type: string
          question_id: string | null
          subcircle_assignments: Json | null
          total_responses: number | null
          unique_users: number | null
        }
        Insert: {
          answer_distribution?: Json | null
          avg_time_seconds?: number | null
          calculated_at?: string | null
          circle_id: string
          id?: string
          median_time_seconds?: number | null
          next_questions_distribution?: Json | null
          period_end: string
          period_start: string
          period_type: string
          question_id?: string | null
          subcircle_assignments?: Json | null
          total_responses?: number | null
          unique_users?: number | null
        }
        Update: {
          answer_distribution?: Json | null
          avg_time_seconds?: number | null
          calculated_at?: string | null
          circle_id?: string
          id?: string
          median_time_seconds?: number | null
          next_questions_distribution?: Json | null
          period_end?: string
          period_start?: string
          period_type?: string
          question_id?: string | null
          subcircle_assignments?: Json | null
          total_responses?: number | null
          unique_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_analytics_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "quiz_analytics_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_analytics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "circle_filter_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          circle_id: string
          completed_at: string | null
          final_subcircle_id: string | null
          id: string
          passed: boolean | null
          percentage: number | null
          question_path: string[] | null
          started_at: string | null
          status: string | null
          total_questions_answered: number | null
          total_score: number | null
          total_time_seconds: number | null
          user_id: string
        }
        Insert: {
          circle_id: string
          completed_at?: string | null
          final_subcircle_id?: string | null
          id?: string
          passed?: boolean | null
          percentage?: number | null
          question_path?: string[] | null
          started_at?: string | null
          status?: string | null
          total_questions_answered?: number | null
          total_score?: number | null
          total_time_seconds?: number | null
          user_id: string
        }
        Update: {
          circle_id?: string
          completed_at?: string | null
          final_subcircle_id?: string | null
          id?: string
          passed?: boolean | null
          percentage?: number | null
          question_path?: string[] | null
          started_at?: string | null
          status?: string | null
          total_questions_answered?: number | null
          total_score?: number | null
          total_time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "quiz_sessions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_final_subcircle_id_fkey"
            columns: ["final_subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quiz_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quiz_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reporter_history: {
        Row: {
          accuracy_percentage: number | null
          confirmed_violations_count: number | null
          false_report_dates: string[] | null
          false_reports_count: number | null
          false_reports_count_30d: number | null
          inconclusive_reports_count: number | null
          reporting_ban_expires_at: string | null
          reporting_ban_reason: string | null
          severe_reporting_disabled: boolean | null
          total_reports_submitted: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_percentage?: number | null
          confirmed_violations_count?: number | null
          false_report_dates?: string[] | null
          false_reports_count?: number | null
          false_reports_count_30d?: number | null
          inconclusive_reports_count?: number | null
          reporting_ban_expires_at?: string | null
          reporting_ban_reason?: string | null
          severe_reporting_disabled?: boolean | null
          total_reports_submitted?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_percentage?: number | null
          confirmed_violations_count?: number | null
          false_report_dates?: string[] | null
          false_reports_count?: number | null
          false_reports_count_30d?: number | null
          inconclusive_reports_count?: number | null
          reporting_ban_expires_at?: string | null
          reporting_ban_reason?: string | null
          severe_reporting_disabled?: boolean | null
          total_reports_submitted?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporter_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reporter_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reporter_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_files: {
        Row: {
          bucket_name: string
          circle_ids: string[] | null
          context_type: string
          created_at: string | null
          created_by: string
          id: string
          metadata: Json | null
          mime_type: string | null
          original_name: string
          playback_url: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          bucket_name: string
          circle_ids?: string[] | null
          context_type: string
          created_at?: string | null
          created_by: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          original_name: string
          playback_url?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string | null
          visibility: string
        }
        Update: {
          bucket_name?: string
          circle_ids?: string[] | null
          context_type?: string
          created_at?: string | null
          created_by?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          original_name?: string
          playback_url?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: []
      }
      subcircle_change_history: {
        Row: {
          auto_assigned: boolean
          changed_at: string
          circle_id: string
          id: string
          new_subcircle_id: string | null
          old_subcircle_id: string | null
          quiz_session_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          auto_assigned?: boolean
          changed_at?: string
          circle_id: string
          id?: string
          new_subcircle_id?: string | null
          old_subcircle_id?: string | null
          quiz_session_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          auto_assigned?: boolean
          changed_at?: string
          circle_id?: string
          id?: string
          new_subcircle_id?: string | null
          old_subcircle_id?: string | null
          quiz_session_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcircle_change_history_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "subcircle_change_history_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcircle_change_history_new_subcircle_id_fkey"
            columns: ["new_subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcircle_change_history_old_subcircle_id_fkey"
            columns: ["old_subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcircle_change_history_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcircle_change_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subcircle_change_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subcircle_change_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subcircles: {
        Row: {
          answer_codes: Json | null
          banner_image: string | null
          created_at: string | null
          description: string
          display_order: number
          gsc_code: string | null
          icon_image: string | null
          id: string
          is_active: boolean | null
          is_auto_generated: boolean | null
          member_count: number | null
          name: string
          parent_circle_id: string
          updated_at: string | null
        }
        Insert: {
          answer_codes?: Json | null
          banner_image?: string | null
          created_at?: string | null
          description: string
          display_order: number
          gsc_code?: string | null
          icon_image?: string | null
          id?: string
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          member_count?: number | null
          name: string
          parent_circle_id: string
          updated_at?: string | null
        }
        Update: {
          answer_codes?: Json | null
          banner_image?: string | null
          created_at?: string | null
          description?: string
          display_order?: number
          gsc_code?: string | null
          icon_image?: string | null
          id?: string
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          member_count?: number | null
          name?: string
          parent_circle_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcircles_parent_circle_id_fkey"
            columns: ["parent_circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "subcircles_parent_circle_id_fkey"
            columns: ["parent_circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_affinities: {
        Row: {
          circle_affinities: Json
          created_at: string
          creator_affinities: Json
          interaction_count: number
          tag_affinities: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          circle_affinities?: Json
          created_at?: string
          creator_affinities?: Json
          interaction_count?: number
          tag_affinities?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          circle_affinities?: Json
          created_at?: string
          creator_affinities?: Json
          interaction_count?: number
          tag_affinities?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_aura_stats: {
        Row: {
          circle_violation_dates: string[] | null
          circle_violations_last_90_days: number | null
          clean_30_days_claimed: boolean | null
          clean_60_days_claimed: boolean | null
          current_streak_days: number | null
          engagement_aura_this_month: number | null
          engagement_month_start_date: string | null
          gift_aura_this_month: number | null
          gift_month_start_date: string | null
          inactivity_penalty_applied: boolean | null
          last_active_date: string | null
          last_post_date: string | null
          last_violation_date: string | null
          longest_streak_days: number | null
          seven_day_streak_claimed: boolean | null
          sixty_day_streak_claimed: boolean | null
          thirty_day_streak_claimed: boolean | null
          unique_gifters_this_month: string[] | null
          updated_at: string | null
          user_id: string
          violation_free_days: number | null
        }
        Insert: {
          circle_violation_dates?: string[] | null
          circle_violations_last_90_days?: number | null
          clean_30_days_claimed?: boolean | null
          clean_60_days_claimed?: boolean | null
          current_streak_days?: number | null
          engagement_aura_this_month?: number | null
          engagement_month_start_date?: string | null
          gift_aura_this_month?: number | null
          gift_month_start_date?: string | null
          inactivity_penalty_applied?: boolean | null
          last_active_date?: string | null
          last_post_date?: string | null
          last_violation_date?: string | null
          longest_streak_days?: number | null
          seven_day_streak_claimed?: boolean | null
          sixty_day_streak_claimed?: boolean | null
          thirty_day_streak_claimed?: boolean | null
          unique_gifters_this_month?: string[] | null
          updated_at?: string | null
          user_id: string
          violation_free_days?: number | null
        }
        Update: {
          circle_violation_dates?: string[] | null
          circle_violations_last_90_days?: number | null
          clean_30_days_claimed?: boolean | null
          clean_60_days_claimed?: boolean | null
          current_streak_days?: number | null
          engagement_aura_this_month?: number | null
          engagement_month_start_date?: string | null
          gift_aura_this_month?: number | null
          gift_month_start_date?: string | null
          inactivity_penalty_applied?: boolean | null
          last_active_date?: string | null
          last_post_date?: string | null
          last_violation_date?: string | null
          longest_streak_days?: number | null
          seven_day_streak_claimed?: boolean | null
          sixty_day_streak_claimed?: boolean | null
          thirty_day_streak_claimed?: boolean | null
          unique_gifters_this_month?: string[] | null
          updated_at?: string | null
          user_id?: string
          violation_free_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_aura_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_aura_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_aura_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "user_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_affinities: {
        Row: {
          affinity_score: number
          calculated_at: string | null
          circle_id: string
          created_at: string | null
          id: string
          interaction_count: number | null
          interaction_score: number | null
          last_interaction_at: string | null
          membership_score: number | null
          recency_score: number | null
          updated_at: string | null
          user_id: string
          view_score: number | null
        }
        Insert: {
          affinity_score?: number
          calculated_at?: string | null
          circle_id: string
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          interaction_score?: number | null
          last_interaction_at?: string | null
          membership_score?: number | null
          recency_score?: number | null
          updated_at?: string | null
          user_id: string
          view_score?: number | null
        }
        Update: {
          affinity_score?: number
          calculated_at?: string | null
          circle_id?: string
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          interaction_score?: number | null
          last_interaction_at?: string | null
          membership_score?: number | null
          recency_score?: number | null
          updated_at?: string | null
          user_id?: string
          view_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_category_affinities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_category_affinities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_category_affinities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_circle_answers: {
        Row: {
          circle_id: string
          created_at: string | null
          id: string
          option_code: string | null
          option_id: string | null
          question_id: string
          updated_at: string | null
          user_id: string
          variable_name: string | null
        }
        Insert: {
          circle_id: string
          created_at?: string | null
          id?: string
          option_code?: string | null
          option_id?: string | null
          question_id: string
          updated_at?: string | null
          user_id: string
          variable_name?: string | null
        }
        Update: {
          circle_id?: string
          created_at?: string | null
          id?: string
          option_code?: string | null
          option_id?: string | null
          question_id?: string
          updated_at?: string | null
          user_id?: string
          variable_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_circle_answers_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "user_circle_answers_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_circle_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "circle_filter_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_circle_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_circle_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_circle_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_circle_violations: {
        Row: {
          circle_id: string
          created_at: string | null
          id: string
          last_violation_at: string | null
          updated_at: string | null
          user_id: string
          violation_count: number | null
          violation_dates: string[] | null
        }
        Insert: {
          circle_id: string
          created_at?: string | null
          id?: string
          last_violation_at?: string | null
          updated_at?: string | null
          user_id: string
          violation_count?: number | null
          violation_dates?: string[] | null
        }
        Update: {
          circle_id?: string
          created_at?: string | null
          id?: string
          last_violation_at?: string | null
          updated_at?: string | null
          user_id?: string
          violation_count?: number | null
          violation_dates?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_circle_violations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_circle_violations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_circle_violations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          total_purchased: number
          total_received: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          total_purchased?: number
          total_received?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          total_purchased?: number
          total_received?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_content_type_preferences: {
        Row: {
          avg_completion_rate: number | null
          avg_watch_time_seconds: number | null
          calculated_at: string | null
          comment_count: number | null
          content_type: string
          created_at: string | null
          id: string
          like_count: number | null
          preference_score: number
          share_count: number | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          avg_completion_rate?: number | null
          avg_watch_time_seconds?: number | null
          calculated_at?: string | null
          comment_count?: number | null
          content_type: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          preference_score?: number
          share_count?: number | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          avg_completion_rate?: number | null
          avg_watch_time_seconds?: number | null
          calculated_at?: string | null
          comment_count?: number | null
          content_type?: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          preference_score?: number
          share_count?: number | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_content_type_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_content_type_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_content_type_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feed_history: {
        Row: {
          created_at: string
          feed_type: string
          id: string
          last_viewed_at: string
          post_ids: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_type: string
          id?: string
          last_viewed_at?: string
          post_ids?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          feed_type?: string
          id?: string
          last_viewed_at?: string
          post_ids?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_feed_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_feed_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feed_preferences: {
        Row: {
          blocked_user_ids: string[] | null
          excluded_circles: string[] | null
          feed_algorithm_settings: Json | null
          freshness_weight: number | null
          hidden_post_ids: string[] | null
          interests: string[] | null
          last_updated: string
          min_engagement_threshold: number | null
          not_interested_topics: string[] | null
          preferred_content_types: string[] | null
          similarity_weight: number | null
          trending_weight: number | null
          user_id: string
        }
        Insert: {
          blocked_user_ids?: string[] | null
          excluded_circles?: string[] | null
          feed_algorithm_settings?: Json | null
          freshness_weight?: number | null
          hidden_post_ids?: string[] | null
          interests?: string[] | null
          last_updated?: string
          min_engagement_threshold?: number | null
          not_interested_topics?: string[] | null
          preferred_content_types?: string[] | null
          similarity_weight?: number | null
          trending_weight?: number | null
          user_id: string
        }
        Update: {
          blocked_user_ids?: string[] | null
          excluded_circles?: string[] | null
          feed_algorithm_settings?: Json | null
          freshness_weight?: number | null
          hidden_post_ids?: string[] | null
          interests?: string[] | null
          last_updated?: string
          min_engagement_threshold?: number | null
          not_interested_topics?: string[] | null
          preferred_content_types?: string[] | null
          similarity_weight?: number | null
          trending_weight?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_feed_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_feed_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gift_stats: {
        Row: {
          created_at: string
          id: string
          most_received_gift_id: string | null
          most_sent_gift_id: string | null
          total_coins_received: number
          total_coins_spent: number
          total_gifts_received: number
          total_gifts_sent: number
          unique_gifters_count: number
          unique_recipients_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          most_received_gift_id?: string | null
          most_sent_gift_id?: string | null
          total_coins_received?: number
          total_coins_spent?: number
          total_gifts_received?: number
          total_gifts_sent?: number
          unique_gifters_count?: number
          unique_recipients_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          most_received_gift_id?: string | null
          most_sent_gift_id?: string | null
          total_coins_received?: number
          total_coins_spent?: number
          total_gifts_received?: number
          total_gifts_sent?: number
          unique_gifters_count?: number
          unique_recipients_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gift_stats_most_received_gift_id_fkey"
            columns: ["most_received_gift_id"]
            isOneToOne: false
            referencedRelation: "gift_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_gift_stats_most_sent_gift_id_fkey"
            columns: ["most_sent_gift_id"]
            isOneToOne: false
            referencedRelation: "gift_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gsc_assignments: {
        Row: {
          assigned_at: string | null
          circle_id: string
          gsc_code: string
          id: string
          subcircle_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          circle_id: string
          gsc_code: string
          id?: string
          subcircle_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          circle_id?: string
          gsc_code?: string
          id?: string
          subcircle_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gsc_assignments_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "user_gsc_assignments_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_gsc_assignments_subcircle_id_fkey"
            columns: ["subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_gsc_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_gsc_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_gsc_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_liked_posts: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          interaction_context: string | null
          liked_at: string
          post_id: string
          user_id: string
          video_progress: number | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          interaction_context?: string | null
          liked_at?: string
          post_id: string
          user_id: string
          video_progress?: number | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          interaction_context?: string | null
          liked_at?: string
          post_id?: string
          user_id?: string
          video_progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_liked_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_liked_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "user_liked_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_liked_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_liked_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_liked_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_answers: {
        Row: {
          answered_at: string | null
          circle_id: string
          id: string
          subcircle_id: string | null
          user_id: string
          variable_name: string
          variable_values: Json
        }
        Insert: {
          answered_at?: string | null
          circle_id: string
          id?: string
          subcircle_id?: string | null
          user_id: string
          variable_name: string
          variable_values: Json
        }
        Update: {
          answered_at?: string | null
          circle_id?: string
          id?: string
          subcircle_id?: string | null
          user_id?: string
          variable_name?: string
          variable_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_answers_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "user_quiz_answers_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_answers_subcircle_id_fkey"
            columns: ["subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_quiz_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_quiz_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_answers_backup: {
        Row: {
          answered_at: string | null
          circle_id: string | null
          id: string | null
          subcircle_id: string | null
          user_id: string | null
          variable_name: string | null
          variable_values: Json | null
        }
        Insert: {
          answered_at?: string | null
          circle_id?: string | null
          id?: string | null
          subcircle_id?: string | null
          user_id?: string | null
          variable_name?: string | null
          variable_values?: Json | null
        }
        Update: {
          answered_at?: string | null
          circle_id?: string | null
          id?: string | null
          subcircle_id?: string | null
          user_id?: string | null
          variable_name?: string | null
          variable_values?: Json | null
        }
        Relationships: []
      }
      user_quiz_responses: {
        Row: {
          answer_text: string
          answer_value: string
          answered_at: string | null
          assigned_subcircle_id: string | null
          circle_id: string
          id: string
          is_correct: boolean | null
          next_question_id: string | null
          points_earned: number | null
          question_id: string
          question_text: string
          session_id: string
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          answer_text: string
          answer_value: string
          answered_at?: string | null
          assigned_subcircle_id?: string | null
          circle_id: string
          id?: string
          is_correct?: boolean | null
          next_question_id?: string | null
          points_earned?: number | null
          question_id: string
          question_text: string
          session_id: string
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          answer_text?: string
          answer_value?: string
          answered_at?: string | null
          assigned_subcircle_id?: string | null
          circle_id?: string
          id?: string
          is_correct?: boolean | null
          next_question_id?: string | null
          points_earned?: number | null
          question_id?: string
          question_text?: string
          session_id?: string
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_responses_assigned_subcircle_id_fkey"
            columns: ["assigned_subcircle_id"]
            isOneToOne: false
            referencedRelation: "subcircles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_responses_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "user_quiz_responses_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_responses_next_question_id_fkey"
            columns: ["next_question_id"]
            isOneToOne: false
            referencedRelation: "circle_filter_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "circle_filter_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_quiz_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_quiz_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_responses_backup: {
        Row: {
          answer_text: string | null
          answer_value: string | null
          answered_at: string | null
          assigned_subcircle_id: string | null
          circle_id: string | null
          id: string | null
          is_correct: boolean | null
          next_question_id: string | null
          points_earned: number | null
          question_id: string | null
          question_text: string | null
          session_id: string | null
          time_spent_seconds: number | null
          user_id: string | null
        }
        Insert: {
          answer_text?: string | null
          answer_value?: string | null
          answered_at?: string | null
          assigned_subcircle_id?: string | null
          circle_id?: string | null
          id?: string | null
          is_correct?: boolean | null
          next_question_id?: string | null
          points_earned?: number | null
          question_id?: string | null
          question_text?: string | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          answer_text?: string | null
          answer_value?: string | null
          answered_at?: string | null
          assigned_subcircle_id?: string | null
          circle_id?: string | null
          id?: string | null
          is_correct?: boolean | null
          next_question_id?: string | null
          points_earned?: number | null
          question_id?: string | null
          question_text?: string | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          additional_context: string | null
          aura_changes_applied: boolean | null
          circle_id: string | null
          content_hidden_at: string | null
          content_id: string
          content_restored_at: string | null
          content_type: string
          created_at: string | null
          hide_from_all_feeds: boolean | null
          id: string
          moderator_id: string | null
          moderator_notes: string | null
          report_category: string | null
          report_type: string
          reported_user_aura_change: number | null
          reported_user_id: string
          reporter_aura_change: number | null
          reporter_id: string
          reviewed_at: string | null
          status: string | null
          updated_at: string | null
          verdict: string | null
          violated_rule_numbers: number[] | null
          violation_severity: string | null
        }
        Insert: {
          additional_context?: string | null
          aura_changes_applied?: boolean | null
          circle_id?: string | null
          content_hidden_at?: string | null
          content_id: string
          content_restored_at?: string | null
          content_type: string
          created_at?: string | null
          hide_from_all_feeds?: boolean | null
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          report_category?: string | null
          report_type: string
          reported_user_aura_change?: number | null
          reported_user_id: string
          reporter_aura_change?: number | null
          reporter_id: string
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
          verdict?: string | null
          violated_rule_numbers?: number[] | null
          violation_severity?: string | null
        }
        Update: {
          additional_context?: string | null
          aura_changes_applied?: boolean | null
          circle_id?: string | null
          content_hidden_at?: string | null
          content_id?: string
          content_restored_at?: string | null
          content_type?: string
          created_at?: string | null
          hide_from_all_feeds?: boolean | null
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          report_category?: string | null
          report_type?: string
          reported_user_aura_change?: number | null
          reported_user_id?: string
          reporter_aura_change?: number | null
          reporter_id?: string
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
          verdict?: string | null
          violated_rule_numbers?: number[] | null
          violation_severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circle_analytics"
            referencedColumns: ["circle_id"]
          },
          {
            foreignKeyName: "user_reports_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rules_acceptance: {
        Row: {
          accepted_at: string | null
          id: string
          rules_snapshot: Json
          rules_version: number
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          rules_snapshot: Json
          rules_version: number
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          rules_snapshot?: Json
          rules_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rules_acceptance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_rules_acceptance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_rules_acceptance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          aura_points: number
          circles_created: number
          circles_joined: number
          created_at: string
          experience_points: number
          last_activity_date: string | null
          level: number
          streak_days: number
          total_comments: number
          total_downvotes_given: number
          total_downvotes_received: number
          total_posts: number
          total_upvotes_given: number
          total_upvotes_received: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aura_points?: number
          circles_created?: number
          circles_joined?: number
          created_at?: string
          experience_points?: number
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          total_comments?: number
          total_downvotes_given?: number
          total_downvotes_received?: number
          total_posts?: number
          total_upvotes_given?: number
          total_upvotes_received?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aura_points?: number
          circles_created?: number
          circles_joined?: number
          created_at?: string
          experience_points?: number
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          total_comments?: number
          total_downvotes_given?: number
          total_downvotes_received?: number
          total_posts?: number
          total_upvotes_given?: number
          total_upvotes_received?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_created_at: string | null
          aura_points: number | null
          aura_tier: string | null
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          can_comment: boolean | null
          can_dm: boolean | null
          can_gift: boolean | null
          can_post: boolean | null
          circles_groups: string[] | null
          created_at: string | null
          email: string
          followers_count: number | null
          following_count: number | null
          id: string
          is_restricted: boolean | null
          language: string | null
          last_name: string | null
          likes_given: number | null
          name: string | null
          notification_preferences: Json | null
          posts_comment_count: number | null
          preferences: Json | null
          total_likes_received: number | null
          updated_at: string | null
          user_role: string | null
          username: string | null
        }
        Insert: {
          account_created_at?: string | null
          aura_points?: number | null
          aura_tier?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          can_comment?: boolean | null
          can_dm?: boolean | null
          can_gift?: boolean | null
          can_post?: boolean | null
          circles_groups?: string[] | null
          created_at?: string | null
          email: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_restricted?: boolean | null
          language?: string | null
          last_name?: string | null
          likes_given?: number | null
          name?: string | null
          notification_preferences?: Json | null
          posts_comment_count?: number | null
          preferences?: Json | null
          total_likes_received?: number | null
          updated_at?: string | null
          user_role?: string | null
          username?: string | null
        }
        Update: {
          account_created_at?: string | null
          aura_points?: number | null
          aura_tier?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          can_comment?: boolean | null
          can_dm?: boolean | null
          can_gift?: boolean | null
          can_post?: boolean | null
          circles_groups?: string[] | null
          created_at?: string | null
          email?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_restricted?: boolean | null
          language?: string | null
          last_name?: string | null
          likes_given?: number | null
          name?: string | null
          notification_preferences?: Json | null
          posts_comment_count?: number | null
          preferences?: Json | null
          total_likes_received?: number | null
          updated_at?: string | null
          user_role?: string | null
          username?: string | null
        }
        Relationships: []
      }
      video_qualified_views: {
        Row: {
          id: string
          post_id: string
          qualified_at: string
          user_id: string
          video_duration_seconds: number
          watch_duration_seconds: number
        }
        Insert: {
          id?: string
          post_id: string
          qualified_at?: string
          user_id: string
          video_duration_seconds: number
          watch_duration_seconds: number
        }
        Update: {
          id?: string
          post_id?: string
          qualified_at?: string
          user_id?: string
          video_duration_seconds?: number
          watch_duration_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_qualified_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_qualified_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mv_content_metrics_7d"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "video_qualified_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trending_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      circle_analytics: {
        Row: {
          active_members_last_30_days: number | null
          avg_quiz_percentage: number | null
          circle_id: string | null
          circle_name: string | null
          most_popular_subcircle_id: string | null
          total_members: number | null
          total_posts: number | null
          total_quizzes_completed: number | null
        }
        Insert: {
          active_members_last_30_days?: never
          avg_quiz_percentage?: never
          circle_id?: string | null
          circle_name?: string | null
          most_popular_subcircle_id?: never
          total_members?: number | null
          total_posts?: never
          total_quizzes_completed?: never
        }
        Update: {
          active_members_last_30_days?: never
          avg_quiz_percentage?: never
          circle_id?: string | null
          circle_name?: string | null
          most_popular_subcircle_id?: never
          total_members?: number | null
          total_posts?: never
          total_quizzes_completed?: never
        }
        Relationships: []
      }
      mv_content_metrics_7d: {
        Row: {
          age_hours: number | null
          author_id: string | null
          avg_watch_time: number | null
          circle_ids: string[] | null
          circle_score: number | null
          comments: number | null
          content_type: string | null
          created_at: string | null
          creator_aura: number | null
          downvotes: number | null
          is_published: boolean | null
          likes: number | null
          post_id: string | null
          qualified_views: number | null
          report_count: number | null
          shares: number | null
          tags: string[] | null
          upvotes: number | null
          upvotes_last_24h: number | null
          views: number | null
          visibility: string | null
          wilson_score: number | null
          world_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_creator_stats: {
        Row: {
          avg_engagement_score: number | null
          avg_likes_per_post: number | null
          calculated_at: string | null
          followers_count: number | null
          following_count: number | null
          image_count: number | null
          name: string | null
          posts_30d: number | null
          posts_7d: number | null
          text_count: number | null
          total_comments: number | null
          total_likes: number | null
          total_posts: number | null
          total_views: number | null
          user_id: string | null
          username: string | null
          video_count: number | null
        }
        Relationships: []
      }
      mv_hourly_user_preferences: {
        Row: {
          calculated_at: string | null
          circle_id: string | null
          content_type: string | null
          interaction_count: number | null
          last_interaction: string | null
          user_id: string | null
          weighted_score: number | null
        }
        Relationships: []
      }
      trending_posts: {
        Row: {
          author_username: string | null
          circle_id: string | null
          circle_name: string | null
          comments_count: number | null
          content: Json | null
          content_type: string | null
          created_at: string | null
          engagement_score: number | null
          id: string | null
          is_official: boolean | null
          is_pinned: boolean | null
          is_trending: boolean | null
          likes_count: number | null
          media_metadata: Json | null
          media_urls: Json | null
          shares_count: number | null
          tags: string[] | null
          trending_score: number | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_creator_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_statistics: {
        Row: {
          avg_completion_time_seconds: number | null
          avg_quiz_percentage: number | null
          circles_joined_via_quiz: number | null
          email: string | null
          last_quiz_date: string | null
          total_quizzes_completed: number | null
          total_quizzes_taken: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_coins_from_purchase: {
        Args: {
          p_amount: number
          p_bundle_id: string
          p_price_usd: number
          p_revenue_cat_transaction_id: string
          p_user_id: string
        }
        Returns: {
          new_balance: number
          transaction_id: string
        }[]
      }
      add_coins_to_balance: {
        Args: { p_coins: number; p_user_id: string }
        Returns: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          total_purchased: number
          total_received: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_coins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      aggregate_user_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      apply_behavioral_penalty: {
        Args: {
          p_report_id?: string
          p_user_id: string
          p_violation_type: string
        }
        Returns: Json
      }
      apply_circle_violation_per_circle: {
        Args: {
          p_circle_id: string
          p_moderator_id?: string
          p_user_id: string
          p_violation_reason: string
        }
        Returns: Json
      }
      apply_gift_based_aura: {
        Args: {
          p_coins_received: number
          p_gifter_id: string
          p_receiver_id: string
        }
        Returns: Json
      }
      apply_private_circle: {
        Args: { p_circle_id: string; p_user_id: string }
        Returns: Json
      }
      apply_report_verdict: {
        Args: {
          p_moderator_id?: string
          p_moderator_notes?: string
          p_report_id: string
          p_verdict: string
          p_violation_severity?: string
        }
        Returns: Json
      }
      calculate_engagement_aura_for_comment: {
        Args: { p_comment_id: string; p_comment_owner_id: string }
        Returns: Json
      }
      calculate_engagement_aura_for_post: {
        Args: { p_post_id: string; p_post_owner_id: string }
        Returns: Json
      }
      calculate_post_score: {
        Args: {
          p_content_affinity?: number
          p_creator_affinity?: number
          p_post_id: string
          p_user_id: string
        }
        Returns: number
      }
      calculate_post_score_v2: {
        Args: { p_post_id: string; p_score_type?: string; p_visibility: string }
        Returns: number
      }
      calculate_qualified_views: {
        Args: { p_post_id: string }
        Returns: number
      }
      calculate_watch_time_score: {
        Args: { p_post_id: string }
        Returns: number
      }
      calculate_wilson_score: {
        Args: { p_downvotes: number; p_upvotes: number }
        Returns: number
      }
      can_access_file: {
        Args: { p_file_id: string; p_user_id: string }
        Returns: boolean
      }
      can_user_comment_in_subcircle: {
        Args: { p_circle_id: string; p_subcircle_id: string; p_user_id: string }
        Returns: boolean
      }
      can_user_create_post_in_subcircle: {
        Args: { p_circle_id: string; p_subcircle_id: string; p_user_id: string }
        Returns: boolean
      }
      complete_rewarded_ad: {
        Args: {
          p_ad_unit_id: string
          p_impression_id: string
          p_reward_amount: number
          p_reward_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_next_interaction_partition: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_body?: string
          p_data?: Json
          p_related_comment_id?: string
          p_related_post_id?: string
          p_related_user_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      decrement_post_likes: {
        Args: { post_id_param: string }
        Returns: {
          likes_count: number
        }[]
      }
      deduct_coins_for_gift: {
        Args: { p_coin_cost: number; p_sender_id: string }
        Returns: boolean
      }
      delete_user_safely: { Args: { p_user_id: string }; Returns: undefined }
      edit_post: {
        Args: {
          p_edit_reason?: string
          p_new_content: Json
          p_new_media_urls?: Json
          p_new_tags?: string[]
          p_post_id: string
          p_user_id: string
        }
        Returns: {
          edited_post: Json
          message: string
          success: boolean
        }[]
      }
      exec_sql: {
        Args: { params?: string[]; sql: string }
        Returns: {
          result: Json
        }[]
      }
      generate_for_you_feed: {
        Args: { limit_count?: number; requesting_user_id: string }
        Returns: {
          circle_ids: string[]
          comments_count: number
          content: string
          content_type: string
          created_at: string
          id: string
          is_published: boolean
          likes_count: number
          media_metadata: Json
          media_urls: Json
          shares_count: number
          updated_at: string
          user_id: string
        }[]
      }
      generate_for_you_feed_with_liked: {
        Args: {
          include_liked_posts?: boolean
          limit_count?: number
          requesting_user_id: string
        }
        Returns: {
          circle_id: string
          comments_count: number
          content: string
          content_type: string
          created_at: string
          id: string
          is_user_liked: boolean
          likes_count: number
          media_metadata: Json
          media_urls: Json
          shares_count: number
          updated_at: string
          user_id: string
        }[]
      }
      generate_my_circles_feed: {
        Args: { limit_count?: number; requesting_user_id: string }
        Returns: {
          circle_ids: string[]
          comments_count: number
          content: string
          content_type: string
          created_at: string
          id: string
          is_published: boolean
          likes_count: number
          media_metadata: Json
          media_urls: Json
          shares_count: number
          updated_at: string
          user_id: string
        }[]
      }
      get_ad_unit_for_category: {
        Args: { p_category_id: string; p_device_type: string }
        Returns: string
      }
      get_all_unread_counts: { Args: { p_user_id: string }; Returns: Json }
      get_aura_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          aura_points: number
          name: string
          rank_position: number
          total_posts: number
          total_upvotes: number
          user_id: string
          username: string
        }[]
      }
      get_aura_multiplier: { Args: { p_aura_points: number }; Returns: number }
      get_aura_tier: {
        Args: { p_aura: number }
        Returns: {
          can_comment: boolean
          can_dm: boolean
          can_gift: boolean
          can_post: boolean
          color: string
          label: string
          tier: string
        }[]
      }
      get_cold_start_phase: { Args: { p_user_id: string }; Returns: string }
      get_interaction_weight: {
        Args: { p_interaction_type: string }
        Returns: number
      }
      get_mutual_friend_suggestions: {
        Args: { limit_count?: number; user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          email: string
          followers_count: number
          following_count: number
          id: string
          mutual_count: number
          name: string
          username: string
        }[]
      }
      get_notification_counts: {
        Args: { p_user_id: string }
        Returns: {
          count: number
          type: string
        }[]
      }
      get_or_create_conversation: {
        Args: {
          is_message_request?: boolean
          user1_id: string
          user2_id: string
        }
        Returns: string
      }
      get_possible_scores: { Args: { questions: Json }; Returns: number[] }
      get_post_edit_history: {
        Args: { p_post_id: string; p_requesting_user_id?: string }
        Returns: {
          edit_reason: string
          edited_at: string
          editor_name: string
          editor_username: string
          id: string
          new_content: Json
          new_media_urls: Json
          new_tags: string[]
          previous_content: Json
          previous_media_urls: Json
          previous_tags: string[]
        }[]
      }
      get_posts_vote_status: {
        Args: { p_post_ids: string[]; p_user_id: string }
        Returns: {
          downvotes: number
          net_votes: number
          post_id: string
          upvotes: number
          vote_type: string
        }[]
      }
      get_push_notification_payload: {
        Args: {
          notification_row: Database["public"]["Tables"]["notifications"]["Row"]
        }
        Returns: Json
      }
      get_ranked_feed: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_post_id?: string
          p_exclude_post_ids?: string[]
          p_feed_type?: string
          p_limit?: number
          p_subcircle_id?: string
          p_user_id: string
          p_user_mentor_subcircle_ids?: string[]
          p_user_subcircle_ids?: string[]
        }
        Returns: {
          anonymous_username: string
          circle_ids: string[]
          comments_count: number
          content: Json
          content_type: string
          created_at: string
          downvotes_count: number
          engagement_score: number
          feed_position_type: string
          feed_score: number
          hidden_from_feeds: boolean
          hidden_from_for_you: boolean
          id: string
          is_anonymous: boolean
          is_edited: boolean
          is_pinned: boolean
          is_published: boolean
          likes_count: number
          media_metadata: Json
          media_urls: Json
          net_votes: number
          processing_status: string
          reposts_count: number
          review_tag: string
          shares_count: number
          subcircle_id: string
          tags: string[]
          trending_velocity: number
          under_review: boolean
          updated_at: string
          upvotes_count: number
          user_id: string
          views_count: number
          visibility: string
          wilson_score: number
        }[]
      }
      get_safety_multiplier: {
        Args: { p_report_rate: number }
        Returns: number
      }
      get_total_unread_notifications: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_total_user_count: { Args: never; Returns: number }
      get_user_ad_count_last_hour: {
        Args: { p_ad_type: string; p_user_id: string }
        Returns: number
      }
      get_user_aura_breakdown: {
        Args: { p_user_id: string }
        Returns: {
          aura_points_earned: number
          aura_points_lost: number
          current_aura_points: number
          net_votes: number
          total_downvotes: number
          total_posts: number
          total_upvotes: number
          user_id: string
        }[]
      }
      get_user_coin_balance: { Args: { p_user_id: string }; Returns: number }
      get_user_posts: {
        Args: { p_user_id: string }
        Returns: {
          circle_ids: string[]
          content: string
          content_type: string
          created_at: string
          id: string
          likes_count: number
          media_urls: string[]
          user_id: string
          views_count: number
        }[]
      }
      grant_premium_status: {
        Args: { duration_days?: number; target_user_id: string }
        Returns: undefined
      }
      increment_circle_violations: {
        Args: { p_user_id: string }
        Returns: Json
      }
      increment_post_comments: {
        Args: { target_post_id: string }
        Returns: undefined
      }
      increment_post_likes: {
        Args: { post_id_param: string }
        Returns: {
          likes_count: number
        }[]
      }
      initialize_user_coins: { Args: { p_user_id: string }; Returns: undefined }
      is_admin_or_moderator: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_voter_eligible: { Args: { p_user_id: string }; Returns: boolean }
      join_public_circle: {
        Args: { p_circle_id: string; p_user_id: string }
        Returns: Json
      }
      mark_notifications_read: {
        Args: { p_type?: string; p_user_id: string }
        Returns: number
      }
      migrate_existing_quiz_questions: { Args: never; Returns: undefined }
      process_daily_aura_recovery: { Args: never; Returns: number }
      prune_old_interaction_partitions: {
        Args: { days_to_keep?: number }
        Returns: undefined
      }
      recalculate_all_comment_counts: { Args: never; Returns: undefined }
      recalculate_post_comment_count: {
        Args: { target_post_id: string }
        Returns: number
      }
      record_ad_click: {
        Args: {
          p_click_type?: string
          p_impression_id: string
          p_user_id: string
        }
        Returns: string
      }
      record_ad_impression: {
        Args: {
          p_ad_unit_id: string
          p_category_id?: string
          p_circle_id?: string
          p_device_type?: string
          p_placement: string
          p_session_id?: string
          p_user_id: string
        }
        Returns: string
      }
      record_feed_events: {
        Args: {
          p_events: Database["public"]["CompositeTypes"]["feed_event_input"][]
        }
        Returns: undefined
      }
      record_feed_interaction: {
        Args: {
          p_interaction_type: string
          p_metadata?: Json
          p_post_id: string
          p_user_id: string
        }
        Returns: string
      }
      record_post_repost: {
        Args: {
          p_post_id: string
          p_repost_comment?: string
          p_repost_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      record_post_share: {
        Args: { p_metadata?: Json; p_post_id: string; p_user_id: string }
        Returns: {
          shares_count: number
        }[]
      }
      refresh_feed_metrics: { Args: never; Returns: undefined }
      refresh_post_metrics: { Args: never; Returns: undefined }
      refresh_user_affinities: { Args: never; Returns: undefined }
      register_storage_file: {
        Args: {
          p_bucket_name: string
          p_circle_ids: string[]
          p_context_type: string
          p_metadata?: Json
          p_mime_type: string
          p_original_name: string
          p_size_bytes: number
          p_storage_path: string
          p_visibility: string
        }
        Returns: string
      }
      remove_post_repost: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: Json
      }
      search_uuid_in_all_tables: {
        Args: { search_uuid: string }
        Returns: {
          column_name: string
          row_count: number
          table_name: string
        }[]
      }
      send_gift: {
        Args: {
          p_comment_id?: string
          p_gift_id: string
          p_post_id?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: {
          gift_sent_id: string
          message: string
          success: boolean
        }[]
      }
      toggle_comment_like: {
        Args: { comment_id: string; user_id: string }
        Returns: boolean
      }
      update_ad_analytics_daily: {
        Args: { p_date?: string }
        Returns: undefined
      }
      update_creator_impressions: {
        Args: { p_creator_id: string; p_increment?: number }
        Returns: undefined
      }
      update_false_reporter_tracking: {
        Args: { p_is_false_report: boolean; p_reporter_id: string }
        Returns: undefined
      }
      update_post_votes: {
        Args: { p_post_id: string; p_user_id: string; p_vote_type: string }
        Returns: {
          downvotes_count: number
          net_votes: number
          upvotes_count: number
          user_vote_type: string
        }[]
      }
      update_post_wilson_scores: { Args: never; Returns: undefined }
      update_reporter_history_on_verdict: {
        Args: { p_reporter_id: string; p_verdict: string }
        Returns: Json
      }
      update_user_aura:
        | {
            Args: {
              p_change_amount: number
              p_created_by?: string
              p_metadata?: Json
              p_reason: string
              p_source_event_id?: string
              p_source_event_type: string
              p_user_id: string
            }
            Returns: number
          }
        | {
            Args: {
              p_change_amount: number
              p_force_to_zero?: boolean
              p_metadata?: Json
              p_reason: string
              p_source_event_id?: string
              p_source_event_type: string
              p_user_id: string
            }
            Returns: Json
          }
      update_user_aura_points: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      feed_event_input: {
        post_id: string | null
        user_id: string | null
        event_type: string | null
        value: number | null
        video_duration_seconds: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
