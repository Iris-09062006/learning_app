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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          id?: number
          metadata?: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: number
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
          id?: number
          reviewed_at?: string
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          comment?: string | null
          edited_snapshot?: Json | null
          generated_exercise_id?: number
          id?: number
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
          id?: number
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
          id?: number
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
      enroll_course: { Args: { p_course_id: number }; Returns: Json }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      publish_generated_exercise: {
        Args: { p_generated_exercise_id: number }
        Returns: Json
      }
      submit_exercise: {
        Args: { p_answer: Json; p_exercise_id: number }
        Returns: Json
      }
    }
    Enums: {
      ai_response_status: "success" | "failed"
      difficulty_level: "easy" | "medium" | "hard"
      enrollment_status: "active" | "completed" | "cancelled"
      exercise_source: "manual" | "ai_generated"
      exercise_type: "fix_the_bug" | "predict_output"
      generated_exercise_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_revision"
        | "published"
      progress_status: "locked" | "unlocked" | "in_progress" | "completed"
      review_status: "approved" | "rejected" | "needs_revision"
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
      exercise_type: ["fix_the_bug", "predict_output"],
      generated_exercise_status: [
        "pending",
        "approved",
        "rejected",
        "needs_revision",
        "published",
      ],
      progress_status: ["locked", "unlocked", "in_progress", "completed"],
      review_status: ["approved", "rejected", "needs_revision"],
      user_role: ["learner", "moderator", "admin"],
    },
  },
} as const
