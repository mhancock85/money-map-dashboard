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
      category_mappings: {
        Row: {
          category: string
          confidence_score: number | null
          created_at: string
          id: string
          merchant_pattern: string
        }
        Insert: {
          category: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          merchant_pattern: string
        }
        Update: {
          category?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          merchant_pattern?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      statements: {
        Row: {
          client_id: string
          coach_notes: string | null
          created_at: string
          filename: string
          id: string
          status: string | null
          storage_path: string
        }
        Insert: {
          client_id: string
          coach_notes?: string | null
          created_at?: string
          filename: string
          id?: string
          status?: string | null
          storage_path: string
        }
        Update: {
          client_id?: string
          coach_notes?: string | null
          created_at?: string
          filename?: string
          id?: string
          status?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "statements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          client_feedback: string | null
          client_id: string
          coach_intelligence: string | null
          confidence_score: number | null
          created_at: string
          description: string
          id: string
          is_reviewed: boolean | null
          needs_homework: boolean | null
          statement_id: string
          transaction_date: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_feedback?: string | null
          client_id: string
          coach_intelligence?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          id?: string
          is_reviewed?: boolean | null
          needs_homework?: boolean | null
          statement_id: string
          transaction_date: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_feedback?: string | null
          client_id?: string
          coach_intelligence?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          id?: string
          is_reviewed?: boolean | null
          needs_homework?: boolean | null
          statement_id?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
