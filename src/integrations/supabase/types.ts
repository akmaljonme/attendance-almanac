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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          center_id: string
          created_at: string
          id: string
          marked_by: string | null
          session_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          marked_by?: string | null
          session_id: string
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          session_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_balances"
            referencedColumns: ["student_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          center_id: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          center_id: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          center_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      center_memberships: {
        Row: {
          center_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["center_role"]
          user_id: string
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["center_role"]
          user_id: string
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["center_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_memberships_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string | null
          center_type: string | null
          city: string | null
          contact_email: string | null
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          phone: string | null
          prorate_first_month: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          center_type?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          prorate_first_month?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          center_type?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          prorate_first_month?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_sessions: {
        Row: {
          center_id: string
          created_at: string
          created_by: string | null
          end_time: string | null
          group_id: string
          id: string
          room: string | null
          session_date: string
          start_time: string | null
          topic: string | null
        }
        Insert: {
          center_id: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          group_id: string
          id?: string
          room?: string | null
          session_date: string
          start_time?: string | null
          topic?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          group_id?: string
          id?: string
          room?: string | null
          session_date?: string
          start_time?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          center_id: string
          created_at: string
          default_fee: number
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          default_fee?: number
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          default_fee?: number
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          center_id: string
          created_at: string
          discount: number
          end_date: string | null
          group_id: string
          id: string
          monthly_fee: number
          start_date: string
          status: string
          student_id: string
        }
        Insert: {
          center_id: string
          created_at?: string
          discount?: number
          end_date?: string | null
          group_id: string
          id?: string
          monthly_fee: number
          start_date?: string
          status?: string
          student_id: string
        }
        Update: {
          center_id?: string
          created_at?: string
          discount?: number
          end_date?: string | null
          group_id?: string
          id?: string
          monthly_fee?: number
          start_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_balances"
            referencedColumns: ["student_id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          center_id: string
          created_at: string
          description: string | null
          id: string
          recorded_by: string | null
          reference: string | null
          spent_on: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          center_id: string
          created_at?: string
          description?: string | null
          id?: string
          recorded_by?: string | null
          reference?: string | null
          spent_on?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          center_id?: string
          created_at?: string
          description?: string | null
          id?: string
          recorded_by?: string | null
          reference?: string | null
          spent_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          amount: number
          center_id: string
          created_at: string
          created_by: string | null
          id: string
          reason: string
          student_id: string
        }
        Insert: {
          amount: number
          center_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          student_id: string
        }
        Update: {
          amount?: number
          center_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_balances"
            referencedColumns: ["student_id"]
          },
        ]
      }
      groups: {
        Row: {
          capacity: number
          center_id: string
          course_id: string
          created_at: string
          days: number[]
          end_date: string | null
          end_time: string | null
          id: string
          monthly_fee: number
          name: string
          room: string | null
          start_date: string
          start_time: string | null
          status: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          center_id: string
          course_id: string
          created_at?: string
          days?: number[]
          end_date?: string | null
          end_time?: string | null
          id?: string
          monthly_fee?: number
          name: string
          room?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          center_id?: string
          course_id?: string
          created_at?: string
          days?: number[]
          end_date?: string | null
          end_time?: string | null
          id?: string
          monthly_fee?: number
          name?: string
          room?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          center_id: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          center_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          center_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          center_id: string
          client_token: string | null
          created_at: string
          group_id: string | null
          id: string
          method: string
          notes: string | null
          paid_on: string
          period_month: string | null
          recorded_by: string | null
          reference: string | null
          student_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          center_id: string
          client_token?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          method: string
          notes?: string | null
          paid_on?: string
          period_month?: string | null
          recorded_by?: string | null
          reference?: string | null
          student_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          center_id?: string
          client_token?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          period_month?: string | null
          recorded_by?: string | null
          reference?: string | null
          student_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_balances"
            referencedColumns: ["student_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          center_id: string
          created_at: string
          enrolled_on: string
          full_name: string
          id: string
          notes: string | null
          parent_name: string | null
          parent_phone: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          enrolled_on?: string
          full_name: string
          id?: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          enrolled_on?: string
          full_name?: string
          id?: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          center_id: string
          created_at: string
          id: string
          plan: string
          status: string
          trial_ends_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          plan?: string
          status?: string
          trial_ends_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          plan?: string
          status?: string
          trial_ends_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: true
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          center_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          specialization: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          center_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_student_balances: {
        Row: {
          balance: number | null
          center_id: string | null
          first_period: string | null
          full_name: string | null
          last_paid_on: string | null
          phone: string | null
          status: string | null
          student_id: string | null
          total_adjust: number | null
          total_due: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tuition_obligations: {
        Row: {
          amount: number | null
          center_id: string | null
          enrollment_id: string | null
          group_id: string | null
          period_month: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_balances"
            referencedColumns: ["student_id"]
          },
        ]
      }
    }
    Functions: {
      create_center: {
        Args: {
          _city: string
          _name: string
          _phone: string
          _plan: string
          _prorate: boolean
          _type: string
        }
        Returns: string
      }
      has_center_role: {
        Args: {
          _center: string
          _roles: Database["public"]["Enums"]["center_role"][]
        }
        Returns: boolean
      }
      is_member: { Args: { _center: string }; Returns: boolean }
    }
    Enums: {
      center_role: "owner" | "admin" | "teacher" | "receptionist"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      center_role: ["owner", "admin", "teacher", "receptionist"],
    },
  },
} as const
