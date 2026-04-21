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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_dashboard_order: {
        Row: {
          created_at: string
          id: string
          section_order: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_order?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          section_order?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          id: string
          page_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_key?: string
          user_id?: string
        }
        Relationships: []
      }
      apidae_criteres: {
        Row: {
          created_at: string
          critere_id: number
          id: string
          last_synced_at: string | null
          libelle_fr: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          critere_id: number
          id?: string
          last_synced_at?: string | null
          libelle_fr?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          critere_id?: number
          id?: string
          last_synced_at?: string | null
          libelle_fr?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      apidae_sync_config: {
        Row: {
          created_at: string | null
          current_sync_batch: number | null
          current_sync_completed_at: string | null
          current_sync_offset: number | null
          current_sync_started_at: string | null
          current_sync_status: string | null
          current_sync_synced: number | null
          current_sync_total: number | null
          fiches_per_sync: number | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          last_sync_result: Json | null
          next_sync_at: string | null
          schedule_type: string | null
          selection_ids: number[] | null
          sync_hour: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_sync_batch?: number | null
          current_sync_completed_at?: string | null
          current_sync_offset?: number | null
          current_sync_started_at?: string | null
          current_sync_status?: string | null
          current_sync_synced?: number | null
          current_sync_total?: number | null
          fiches_per_sync?: number | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          last_sync_result?: Json | null
          next_sync_at?: string | null
          schedule_type?: string | null
          selection_ids?: number[] | null
          sync_hour?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_sync_batch?: number | null
          current_sync_completed_at?: string | null
          current_sync_offset?: number | null
          current_sync_started_at?: string | null
          current_sync_status?: string | null
          current_sync_synced?: number | null
          current_sync_total?: number | null
          fiches_per_sync?: number | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          last_sync_result?: Json | null
          next_sync_at?: string | null
          schedule_type?: string | null
          selection_ids?: number[] | null
          sync_hour?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      apidae_sync_history: {
        Row: {
          completed_at: string | null
          details: Json | null
          error_message: string | null
          fiches_created: number | null
          fiches_synced: number | null
          fiches_updated: number | null
          id: string
          started_at: string
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          fiches_created?: number | null
          fiches_synced?: number | null
          fiches_updated?: number | null
          id?: string
          started_at?: string
          status: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          fiches_created?: number | null
          fiches_synced?: number | null
          fiches_updated?: number | null
          id?: string
          started_at?: string
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      apidia_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      apidia_widgets: {
        Row: {
          created_at: string
          created_by: string
          filters: Json
          id: string
          is_active: boolean
          name: string
          selected_fiche_ids: string[] | null
          settings: Json
          share_token: string
          updated_at: string
          widget_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          filters?: Json
          id?: string
          is_active?: boolean
          name: string
          selected_fiche_ids?: string[] | null
          settings?: Json
          share_token?: string
          updated_at?: string
          widget_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          filters?: Json
          id?: string
          is_active?: boolean
          name?: string
          selected_fiche_ids?: string[] | null
          settings?: Json
          share_token?: string
          updated_at?: string
          widget_type?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          thread_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          thread_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          thread_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_plannings: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          share_token: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ereputation_google_ratings: {
        Row: {
          created_at: string | null
          current_rating: number | null
          establishment_name: string
          google_maps_url: string | null
          id: string
          last_updated_at: string | null
          total_reviews: number | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          current_rating?: number | null
          establishment_name: string
          google_maps_url?: string | null
          id?: string
          last_updated_at?: string | null
          total_reviews?: number | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          current_rating?: number | null
          establishment_name?: string
          google_maps_url?: string | null
          id?: string
          last_updated_at?: string | null
          total_reviews?: number | null
          updated_by?: string | null
        }
        Relationships: []
      }
      fiche_history: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_name: string
          actor_type: string
          changes: Json | null
          created_at: string
          fiche_id: string
          fiche_uuid: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_name: string
          actor_type: string
          changes?: Json | null
          created_at?: string
          fiche_id: string
          fiche_uuid?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_name?: string
          actor_type?: string
          changes?: Json | null
          created_at?: string
          fiche_id?: string
          fiche_uuid?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fiche_history_fiche_uuid_fkey"
            columns: ["fiche_uuid"]
            isOneToOne: false
            referencedRelation: "fiches_data"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_data: {
        Row: {
          created_at: string
          data: Json
          fiche_id: string
          fiche_type: string
          hidden_reason: string | null
          id: string
          is_published: boolean | null
          last_data_update_at: string | null
          last_verified_at: string | null
          source: string
          synced_to_sheets: boolean
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          fiche_id: string
          fiche_type: string
          hidden_reason?: string | null
          id?: string
          is_published?: boolean | null
          last_data_update_at?: string | null
          last_verified_at?: string | null
          source?: string
          synced_to_sheets?: boolean
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          fiche_id?: string
          fiche_type?: string
          hidden_reason?: string | null
          id?: string
          is_published?: boolean | null
          last_data_update_at?: string | null
          last_verified_at?: string | null
          source?: string
          synced_to_sheets?: boolean
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      fiches_verified: {
        Row: {
          created_at: string
          data: Json
          fiche_id: string
          fiche_type: string
          hidden_reason: string | null
          id: string
          is_published: boolean | null
          source: string
          synced_to_sheets: boolean
          updated_at: string
          verification_status: string | null
          verified_at: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          fiche_id: string
          fiche_type: string
          hidden_reason?: string | null
          id?: string
          is_published?: boolean | null
          source?: string
          synced_to_sheets?: boolean
          updated_at?: string
          verification_status?: string | null
          verified_at?: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          fiche_id?: string
          fiche_type?: string
          hidden_reason?: string | null
          id?: string
          is_published?: boolean | null
          source?: string
          synced_to_sheets?: boolean
          updated_at?: string
          verification_status?: string | null
          verified_at?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      linking_check_config: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_checked: number | null
          current_errors: number | null
          current_site_url: string | null
          current_status: string | null
          current_total: number | null
          id: string
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_checked?: number | null
          current_errors?: number | null
          current_site_url?: string | null
          current_status?: string | null
          current_total?: number | null
          id?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_checked?: number | null
          current_errors?: number | null
          current_site_url?: string | null
          current_status?: string | null
          current_total?: number | null
          id?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      linking_communes: {
        Row: {
          created_at: string
          id: string
          nom: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      linking_sites: {
        Row: {
          commune_id: string
          contact_email: string | null
          contact_notes: string | null
          created_at: string
          date_contact: string | null
          date_dernier_controle: string | null
          date_mise_a_jour: string | null
          id: string
          last_scrape_result: Json | null
          last_scraped_at: string | null
          modifications: string | null
          reponse: string | null
          statut: string
          type_contenu: string | null
          updated_at: string
          url: string
        }
        Insert: {
          commune_id: string
          contact_email?: string | null
          contact_notes?: string | null
          created_at?: string
          date_contact?: string | null
          date_dernier_controle?: string | null
          date_mise_a_jour?: string | null
          id?: string
          last_scrape_result?: Json | null
          last_scraped_at?: string | null
          modifications?: string | null
          reponse?: string | null
          statut?: string
          type_contenu?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          commune_id?: string
          contact_email?: string | null
          contact_notes?: string | null
          created_at?: string
          date_contact?: string | null
          date_dernier_controle?: string | null
          date_mise_a_jour?: string | null
          id?: string
          last_scrape_result?: Json | null
          last_scraped_at?: string | null
          modifications?: string | null
          reponse?: string | null
          statut?: string
          type_contenu?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "linking_sites_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "linking_communes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          must_change_password: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          must_change_password?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          must_change_password?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      santons_benevoles: {
        Row: {
          civilite: string | null
          created_at: string
          edition_id: string
          email: string | null
          id: string
          nom: string
          prenom: string | null
          souhaite_etre_avec: string | null
          stand_souhaite: string | null
          telephone: string | null
          ville: string | null
        }
        Insert: {
          civilite?: string | null
          created_at?: string
          edition_id: string
          email?: string | null
          id?: string
          nom: string
          prenom?: string | null
          souhaite_etre_avec?: string | null
          stand_souhaite?: string | null
          telephone?: string | null
          ville?: string | null
        }
        Update: {
          civilite?: string | null
          created_at?: string
          edition_id?: string
          email?: string | null
          id?: string
          nom?: string
          prenom?: string | null
          souhaite_etre_avec?: string | null
          stand_souhaite?: string | null
          telephone?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "santons_benevoles_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "santons_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      santons_disponibilites: {
        Row: {
          benevole_id: string
          created_at: string
          disponible: boolean
          id: string
          jour: string
        }
        Insert: {
          benevole_id: string
          created_at?: string
          disponible?: boolean
          id?: string
          jour: string
        }
        Update: {
          benevole_id?: string
          created_at?: string
          disponible?: boolean
          id?: string
          jour?: string
        }
        Relationships: [
          {
            foreignKeyName: "santons_disponibilites_benevole_id_fkey"
            columns: ["benevole_id"]
            isOneToOne: false
            referencedRelation: "santons_benevoles"
            referencedColumns: ["id"]
          },
        ]
      }
      santons_editions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          title: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          title: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          title?: string
          year?: number
        }
        Relationships: []
      }
      santons_planning: {
        Row: {
          benevole_id: string
          created_at: string
          edition_id: string
          id: string
          jour: string
          santonnier_id: string
        }
        Insert: {
          benevole_id: string
          created_at?: string
          edition_id: string
          id?: string
          jour: string
          santonnier_id: string
        }
        Update: {
          benevole_id?: string
          created_at?: string
          edition_id?: string
          id?: string
          jour?: string
          santonnier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "santons_planning_benevole_id_fkey"
            columns: ["benevole_id"]
            isOneToOne: false
            referencedRelation: "santons_benevoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "santons_planning_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "santons_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "santons_planning_santonnier_id_fkey"
            columns: ["santonnier_id"]
            isOneToOne: false
            referencedRelation: "santons_santonniers"
            referencedColumns: ["id"]
          },
        ]
      }
      santons_preferences: {
        Row: {
          benevole_non_souhaite: string | null
          benevole_souhaite: string | null
          created_at: string
          id: string
          santonnier_id: string
        }
        Insert: {
          benevole_non_souhaite?: string | null
          benevole_souhaite?: string | null
          created_at?: string
          id?: string
          santonnier_id: string
        }
        Update: {
          benevole_non_souhaite?: string | null
          benevole_souhaite?: string | null
          created_at?: string
          id?: string
          santonnier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "santons_preferences_santonnier_id_fkey"
            columns: ["santonnier_id"]
            isOneToOne: false
            referencedRelation: "santons_santonniers"
            referencedColumns: ["id"]
          },
        ]
      }
      santons_santonniers: {
        Row: {
          created_at: string
          edition_id: string
          email: string | null
          id: string
          nom: string | null
          nom_stand: string
          prenom: string | null
          presence_info: string | null
          site_web: string | null
          telephone: string | null
          ville: string | null
        }
        Insert: {
          created_at?: string
          edition_id: string
          email?: string | null
          id?: string
          nom?: string | null
          nom_stand: string
          prenom?: string | null
          presence_info?: string | null
          site_web?: string | null
          telephone?: string | null
          ville?: string | null
        }
        Update: {
          created_at?: string
          edition_id?: string
          email?: string | null
          id?: string
          nom?: string | null
          nom_stand?: string
          prenom?: string | null
          presence_info?: string | null
          site_web?: string | null
          telephone?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "santons_santonniers_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "santons_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_email: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_email?: string | null
          author_name: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_email?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_seen: {
        Row: {
          id: string
          seen_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          seen_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          id?: string
          seen_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_seen_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          planning_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          validation_comment: string | null
          validation_requested_at: string | null
          validation_responded_at: string | null
          validation_status: string | null
          validation_target: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          planning_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          validation_comment?: string | null
          validation_requested_at?: string | null
          validation_responded_at?: string | null
          validation_status?: string | null
          validation_target?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          planning_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          validation_comment?: string | null
          validation_requested_at?: string | null
          validation_responded_at?: string | null
          validation_status?: string | null
          validation_target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "editorial_plannings"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          direction: string
          id: string
          raw_update: Json | null
          sender_name: string | null
          text: string | null
          update_id: number | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          direction?: string
          id?: string
          raw_update?: Json | null
          sender_name?: string | null
          text?: string | null
          update_id?: number | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          direction?: string
          id?: string
          raw_update?: Json | null
          sender_name?: string | null
          text?: string | null
          update_id?: number | null
        }
        Relationships: []
      }
      user_action_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
          user_id_sheet: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
          user_id_sheet?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
          user_id_sheet?: string | null
        }
        Relationships: []
      }
      user_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          fiche_id: string
          id: string
          original_data: Json | null
          processed_at: string | null
          processed_by: string | null
          requested_changes: Json
          status: string
          user_email: string
          user_id_sheet: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          fiche_id: string
          id?: string
          original_data?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          requested_changes: Json
          status?: string
          user_email: string
          user_id_sheet?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          fiche_id?: string
          id?: string
          original_data?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          requested_changes?: Json
          status?: string
          user_email?: string
          user_id_sheet?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_alerts: {
        Row: {
          confidence_score: number | null
          created_at: string
          current_value: string | null
          fiche_id: string
          fiche_name: string | null
          fiche_type: string | null
          field_name: string
          found_value: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_name: string | null
          source_url: string
          status: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          current_value?: string | null
          fiche_id: string
          fiche_name?: string | null
          fiche_type?: string | null
          field_name: string
          found_value?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_name?: string | null
          source_url: string
          status?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          current_value?: string | null
          fiche_id?: string
          fiche_name?: string | null
          fiche_type?: string | null
          field_name?: string
          found_value?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_name?: string | null
          source_url?: string
          status?: string
        }
        Relationships: []
      }
      verification_config: {
        Row: {
          auto_push_to_apidae: boolean
          created_at: string
          current_run_completed_at: string | null
          current_run_current_fiche_id: string | null
          current_run_current_index: number | null
          current_run_errors: number | null
          current_run_id: string | null
          current_run_last_heartbeat_at: string | null
          current_run_started_at: string | null
          current_run_status: string | null
          current_run_total: number | null
          current_run_verified: number | null
          days_between_verification: number
          days_consider_recent: number
          days_consider_recent_import: number
          exclude_recently_imported: boolean
          exclude_recently_modified: boolean
          fiches_per_run: number
          id: string
          is_enabled: boolean
          last_run_at: string | null
          next_run_at: string | null
          schedule_type: string
          updated_at: string
        }
        Insert: {
          auto_push_to_apidae?: boolean
          created_at?: string
          current_run_completed_at?: string | null
          current_run_current_fiche_id?: string | null
          current_run_current_index?: number | null
          current_run_errors?: number | null
          current_run_id?: string | null
          current_run_last_heartbeat_at?: string | null
          current_run_started_at?: string | null
          current_run_status?: string | null
          current_run_total?: number | null
          current_run_verified?: number | null
          days_between_verification?: number
          days_consider_recent?: number
          days_consider_recent_import?: number
          exclude_recently_imported?: boolean
          exclude_recently_modified?: boolean
          fiches_per_run?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_type?: string
          updated_at?: string
        }
        Update: {
          auto_push_to_apidae?: boolean
          created_at?: string
          current_run_completed_at?: string | null
          current_run_current_fiche_id?: string | null
          current_run_current_index?: number | null
          current_run_errors?: number | null
          current_run_id?: string | null
          current_run_last_heartbeat_at?: string | null
          current_run_started_at?: string | null
          current_run_status?: string | null
          current_run_total?: number | null
          current_run_verified?: number | null
          days_between_verification?: number
          days_consider_recent?: number
          days_consider_recent_import?: number
          exclude_recently_imported?: boolean
          exclude_recently_modified?: boolean
          fiches_per_run?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_page_permission: {
        Args: { _page_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_fiches_apidae:
        | {
            Args: {
              p_commune?: string
              p_fiche_type?: string
              p_is_published?: boolean
              p_limit?: number
              p_search_term?: string
              p_source?: string
            }
            Returns: {
              code_postal: string
              commune: string
              description_courte: string
              description_detaillee: string
              fiche_id: string
              fiche_type: string
              is_published: boolean
              nom: string
              source: string
            }[]
          }
        | {
            Args: {
              p_commune?: string
              p_date_active?: string
              p_fiche_type?: string
              p_is_published?: boolean
              p_limit?: number
              p_search_term?: string
              p_source?: string
            }
            Returns: {
              code_postal: string
              commune: string
              description_courte: string
              description_detaillee: string
              fiche_id: string
              fiche_type: string
              is_published: boolean
              nom: string
              source: string
            }[]
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
