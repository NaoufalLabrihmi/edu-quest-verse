export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          id: string
          points: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          points?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string
          access_code: string
          status: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description: string
          access_code: string
          status: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string
          access_code?: string
          status?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      questions: {
        Row: {
          id: string
          created_at: string
          quiz_id: string
          question_text: string
          question_type: string
          correct_answer: string
          options: string[]
          points: number
          time_limit: number
          point_multiplier: number
          order_number: number
        }
        Insert: {
          id?: string
          created_at?: string
          quiz_id: string
          question_text: string
          question_type: string
          correct_answer: string
          options: string[]
          points: number
          time_limit: number
          point_multiplier: number
          order_number: number
        }
        Update: {
          id?: string
          created_at?: string
          quiz_id?: string
          question_text?: string
          question_type?: string
          correct_answer?: string
          options?: string[]
          points?: number
          time_limit?: number
          point_multiplier?: number
          order_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          }
        ]
      }
      quiz_participants: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          status: string;
          joined_at: string;
          started_at: string | null;
          completed_at: string | null;
          score: number | null;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          status: string;
          joined_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          score?: number | null;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          quiz_id?: string;
          student_id?: string;
          status?: string;
          joined_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          score?: number | null;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "quiz_participants_quiz_id_fkey"
            columns: ["quiz_id"]
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_participants_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      quiz_state: {
        Row: {
          id: string;
          quiz_id: string;
          current_question_index: number;
          time_remaining: number;
          is_completed: boolean;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          current_question_index?: number;
          time_remaining?: number;
          is_completed?: boolean;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          current_question_index?: number;
          time_remaining?: number;
          is_completed?: boolean;
          last_updated?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_state_quiz_id_fkey";
            columns: ["quiz_id"];
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          }
        ];
      };
      participant_answers: {
        Row: {
          id: string;
          quiz_id: string;
          question_id: string;
          participant_id: string;
          answer: string;
          is_correct: boolean;
          points_earned: number;
          response_time: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_id: string;
          participant_id: string;
          answer: string;
          is_correct: boolean;
          points_earned: number;
          response_time: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question_id?: string;
          participant_id?: string;
          answer?: string;
          is_correct?: boolean;
          points_earned?: number;
          response_time?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "participant_answers_quiz_id_fkey";
            columns: ["quiz_id"];
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participant_answers_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participant_answers_participant_id_fkey";
            columns: ["participant_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      increment_score: {
        Args: {
          quiz_id: string;
          student_id: string;
          points_to_add: number;
        };
        Returns: void;
      }
    }
    Enums: {
      user_role: "admin" | "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "teacher", "student"],
    },
  },
} as const
