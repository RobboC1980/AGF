export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      epics: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          project_id: string;
          color: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          project_id: string;
          color?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          project_id?: string;
          color?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          acceptance_criteria: string | null;
          story_points: number | null;
          priority: string;
          status: string;
          epic_id: string;
          assignee_id: string | null;
          tags: string[] | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          acceptance_criteria?: string | null;
          story_points?: number | null;
          priority?: string;
          status?: string;
          epic_id: string;
          assignee_id?: string | null;
          tags?: string[] | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          acceptance_criteria?: string | null;
          story_points?: number | null;
          priority?: string;
          status?: string;
          epic_id?: string;
          assignee_id?: string | null;
          tags?: string[] | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sprints: {
        Row: {
          id: string;
          name: string;
          project_id: string;
          start_date: string | null;
          end_date: string | null;
          goal: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          project_id: string;
          start_date?: string | null;
          end_date?: string | null;
          goal?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          project_id?: string;
          start_date?: string | null;
          end_date?: string | null;
          goal?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          story_id: string;
          assignee_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          story_id: string;
          assignee_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          story_id?: string;
          assignee_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_completions: {
        Row: {
          id: string;
          user_id: string;
          prompt: string;
          completion: string;
          model: string;
          tokens_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt: string;
          completion: string;
          model: string;
          tokens_used: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt?: string;
          completion?: string;
          model?: string;
          tokens_used?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
} 