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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      course_import_jobs: {
        Row: { id: number; source_document_id: number; requested_by: string; status: Database["public"]["Enums"]["course_import_status"]; current_outline_revision: number; approved_outline_revision: number | null; error_code: string | null; published_course_id: number | null; initialization_key: string | null; initialization_fingerprint: string | null; created_at: string; updated_at: string }
        Insert: { id?: never; source_document_id: number; requested_by: string; status?: Database["public"]["Enums"]["course_import_status"]; current_outline_revision?: number; approved_outline_revision?: number | null; error_code?: string | null; published_course_id?: number | null; initialization_key?: string | null; initialization_fingerprint?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: never; source_document_id?: number; requested_by?: string; status?: Database["public"]["Enums"]["course_import_status"]; current_outline_revision?: number; approved_outline_revision?: number | null; error_code?: string | null; published_course_id?: number | null; initialization_key?: string | null; initialization_fingerprint?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      course_import_job_sources: {
        Row: { job_id: number; source_document_id: number; source_order: number; relevance_score: number | null; added_at: string }
        Insert: { job_id: number; source_document_id: number; source_order: number; relevance_score?: number | null; added_at?: string }
        Update: { job_id?: number; source_document_id?: number; source_order?: number; relevance_score?: number | null; added_at?: string }
        Relationships: []
      }
      course_drafts: {
        Row: { id: number; job_id: number; revision: number; title: string; description: string; provider: string; model: string | null; created_at: string }
        Insert: { id?: never; job_id: number; revision: number; title: string; description: string; provider: string; model?: string | null; created_at?: string }
        Update: { id?: never; job_id?: number; revision?: number; title?: string; description?: string; provider?: string; model?: string | null; created_at?: string }
        Relationships: []
      }
      course_draft_objectives: {
        Row: { id: number; course_draft_id: number; objective_order: number; objective: string }
        Insert: { id?: never; course_draft_id: number; objective_order: number; objective: string }
        Update: { id?: never; course_draft_id?: number; objective_order?: number; objective?: string }
        Relationships: []
      }
      course_outline_lessons: {
        Row: { id: number; course_draft_id: number; client_key: string; lesson_order: number; title: string; summary: string }
        Insert: { id?: never; course_draft_id: number; client_key: string; lesson_order: number; title: string; summary: string }
        Update: { id?: never; course_draft_id?: number; client_key?: string; lesson_order?: number; title?: string; summary?: string }
        Relationships: []
      }
      course_outline_lesson_objectives: {
        Row: { id: number; outline_lesson_id: number; objective_order: number; objective: string }
        Insert: { id?: never; outline_lesson_id: number; objective_order: number; objective: string }
        Update: { id?: never; outline_lesson_id?: number; objective_order?: number; objective?: string }
        Relationships: []
      }
      course_outline_lesson_sources: {
        Row: { outline_lesson_id: number; document_chunk_id: number; source_order: number }
        Insert: { outline_lesson_id: number; document_chunk_id: number; source_order: number }
        Update: { outline_lesson_id?: number; document_chunk_id?: number; source_order?: number }
        Relationships: []
      }
      lesson_content_drafts: {
        Row: { id: number; outline_lesson_id: number; revision: number; title: string; summary: string; estimated_minutes: number; sections: Json; status: Database["public"]["Enums"]["lesson_content_draft_status"]; provider: string; model: string | null; created_at: string; updated_at: string }
        Insert: { id?: never; outline_lesson_id: number; revision: number; title: string; summary: string; estimated_minutes: number; sections: Json; status?: Database["public"]["Enums"]["lesson_content_draft_status"]; provider: string; model?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: never; outline_lesson_id?: number; revision?: number; title?: string; summary?: string; estimated_minutes?: number; sections?: Json; status?: Database["public"]["Enums"]["lesson_content_draft_status"]; provider?: string; model?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      lesson_content_draft_citations: {
        Row: { id: number; lesson_content_draft_id: number; section_index: number; document_chunk_id: number; quote: string }
        Insert: { id?: never; lesson_content_draft_id: number; section_index: number; document_chunk_id: number; quote: string }
        Update: { id?: never; lesson_content_draft_id?: number; section_index?: number; document_chunk_id?: number; quote?: string }
        Relationships: []
      }
      course_import_reviews: {
        Row: { id: number; job_id: number; reviewer_id: string; outline_revision: number; decision: string; comment: string | null; reviewed_at: string }
        Insert: { id?: never; job_id: number; reviewer_id: string; outline_revision: number; decision: string; comment?: string | null; reviewed_at?: string }
        Update: { id?: never; job_id?: number; reviewer_id?: string; outline_revision?: number; decision?: string; comment?: string | null; reviewed_at?: string }
        Relationships: []
      }
      course_import_publications: {
        Row: { id: number; job_id: number; course_id: number; chapter_id: number; outline_revision: number; published_by: string; published_at: string }
        Insert: { id?: never; job_id: number; course_id: number; chapter_id: number; outline_revision: number; published_by: string; published_at?: string }
        Update: { id?: never; job_id?: number; course_id?: number; chapter_id?: number; outline_revision?: number; published_by?: string; published_at?: string }
        Relationships: []
      }
      course_import_lesson_publications: {
        Row: { publication_id: number; outline_lesson_id: number; lesson_content_draft_id: number; lesson_id: number }
        Insert: { publication_id: number; outline_lesson_id: number; lesson_content_draft_id: number; lesson_id: number }
        Update: { publication_id?: number; outline_lesson_id?: number; lesson_content_draft_id?: number; lesson_id?: number }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: number
          metadata: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: never
          metadata?: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_explanations: {
        Row: {
          created_at: string
          error_code: string | null
          id: number
          model: string | null
          provider: string
          response: string | null
          status: Database["public"]["Enums"]["ai_response_status"]
          submission_id: number
          user_question: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: number
          model?: string | null
          provider: string
          response?: string | null
          status: Database["public"]["Enums"]["ai_response_status"]
          submission_id: number
          user_question?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: number
          model?: string | null
          provider?: string
          response?: string | null
          status?: Database["public"]["Enums"]["ai_response_status"]
          submission_id?: number
          user_question?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_explanations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_order: number
          course_id: number
          created_at: string
          description: string | null
          id: number
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          chapter_order: number
          course_id: number
          created_at?: string
          description?: string | null
          id?: number
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          chapter_order?: number
          course_id?: number
          created_at?: string
          description?: string | null
          id?: number
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: number
          enrolled_at: string
          id: number
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: number
          enrolled_at?: string
          id?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: number
          enrolled_at?: string
          id?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: number
          is_published: boolean
          language: string
          level: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_published?: boolean
          language?: string
          level?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_published?: boolean
          language?: string
          level?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          end_offset: number
          id: number
          source_document_id: number
          start_offset: number
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash: string
          created_at?: string
          end_offset: number
          id?: never
          source_document_id: number
          start_offset: number
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          end_offset?: number
          id?: never
          source_document_id?: number
          start_offset?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_options: {
        Row: {
          content: string
          created_at: string
          exercise_id: number
          id: number
          metadata: Json
          option_order: number
        }
        Insert: {
          content: string
          created_at?: string
          exercise_id: number
          id?: number
          metadata?: Json
          option_order: number
        }
        Update: {
          content?: string
          created_at?: string
          exercise_id?: number
          id?: number
          metadata?: Json
          option_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_options_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_reviews: {
        Row: {
          comment: string | null
          edited_snapshot: Json | null
          generated_exercise_id: number
          id: number
          reviewed_at: string
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          comment?: string | null
          edited_snapshot?: Json | null
          generated_exercise_id: number
          id?: never
          reviewed_at?: string
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          comment?: string | null
          edited_snapshot?: Json | null
          generated_exercise_id?: number
          id?: never
          reviewed_at?: string
          reviewer_id?: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "exercise_reviews_generated_exercise_id_fkey"
            columns: ["generated_exercise_id"]
            isOneToOne: false
            referencedRelation: "generated_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_solutions: {
        Row: {
          created_at: string
          exercise_id: number
          solution: Json
          static_explanation: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: number
          solution: Json
          static_explanation?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: number
          solution?: Json
          static_explanation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_solutions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: true
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          code_snippet: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          exercise_order: number
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id: number
          is_published: boolean
          is_required: boolean
          lesson_id: number
          source: Database["public"]["Enums"]["exercise_source"]
          title: string
          updated_at: string
        }
        Insert: {
          code_snippet?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          exercise_order: number
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id?: number
          is_published?: boolean
          is_required?: boolean
          lesson_id: number
          source?: Database["public"]["Enums"]["exercise_source"]
          title: string
          updated_at?: string
        }
        Update: {
          code_snippet?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          exercise_order?: number
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          id?: number
          is_published?: boolean
          is_required?: boolean
          lesson_id?: number
          source?: Database["public"]["Enums"]["exercise_source"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_exercises: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id: number
          lesson_id: number
          model: string | null
          provider: string
          published_at: string | null
          published_exercise_id: number | null
          requested_by: string | null
          status: Database["public"]["Enums"]["generated_exercise_status"]
          title: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          description?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id?: never
          lesson_id: number
          model?: string | null
          provider: string
          published_at?: string | null
          published_exercise_id?: number | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["generated_exercise_status"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          id?: never
          lesson_id?: number
          model?: string | null
          provider?: string
          published_at?: string | null
          published_exercise_id?: number | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["generated_exercise_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_exercises_published_exercise_id_fkey"
            columns: ["published_exercise_id"]
            isOneToOne: true
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_exercises_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_draft_citations: {
        Row: {
          created_at: string
          document_chunk_id: number
          id: number
          lesson_draft_id: number
          quote: string
          revision: number
          section_index: number
        }
        Insert: {
          created_at?: string
          document_chunk_id: number
          id?: never
          lesson_draft_id: number
          quote: string
          revision: number
          section_index: number
        }
        Update: {
          created_at?: string
          document_chunk_id?: number
          id?: never
          lesson_draft_id?: number
          quote?: string
          revision?: number
          section_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_draft_citations_document_chunk_id_fkey"
            columns: ["document_chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_draft_citations_lesson_draft_id_fkey"
            columns: ["lesson_draft_id"]
            isOneToOne: false
            referencedRelation: "lesson_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_draft_publications: {
        Row: {
          course_id: number
          id: number
          lesson_draft_id: number
          lesson_id: number
          published_at: string
          published_by: string
          published_revision: number
          source_document_id: number
        }
        Insert: {
          course_id: number
          id?: never
          lesson_draft_id: number
          lesson_id: number
          published_at?: string
          published_by: string
          published_revision: number
          source_document_id: number
        }
        Update: {
          course_id?: number
          id?: never
          lesson_draft_id?: number
          lesson_id?: number
          published_at?: string
          published_by?: string
          published_revision?: number
          source_document_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_draft_publications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_draft_publications_lesson_draft_id_fkey"
            columns: ["lesson_draft_id"]
            isOneToOne: true
            referencedRelation: "lesson_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_draft_publications_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_draft_publications_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_draft_publications_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_draft_reviews: {
        Row: {
          comment: string | null
          decision: Database["public"]["Enums"]["lesson_draft_review_decision"]
          id: number
          lesson_draft_id: number
          reviewed_at: string
          reviewer_id: string
          revision: number
        }
        Insert: {
          comment?: string | null
          decision: Database["public"]["Enums"]["lesson_draft_review_decision"]
          id?: never
          lesson_draft_id: number
          reviewed_at?: string
          reviewer_id: string
          revision: number
        }
        Update: {
          comment?: string | null
          decision?: Database["public"]["Enums"]["lesson_draft_review_decision"]
          id?: never
          lesson_draft_id?: number
          reviewed_at?: string
          reviewer_id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_draft_reviews_lesson_draft_id_fkey"
            columns: ["lesson_draft_id"]
            isOneToOne: false
            referencedRelation: "lesson_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_draft_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_drafts: {
        Row: {
          approved_revision: number | null
          chapter_id: number
          course_id: number
          created_at: string
          estimated_minutes: number
          id: number
          model: string | null
          provider: string
          published_at: string | null
          requested_by: string
          revision: number
          sections: Json
          source_document_id: number
          status: Database["public"]["Enums"]["lesson_draft_status"]
          summary: string
          target_lesson_id: number
          title: string
          updated_at: string
        }
        Insert: {
          approved_revision?: number | null
          chapter_id: number
          course_id: number
          created_at?: string
          estimated_minutes: number
          id?: never
          model?: string | null
          provider: string
          published_at?: string | null
          requested_by: string
          revision?: number
          sections: Json
          source_document_id: number
          status?: Database["public"]["Enums"]["lesson_draft_status"]
          summary: string
          target_lesson_id: number
          title: string
          updated_at?: string
        }
        Update: {
          approved_revision?: number | null
          chapter_id?: number
          course_id?: number
          created_at?: string
          estimated_minutes?: number
          id?: never
          model?: string | null
          provider?: string
          published_at?: string | null
          requested_by?: string
          revision?: number
          sections?: Json
          source_document_id?: number
          status?: Database["public"]["Enums"]["lesson_draft_status"]
          summary?: string
          target_lesson_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_drafts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_drafts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_drafts_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_drafts_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_drafts_target_lesson_id_fkey"
            columns: ["target_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: number
          content: string | null
          created_at: string
          estimated_minutes: number | null
          id: number
          is_published: boolean
          lesson_order: number
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id: number
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: number
          is_published?: boolean
          lesson_order: number
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: number
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: number
          is_published?: boolean
          lesson_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      source_document_metadata: {
        Row: { source_document_id: number; source_type: string; ingestion_method: string; source_url: string | null; canonical_url: string | null; title: string; domain: string | null; authority_score: number | null; discovered_from_source_document_id: number | null; fetched_at: string | null; created_at: string }
        Insert: { source_document_id: number; source_type: string; ingestion_method: string; source_url?: string | null; canonical_url?: string | null; title: string; domain?: string | null; authority_score?: number | null; discovered_from_source_document_id?: number | null; fetched_at?: string | null; created_at?: string }
        Update: { source_document_id?: number; source_type?: string; ingestion_method?: string; source_url?: string | null; canonical_url?: string | null; title?: string; domain?: string | null; authority_score?: number | null; discovered_from_source_document_id?: number | null; fetched_at?: string | null; created_at?: string }
        Relationships: []
      }
      source_documents: {
        Row: {
          created_at: string
          error_code: string | null
          extracted_char_count: number | null
          id: number
          initialize_import_job: boolean
          mime_type: string
          original_filename: string
          sha256: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["source_document_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          extracted_char_count?: number | null
          id?: never
          initialize_import_job?: boolean
          mime_type: string
          original_filename: string
          sha256?: string | null
          size_bytes: number
          status?: Database["public"]["Enums"]["source_document_status"]
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          extracted_char_count?: number | null
          id?: never
          initialize_import_job?: boolean
          mime_type?: string
          original_filename?: string
          sha256?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["source_document_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          answer: Json
          attempt_number: number
          exercise_id: number
          id: number
          is_correct: boolean
          score: number | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          answer: Json
          attempt_number: number
          exercise_id: number
          id?: number
          is_correct: boolean
          score?: number | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          answer?: Json
          attempt_number?: number
          exercise_id?: number
          id?: number
          is_correct?: boolean
          score?: number | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: number
          last_accessed_at: string | null
          lesson_id: number
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: number
          last_accessed_at?: string | null
          lesson_id: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: number
          last_accessed_at?: string | null
          lesson_id?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_archive_course: {
        Args: { p_course_id: number }
        Returns: Json
      }
      create_course_lesson_drafts: {
        Args: {
          p_course_description: string
          p_course_slug: string
          p_course_title: string
          p_lessons: Json
          p_model: string
          p_provider: string
          p_source_document_id: number
        }
        Returns: Json
      }
      create_course_outline: {
        Args: { p_source_document_id: number; p_outline: Json; p_provider: string; p_model: string | null }
        Returns: Json
      }
      create_course_outline_for_job: {
        Args: { p_job_id: number; p_outline: Json; p_provider: string; p_model: string | null }
        Returns: Json
      }
      materialize_course_import_source: {
        Args: { p_original_filename: string; p_storage_path: string; p_mime_type: string; p_size_bytes: number; p_source_type: string; p_ingestion_method: string; p_source_url?: string | null; p_canonical_url?: string | null; p_title?: string | null; p_domain?: string | null; p_authority_score?: number | null; p_discovered_from_source_document_id?: number | null; p_fetched_at?: string | null }
        Returns: Json
      }
      initialize_course_import_from_sources: {
        Args: { p_initialization_key: string; p_sources: Json }
        Returns: Json
      }
      attach_course_import_source: {
        Args: { p_job_id: number; p_source_document_id: number; p_relevance_score?: number | null }
        Returns: Json
      }
      detach_course_import_source: {
        Args: { p_job_id: number; p_source_document_id: number }
        Returns: Json
      }
      remove_staged_course_import_source: {
        Args: { p_source_document_id: number }
        Returns: Json
      }
      prepare_course_lesson_generation: { Args: { p_job_id: number }; Returns: Json }
      persist_lesson_content_draft: {
        Args: { p_job_id: number; p_outline_lesson_id: number; p_title: string; p_summary: string; p_estimated_minutes: number; p_sections: Json; p_provider: string; p_model: string }
        Returns: Json
      }
      persist_lesson_content_draft_for_job: {
        Args: { p_job_id: number; p_outline_lesson_id: number; p_title: string; p_summary: string; p_estimated_minutes: number; p_sections: Json; p_citations: Json; p_provider: string; p_model: string }
        Returns: Json
      }
      fail_course_import_job: { Args: { p_job_id: number; p_error_code: string }; Returns: undefined }
      revise_lesson_content_draft: {
        Args: { p_lesson_content_draft_id: number; p_title: string; p_summary: string; p_estimated_minutes: number; p_sections: Json }
        Returns: Json
      }
      review_course_import_job: { Args: { p_job_id: number; p_decision: string; p_comment?: string }; Returns: Json }
      remove_course_import_from_queue: { Args: { p_job_id: number }; Returns: Json }
      publish_course_import_job: { Args: { p_job_id: number; p_course_slug: string }; Returns: Json }
      create_content_curriculum: {
        Args: {
          p_chapter_title: string
          p_course_slug: string
          p_course_title: string
        }
        Returns: Json
      }
      create_content_target_in_course: {
        Args: { p_chapter_title: string; p_course_id: number }
        Returns: Json
      }
      create_generated_exercise_draft: {
        Args: {
          p_content: Json
          p_difficulty: Database["public"]["Enums"]["difficulty_level"]
          p_exercise_type: Database["public"]["Enums"]["exercise_type"]
          p_lesson_id: number
          p_model?: string | null
          p_provider: string
        }
        Returns: Json
      }
      create_lesson_content_target: {
        Args: { p_chapter_id: number; p_title: string }
        Returns: Json
      }
      admin_change_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: Json
      }
      admin_change_user_status: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: Json
      }
      consume_rate_limit: {
        Args: {
          p_identifier_hash: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      create_lesson_draft: {
        Args: {
          p_chapter_id: number
          p_citations: Json
          p_course_id: number
          p_estimated_minutes: number
          p_model: string
          p_provider: string
          p_sections: Json
          p_source_document_id: number
          p_summary: string
          p_target_lesson_id: number
          p_title: string
        }
        Returns: number
      }
      enroll_course: { Args: { p_course_id: number }; Returns: Json }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      get_lesson_exercise_generation_context: {
        Args: { p_lesson_id: number }
        Returns: Json
      }
      publish_generated_exercise: {
        Args: { p_generated_exercise_id: number }
        Returns: Json
      }
      publish_lesson_draft: {
        Args: { p_lesson_draft_id: number }
        Returns: Json
      }
      replace_document_chunks: {
        Args: {
          p_chunks: Json
          p_extracted_char_count: number
          p_sha256: string
          p_source_document_id: number
        }
        Returns: number
      }
      review_lesson_draft: {
        Args: {
          p_comment?: string
          p_decision: Database["public"]["Enums"]["lesson_draft_review_decision"]
          p_lesson_draft_id: number
        }
        Returns: Database["public"]["Enums"]["lesson_draft_status"]
      }
      review_generated_exercise_draft: {
        Args: {
          p_comment?: string | null
          p_decision: Database["public"]["Enums"]["review_status"]
          p_edited_draft?: Json | null
          p_generated_exercise_id: number
        }
        Returns: Json
      }
      review_course_draft_batch: {
        Args: {
          p_comment?: string
          p_decision: Database["public"]["Enums"]["lesson_draft_review_decision"]
          p_source_document_id: number
        }
        Returns: Json
      }
      revise_lesson_draft: {
        Args: {
          p_estimated_minutes: number
          p_lesson_draft_id: number
          p_sections: Json
          p_summary: string
          p_title: string
        }
        Returns: number
      }
      submit_exercise: {
        Args: { p_answer: Json; p_exercise_id: number }
        Returns: Json
      }
      start_lesson: { Args: { p_lesson_id: number }; Returns: Json }
    }
    Enums: {
      ai_response_status: "success" | "failed"
      course_import_status:
        | "uploaded"
        | "processing"
        | "outline_review"
        | "generating_content"
        | "content_review"
        | "ready_to_publish"
        | "published"
        | "failed"
        | "rejected"
      difficulty_level: "easy" | "medium" | "hard"
      enrollment_status: "active" | "completed" | "cancelled"
      exercise_source: "manual" | "ai_generated"
      exercise_type:
        | "multiple_choice"
        | "true_false"
        | "short_answer"
        | "ordering"
        | "matching"
        | "scenario"
        | "fix_the_bug"
        | "predict_output"
      generated_exercise_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_revision"
        | "published"
      lesson_draft_review_decision: "approved" | "rejected" | "needs_revision"
      lesson_draft_status:
        | "pending_review"
        | "needs_revision"
        | "rejected"
        | "approved"
        | "published"
      lesson_content_draft_status: "ready" | "failed"
      progress_status: "locked" | "unlocked" | "in_progress" | "completed"
      review_status: "approved" | "rejected" | "needs_revision"
      source_document_status:
        | "uploaded"
        | "extracting"
        | "extracted"
        | "generating"
        | "ready_for_review"
        | "failed"
        | "archived"
      user_role: "learner" | "moderator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
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
    Enums: {
      ai_response_status: ["success", "failed"],
      difficulty_level: ["easy", "medium", "hard"],
      enrollment_status: ["active", "completed", "cancelled"],
      exercise_source: ["manual", "ai_generated"],
      exercise_type: [
        "fix_the_bug",
        "predict_output",
        "multiple_choice",
        "true_false",
        "short_answer",
        "ordering",
        "matching",
        "scenario",
      ],
      generated_exercise_status: [
        "pending",
        "approved",
        "rejected",
        "needs_revision",
        "published",
      ],
      lesson_draft_review_decision: ["approved", "rejected", "needs_revision"],
      lesson_draft_status: [
        "pending_review",
        "needs_revision",
        "rejected",
        "approved",
        "published",
      ],
      progress_status: ["locked", "unlocked", "in_progress", "completed"],
      review_status: ["approved", "rejected", "needs_revision"],
      source_document_status: [
        "uploaded",
        "extracting",
        "extracted",
        "generating",
        "ready_for_review",
        "failed",
        "archived",
      ],
      user_role: ["learner", "moderator", "admin"],
    },
  },
} as const
