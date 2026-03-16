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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_user_notes: {
        Row: {
          admin_id: string
          admin_name: string | null
          created_at: string
          id: string
          is_important: boolean | null
          note_content: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          admin_name?: string | null
          created_at?: string
          id?: string
          is_important?: boolean | null
          note_content: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          admin_name?: string | null
          created_at?: string
          id?: string
          is_important?: boolean | null
          note_content?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_charts_config: {
        Row: {
          chart_type: string | null
          col_span: number | null
          created_at: string
          custom_color: string | null
          custom_icon: string | null
          custom_title: string | null
          display_order: number
          id: string
          is_visible: boolean
          item_key: string
          item_type: string
          tab_key: string
          updated_at: string
        }
        Insert: {
          chart_type?: string | null
          col_span?: number | null
          created_at?: string
          custom_color?: string | null
          custom_icon?: string | null
          custom_title?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          item_key: string
          item_type?: string
          tab_key: string
          updated_at?: string
        }
        Update: {
          chart_type?: string | null
          col_span?: number | null
          created_at?: string
          custom_color?: string | null
          custom_icon?: string | null
          custom_title?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          item_key?: string
          item_type?: string
          tab_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_favorites: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_favorites_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_themes: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon_name: string
          id: string
          is_active: boolean
          name: string
          short_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name: string
          id?: string
          is_active?: boolean
          name: string
          short_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name?: string
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          summary: string
          tags: string[] | null
          theme_id: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          summary: string
          tags?: string[] | null
          theme_id: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          summary?: string
          tags?: string[] | null
          theme_id?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "article_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_name: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          admin_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          admin_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cadastral_boundary_conflicts: {
        Row: {
          conflict_coordinates: Json | null
          conflict_type: string
          conflicting_parcel_number: string
          created_at: string
          description: string
          evidence_urls: string[] | null
          id: string
          proposed_solution: string | null
          reported_by: string | null
          reporting_parcel_number: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conflict_coordinates?: Json | null
          conflict_type: string
          conflicting_parcel_number: string
          created_at?: string
          description: string
          evidence_urls?: string[] | null
          id?: string
          proposed_solution?: string | null
          reported_by?: string | null
          reporting_parcel_number: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conflict_coordinates?: Json | null
          conflict_type?: string
          conflicting_parcel_number?: string
          created_at?: string
          description?: string
          evidence_urls?: string[] | null
          id?: string
          proposed_solution?: string | null
          reported_by?: string | null
          reporting_parcel_number?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cadastral_boundary_history: {
        Row: {
          boundary_document_url: string | null
          boundary_purpose: string
          created_at: string
          id: string
          parcel_id: string
          pv_reference_number: string
          survey_date: string
          surveyor_name: string
          updated_at: string
        }
        Insert: {
          boundary_document_url?: string | null
          boundary_purpose: string
          created_at?: string
          id?: string
          parcel_id: string
          pv_reference_number: string
          survey_date?: string
          surveyor_name: string
          updated_at?: string
        }
        Update: {
          boundary_document_url?: string | null
          boundary_purpose?: string
          created_at?: string
          id?: string
          parcel_id?: string
          pv_reference_number?: string
          survey_date?: string
          surveyor_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_boundary_history_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_building_permits: {
        Row: {
          administrative_status: string
          created_at: string
          id: string
          is_current: boolean
          issue_date: string
          issuing_service: string
          issuing_service_contact: string | null
          parcel_id: string
          permit_document_url: string | null
          permit_number: string
          updated_at: string
          validity_period_months: number
        }
        Insert: {
          administrative_status?: string
          created_at?: string
          id?: string
          is_current?: boolean
          issue_date: string
          issuing_service: string
          issuing_service_contact?: string | null
          parcel_id: string
          permit_document_url?: string | null
          permit_number: string
          updated_at?: string
          validity_period_months?: number
        }
        Update: {
          administrative_status?: string
          created_at?: string
          id?: string
          is_current?: boolean
          issue_date?: string
          issuing_service?: string
          issuing_service_contact?: string | null
          parcel_id?: string
          permit_document_url?: string | null
          permit_number?: string
          updated_at?: string
          validity_period_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_building_permits_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_contribution_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cadastral_contributions: {
        Row: {
          appeal_data: Json | null
          appeal_status: string | null
          appeal_submission_date: string | null
          appeal_submitted: boolean | null
          area_sqm: number | null
          avenue: string | null
          boundary_history: Json | null
          building_permits: Json | null
          change_justification: string | null
          changed_fields: Json | null
          circonscription_fonciere: string | null
          collectivite: string | null
          commune: string | null
          construction_nature: string | null
          construction_type: string | null
          construction_year: number | null
          contribution_type: string
          created_at: string
          current_owner_legal_status: string | null
          current_owner_name: string | null
          current_owner_since: string | null
          current_owners_details: Json | null
          declared_usage: string | null
          fraud_reason: string | null
          fraud_score: number | null
          gps_coordinates: Json | null
          groupement: string | null
          id: string
          is_suspicious: boolean | null
          lease_type: string | null
          mortgage_history: Json | null
          original_parcel_id: string | null
          owner_document_url: string | null
          ownership_history: Json | null
          parcel_number: string
          parcel_sides: Json | null
          parcel_type: string | null
          permit_request_data: Json | null
          previous_permit_number: string | null
          property_title_document_url: string | null
          property_title_type: string | null
          province: string | null
          quartier: string | null
          rejected_by: string | null
          rejection_date: string | null
          rejection_reason: string | null
          rejection_reasons: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_history: Json | null
          territoire: string | null
          title_issue_date: string | null
          title_reference_number: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          village: string | null
          ville: string | null
          whatsapp_number: string | null
        }
        Insert: {
          appeal_data?: Json | null
          appeal_status?: string | null
          appeal_submission_date?: string | null
          appeal_submitted?: boolean | null
          area_sqm?: number | null
          avenue?: string | null
          boundary_history?: Json | null
          building_permits?: Json | null
          change_justification?: string | null
          changed_fields?: Json | null
          circonscription_fonciere?: string | null
          collectivite?: string | null
          commune?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          construction_year?: number | null
          contribution_type?: string
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name?: string | null
          current_owner_since?: string | null
          current_owners_details?: Json | null
          declared_usage?: string | null
          fraud_reason?: string | null
          fraud_score?: number | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          is_suspicious?: boolean | null
          lease_type?: string | null
          mortgage_history?: Json | null
          original_parcel_id?: string | null
          owner_document_url?: string | null
          ownership_history?: Json | null
          parcel_number: string
          parcel_sides?: Json | null
          parcel_type?: string | null
          permit_request_data?: Json | null
          previous_permit_number?: string | null
          property_title_document_url?: string | null
          property_title_type?: string | null
          province?: string | null
          quartier?: string | null
          rejected_by?: string | null
          rejection_date?: string | null
          rejection_reason?: string | null
          rejection_reasons?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_history?: Json | null
          territoire?: string | null
          title_issue_date?: string | null
          title_reference_number?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          village?: string | null
          ville?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          appeal_data?: Json | null
          appeal_status?: string | null
          appeal_submission_date?: string | null
          appeal_submitted?: boolean | null
          area_sqm?: number | null
          avenue?: string | null
          boundary_history?: Json | null
          building_permits?: Json | null
          change_justification?: string | null
          changed_fields?: Json | null
          circonscription_fonciere?: string | null
          collectivite?: string | null
          commune?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          construction_year?: number | null
          contribution_type?: string
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name?: string | null
          current_owner_since?: string | null
          current_owners_details?: Json | null
          declared_usage?: string | null
          fraud_reason?: string | null
          fraud_score?: number | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          is_suspicious?: boolean | null
          lease_type?: string | null
          mortgage_history?: Json | null
          original_parcel_id?: string | null
          owner_document_url?: string | null
          ownership_history?: Json | null
          parcel_number?: string
          parcel_sides?: Json | null
          parcel_type?: string | null
          permit_request_data?: Json | null
          previous_permit_number?: string | null
          property_title_document_url?: string | null
          property_title_type?: string | null
          province?: string | null
          quartier?: string | null
          rejected_by?: string | null
          rejection_date?: string | null
          rejection_reason?: string | null
          rejection_reasons?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_history?: Json | null
          territoire?: string | null
          title_issue_date?: string | null
          title_reference_number?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          village?: string | null
          ville?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_contributions_original_parcel_id_fkey"
            columns: ["original_parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_contributor_codes: {
        Row: {
          code: string
          contribution_id: string
          created_at: string
          expires_at: string
          id: string
          invalidated_at: string | null
          invalidation_reason: string | null
          invoice_id: string | null
          is_used: boolean
          is_valid: boolean | null
          parcel_number: string
          used_at: string | null
          user_id: string
          value_usd: number
        }
        Insert: {
          code: string
          contribution_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          invoice_id?: string | null
          is_used?: boolean
          is_valid?: boolean | null
          parcel_number: string
          used_at?: string | null
          user_id: string
          value_usd?: number
        }
        Update: {
          code?: string
          contribution_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          invoice_id?: string | null
          is_used?: boolean
          is_valid?: boolean | null
          parcel_number?: string
          used_at?: string | null
          user_id?: string
          value_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_contributor_codes_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "cadastral_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadastral_contributor_codes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cadastral_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_invoices: {
        Row: {
          client_email: string
          client_name: string | null
          client_organization: string | null
          created_at: string
          discount_amount_usd: number | null
          discount_code_used: string | null
          geographical_zone: string | null
          id: string
          invoice_number: string
          original_amount_usd: number | null
          parcel_number: string
          payment_id: string | null
          payment_method: string | null
          search_date: string
          selected_services: Json
          status: string
          total_amount_usd: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_email: string
          client_name?: string | null
          client_organization?: string | null
          created_at?: string
          discount_amount_usd?: number | null
          discount_code_used?: string | null
          geographical_zone?: string | null
          id?: string
          invoice_number: string
          original_amount_usd?: number | null
          parcel_number: string
          payment_id?: string | null
          payment_method?: string | null
          search_date?: string
          selected_services: Json
          status?: string
          total_amount_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_email?: string
          client_name?: string | null
          client_organization?: string | null
          created_at?: string
          discount_amount_usd?: number | null
          discount_code_used?: string | null
          geographical_zone?: string | null
          id?: string
          invoice_number?: string
          original_amount_usd?: number | null
          parcel_number?: string
          payment_id?: string | null
          payment_method?: string | null
          search_date?: string
          selected_services?: Json
          status?: string
          total_amount_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_land_disputes: {
        Row: {
          created_at: string
          current_status: string
          declarant_email: string | null
          declarant_id_number: string | null
          declarant_name: string
          declarant_phone: string | null
          declarant_quality: string
          dispute_description: string | null
          dispute_nature: string
          dispute_start_date: string | null
          dispute_type: string
          id: string
          lifting_documents: Json | null
          lifting_reason: string | null
          lifting_request_reference: string | null
          lifting_status: string | null
          parcel_id: string | null
          parcel_number: string
          parties_involved: Json | null
          reference_number: string
          reported_by: string | null
          resolution_details: string | null
          resolution_level: string | null
          supporting_documents: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_status?: string
          declarant_email?: string | null
          declarant_id_number?: string | null
          declarant_name: string
          declarant_phone?: string | null
          declarant_quality?: string
          dispute_description?: string | null
          dispute_nature: string
          dispute_start_date?: string | null
          dispute_type: string
          id?: string
          lifting_documents?: Json | null
          lifting_reason?: string | null
          lifting_request_reference?: string | null
          lifting_status?: string | null
          parcel_id?: string | null
          parcel_number: string
          parties_involved?: Json | null
          reference_number: string
          reported_by?: string | null
          resolution_details?: string | null
          resolution_level?: string | null
          supporting_documents?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_status?: string
          declarant_email?: string | null
          declarant_id_number?: string | null
          declarant_name?: string
          declarant_phone?: string | null
          declarant_quality?: string
          dispute_description?: string | null
          dispute_nature?: string
          dispute_start_date?: string | null
          dispute_type?: string
          id?: string
          lifting_documents?: Json | null
          lifting_reason?: string | null
          lifting_request_reference?: string | null
          lifting_status?: string | null
          parcel_id?: string | null
          parcel_number?: string
          parties_involved?: Json | null
          reference_number?: string
          reported_by?: string | null
          resolution_details?: string | null
          resolution_level?: string | null
          supporting_documents?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_land_disputes_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_mortgage_payments: {
        Row: {
          created_at: string
          id: string
          mortgage_id: string
          payment_amount_usd: number
          payment_date: string
          payment_receipt_url: string | null
          payment_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          mortgage_id: string
          payment_amount_usd?: number
          payment_date?: string
          payment_receipt_url?: string | null
          payment_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          mortgage_id?: string
          payment_amount_usd?: number
          payment_date?: string
          payment_receipt_url?: string | null
          payment_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cadastral_mortgage_payments_mortgage"
            columns: ["mortgage_id"]
            isOneToOne: false
            referencedRelation: "cadastral_mortgages"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_mortgages: {
        Row: {
          contract_date: string
          created_at: string
          creditor_name: string
          creditor_type: string
          duration_months: number
          id: string
          mortgage_amount_usd: number
          mortgage_status: string
          parcel_id: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          contract_date?: string
          created_at?: string
          creditor_name: string
          creditor_type?: string
          duration_months?: number
          id?: string
          mortgage_amount_usd?: number
          mortgage_status?: string
          parcel_id: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          contract_date?: string
          created_at?: string
          creditor_name?: string
          creditor_type?: string
          duration_months?: number
          id?: string
          mortgage_amount_usd?: number
          mortgage_status?: string
          parcel_id?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cadastral_mortgages_parcel"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_ownership_history: {
        Row: {
          created_at: string
          id: string
          legal_status: string | null
          mutation_type: string | null
          owner_name: string
          ownership_document_url: string | null
          ownership_end_date: string | null
          ownership_start_date: string
          parcel_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          legal_status?: string | null
          mutation_type?: string | null
          owner_name: string
          ownership_document_url?: string | null
          ownership_end_date?: string | null
          ownership_start_date: string
          parcel_id: string
        }
        Update: {
          created_at?: string
          id?: string
          legal_status?: string | null
          mutation_type?: string | null
          owner_name?: string
          ownership_document_url?: string | null
          ownership_end_date?: string | null
          ownership_start_date?: string
          parcel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_ownership_history_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_parcels: {
        Row: {
          area_hectares: number | null
          area_sqm: number
          avenue: string | null
          circonscription_fonciere: string | null
          collectivite: string | null
          commune: string | null
          construction_nature: string | null
          construction_type: string | null
          construction_year: number | null
          created_at: string
          current_owner_legal_status: string | null
          current_owner_name: string
          current_owner_since: string
          declared_usage: string | null
          deleted_at: string | null
          gps_coordinates: Json | null
          groupement: string | null
          id: string
          latitude: number | null
          lease_type: string | null
          location: string
          longitude: number | null
          nombre_bornes: number | null
          owner_document_url: string | null
          parcel_number: string
          parcel_sides: Json | null
          parcel_type: string
          property_title_document_url: string | null
          property_title_type: string
          province: string | null
          quartier: string | null
          surface_calculee_bornes: number | null
          territoire: string | null
          title_issue_date: string | null
          title_reference_number: string | null
          updated_at: string
          village: string | null
          ville: string | null
          whatsapp_number: string | null
        }
        Insert: {
          area_hectares?: number | null
          area_sqm?: number
          avenue?: string | null
          circonscription_fonciere?: string | null
          collectivite?: string | null
          commune?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          construction_year?: number | null
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name: string
          current_owner_since?: string
          declared_usage?: string | null
          deleted_at?: string | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          latitude?: number | null
          lease_type?: string | null
          location: string
          longitude?: number | null
          nombre_bornes?: number | null
          owner_document_url?: string | null
          parcel_number: string
          parcel_sides?: Json | null
          parcel_type: string
          property_title_document_url?: string | null
          property_title_type?: string
          province?: string | null
          quartier?: string | null
          surface_calculee_bornes?: number | null
          territoire?: string | null
          title_issue_date?: string | null
          title_reference_number?: string | null
          updated_at?: string
          village?: string | null
          ville?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          area_hectares?: number | null
          area_sqm?: number
          avenue?: string | null
          circonscription_fonciere?: string | null
          collectivite?: string | null
          commune?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          construction_year?: number | null
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name?: string
          current_owner_since?: string
          declared_usage?: string | null
          deleted_at?: string | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          latitude?: number | null
          lease_type?: string | null
          location?: string
          longitude?: number | null
          nombre_bornes?: number | null
          owner_document_url?: string | null
          parcel_number?: string
          parcel_sides?: Json | null
          parcel_type?: string
          property_title_document_url?: string | null
          property_title_type?: string
          province?: string | null
          quartier?: string | null
          surface_calculee_bornes?: number | null
          territoire?: string | null
          title_issue_date?: string | null
          title_reference_number?: string | null
          updated_at?: string
          village?: string | null
          ville?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      cadastral_results_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cadastral_search_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cadastral_service_access: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          invoice_id: string
          parcel_number: string
          service_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invoice_id: string
          parcel_number: string
          service_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invoice_id?: string
          parcel_number?: string
          service_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_service_access_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cadastral_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastral_services_config: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          price_usd: number
          required_data_fields: Json | null
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_usd?: number
          required_data_fields?: Json | null
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_usd?: number
          required_data_fields?: Json | null
          service_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cadastral_tax_history: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          parcel_id: string
          payment_date: string | null
          payment_status: string
          receipt_document_url: string | null
          tax_year: number
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          id?: string
          parcel_id: string
          payment_date?: string | null
          payment_status?: string
          receipt_document_url?: string | null
          tax_year: number
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          parcel_id?: string
          payment_date?: string | null
          payment_status?: string
          receipt_document_url?: string | null
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cadastral_tax_history_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          body_text: string
          certificate_type: string
          created_at: string
          footer_text: string
          header_organization: string
          header_subtitle: string
          header_title: string
          id: string
          is_active: boolean
          legal_text: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          show_border: boolean
          show_qr_code: boolean
          show_stamp: boolean
          signature_image_url: string | null
          signature_name: string
          signature_title: string
          stamp_text: string
          template_name: string
          updated_at: string
        }
        Insert: {
          body_text?: string
          certificate_type: string
          created_at?: string
          footer_text?: string
          header_organization?: string
          header_subtitle?: string
          header_title?: string
          id?: string
          is_active?: boolean
          legal_text?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          show_border?: boolean
          show_qr_code?: boolean
          show_stamp?: boolean
          signature_image_url?: string | null
          signature_name?: string
          signature_title?: string
          stamp_text?: string
          template_name: string
          updated_at?: string
        }
        Update: {
          body_text?: string
          certificate_type?: string
          created_at?: string
          footer_text?: string
          header_organization?: string
          header_subtitle?: string
          header_title?: string
          id?: string
          is_active?: boolean
          legal_text?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          show_border?: boolean
          show_qr_code?: boolean
          show_stamp?: boolean
          signature_image_url?: string | null
          signature_name?: string
          signature_title?: string
          stamp_text?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_amount_usd: number | null
          discount_percentage: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_usage: number | null
          reseller_id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_amount_usd?: number | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_usage?: number | null
          reseller_id: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_amount_usd?: number | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_usage?: number | null
          reseller_id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      expertise_fees_config: {
        Row: {
          amount_usd: number
          created_at: string
          description: string | null
          display_order: number
          fee_name: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      expertise_payments: {
        Row: {
          created_at: string
          expertise_request_id: string
          fee_items: Json
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          phone_number: string | null
          receipt_url: string | null
          status: string
          total_amount_usd: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expertise_request_id: string
          fee_items?: Json
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          phone_number?: string | null
          receipt_url?: string | null
          status?: string
          total_amount_usd?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expertise_request_id?: string
          fee_items?: Json
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          phone_number?: string | null
          receipt_url?: string | null
          status?: string
          total_amount_usd?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expertise_payments_expertise_request_id_fkey"
            columns: ["expertise_request_id"]
            isOneToOne: false
            referencedRelation: "real_estate_expertise_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_attempts: {
        Row: {
          contribution_id: string | null
          created_at: string
          description: string | null
          fraud_type: string
          id: string
          severity: string
          user_id: string
        }
        Insert: {
          contribution_id?: string | null
          created_at?: string
          description?: string | null
          fraud_type: string
          id?: string
          severity?: string
          user_id: string
        }
        Update: {
          contribution_id?: string | null
          created_at?: string
          description?: string | null
          fraud_type?: string
          id?: string
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_attempts_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "cadastral_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_certificates: {
        Row: {
          certificate_type: string
          certificate_url: string | null
          generated_at: string
          generated_by: string | null
          id: string
          metadata: Json | null
          parcel_number: string
          recipient_name: string
          reference_number: string
          request_id: string | null
          status: string
        }
        Insert: {
          certificate_type: string
          certificate_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          parcel_number: string
          recipient_name: string
          reference_number: string
          request_id?: string | null
          status?: string
        }
        Update: {
          certificate_type?: string
          certificate_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          parcel_number?: string
          recipient_name?: string
          reference_number?: string
          request_id?: string | null
          status?: string
        }
        Relationships: []
      }
      land_title_fees_by_type: {
        Row: {
          applies_to_rural: boolean
          applies_to_urban: boolean
          area_multiplier: number | null
          base_amount_usd: number
          created_at: string
          description: string | null
          display_order: number
          fee_category: string
          fee_name: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          max_area_sqm: number | null
          min_area_sqm: number | null
          rural_discount_usd: number | null
          title_type: string
          updated_at: string
          urban_surcharge_usd: number | null
        }
        Insert: {
          applies_to_rural?: boolean
          applies_to_urban?: boolean
          area_multiplier?: number | null
          base_amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_category: string
          fee_name: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          max_area_sqm?: number | null
          min_area_sqm?: number | null
          rural_discount_usd?: number | null
          title_type: string
          updated_at?: string
          urban_surcharge_usd?: number | null
        }
        Update: {
          applies_to_rural?: boolean
          applies_to_urban?: boolean
          area_multiplier?: number | null
          base_amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_category?: string
          fee_name?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          max_area_sqm?: number | null
          min_area_sqm?: number | null
          rural_discount_usd?: number | null
          title_type?: string
          updated_at?: string
          urban_surcharge_usd?: number | null
        }
        Relationships: []
      }
      land_title_fees_config: {
        Row: {
          amount_usd: number
          created_at: string
          description: string | null
          display_order: number
          fee_name: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      land_title_requests: {
        Row: {
          additional_documents: Json | null
          area_sqm: number | null
          avenue: string | null
          circonscription_fonciere: string | null
          collectivite: string | null
          commune: string | null
          construction_materials: string | null
          construction_nature: string | null
          construction_type: string | null
          created_at: string
          declared_usage: string | null
          deduced_title_type: string | null
          estimated_processing_days: number | null
          fee_items: Json
          gps_coordinates: Json | null
          groupement: string | null
          id: string
          is_owner_same_as_requester: boolean | null
          nationality: string | null
          occupation_duration: string | null
          owner_first_name: string | null
          owner_gender: string | null
          owner_id_document_url: string | null
          owner_last_name: string | null
          owner_legal_status: string | null
          owner_middle_name: string | null
          owner_phone: string | null
          paid_at: string | null
          parcel_sides: Json | null
          payment_id: string | null
          payment_status: string
          processing_notes: string | null
          procuration_document_url: string | null
          proof_of_ownership_url: string | null
          province: string
          quartier: string | null
          reference_number: string
          rejection_reason: string | null
          request_type: string | null
          requester_email: string | null
          requester_first_name: string
          requester_gender: string | null
          requester_id_document_url: string | null
          requester_last_name: string
          requester_legal_status: string | null
          requester_middle_name: string | null
          requester_phone: string
          requester_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          road_bordering_sides: Json | null
          section_type: string
          selected_parcel_number: string | null
          status: string
          territoire: string | null
          total_amount_usd: number
          updated_at: string
          user_id: string
          village: string | null
          ville: string | null
        }
        Insert: {
          additional_documents?: Json | null
          area_sqm?: number | null
          avenue?: string | null
          circonscription_fonciere?: string | null
          collectivite?: string | null
          commune?: string | null
          construction_materials?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          created_at?: string
          declared_usage?: string | null
          deduced_title_type?: string | null
          estimated_processing_days?: number | null
          fee_items?: Json
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          is_owner_same_as_requester?: boolean | null
          nationality?: string | null
          occupation_duration?: string | null
          owner_first_name?: string | null
          owner_gender?: string | null
          owner_id_document_url?: string | null
          owner_last_name?: string | null
          owner_legal_status?: string | null
          owner_middle_name?: string | null
          owner_phone?: string | null
          paid_at?: string | null
          parcel_sides?: Json | null
          payment_id?: string | null
          payment_status?: string
          processing_notes?: string | null
          procuration_document_url?: string | null
          proof_of_ownership_url?: string | null
          province: string
          quartier?: string | null
          reference_number: string
          rejection_reason?: string | null
          request_type?: string | null
          requester_email?: string | null
          requester_first_name: string
          requester_gender?: string | null
          requester_id_document_url?: string | null
          requester_last_name: string
          requester_legal_status?: string | null
          requester_middle_name?: string | null
          requester_phone: string
          requester_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          road_bordering_sides?: Json | null
          section_type: string
          selected_parcel_number?: string | null
          status?: string
          territoire?: string | null
          total_amount_usd?: number
          updated_at?: string
          user_id: string
          village?: string | null
          ville?: string | null
        }
        Update: {
          additional_documents?: Json | null
          area_sqm?: number | null
          avenue?: string | null
          circonscription_fonciere?: string | null
          collectivite?: string | null
          commune?: string | null
          construction_materials?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          created_at?: string
          declared_usage?: string | null
          deduced_title_type?: string | null
          estimated_processing_days?: number | null
          fee_items?: Json
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          is_owner_same_as_requester?: boolean | null
          nationality?: string | null
          occupation_duration?: string | null
          owner_first_name?: string | null
          owner_gender?: string | null
          owner_id_document_url?: string | null
          owner_last_name?: string | null
          owner_legal_status?: string | null
          owner_middle_name?: string | null
          owner_phone?: string | null
          paid_at?: string | null
          parcel_sides?: Json | null
          payment_id?: string | null
          payment_status?: string
          processing_notes?: string | null
          procuration_document_url?: string | null
          proof_of_ownership_url?: string | null
          province?: string
          quartier?: string | null
          reference_number?: string
          rejection_reason?: string | null
          request_type?: string | null
          requester_email?: string | null
          requester_first_name?: string
          requester_gender?: string | null
          requester_id_document_url?: string | null
          requester_last_name?: string
          requester_legal_status?: string | null
          requester_middle_name?: string | null
          requester_phone?: string
          requester_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          road_bordering_sides?: Json | null
          section_type?: string
          selected_parcel_number?: string | null
          status?: string
          territoire?: string | null
          total_amount_usd?: number
          updated_at?: string
          user_id?: string
          village?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      map_providers: {
        Row: {
          api_key_env_name: string | null
          api_key_placeholder: string | null
          attribution: string
          created_at: string
          description: string | null
          display_order: number
          extra_config: Json | null
          icon_name: string | null
          id: string
          is_active: boolean
          is_default: boolean
          max_zoom: number
          min_zoom: number
          provider_key: string
          provider_name: string
          requires_api_key: boolean
          tile_url_template: string
          updated_at: string
        }
        Insert: {
          api_key_env_name?: string | null
          api_key_placeholder?: string | null
          attribution?: string
          created_at?: string
          description?: string | null
          display_order?: number
          extra_config?: Json | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_zoom?: number
          min_zoom?: number
          provider_key: string
          provider_name: string
          requires_api_key?: boolean
          tile_url_template: string
          updated_at?: string
        }
        Update: {
          api_key_env_name?: string | null
          api_key_placeholder?: string | null
          attribution?: string
          created_at?: string
          description?: string | null
          display_order?: number
          extra_config?: Json | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_zoom?: number
          min_zoom?: number
          provider_key?: string
          provider_name?: string
          requires_api_key?: boolean
          tile_url_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_trends: {
        Row: {
          average_rent_price: number
          created_at: string
          id: string
          month: number
          transaction_volume: number
          vacancy_rate: number
          year: number
          zone_id: string
        }
        Insert: {
          average_rent_price?: number
          created_at?: string
          id?: string
          month: number
          transaction_volume?: number
          vacancy_rate?: number
          year: number
          zone_id: string
        }
        Update: {
          average_rent_price?: number
          created_at?: string
          id?: string
          month?: number
          transaction_volume?: number
          vacancy_rate?: number
          year?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_trends_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "territorial_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      mutation_fees_config: {
        Row: {
          amount_usd: number
          created_at: string
          description: string | null
          display_order: number
          fee_name: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      mutation_requests: {
        Row: {
          beneficiary_id_document_url: string | null
          beneficiary_name: string | null
          beneficiary_phone: string | null
          created_at: string
          estimated_processing_days: number | null
          fee_items: Json
          id: string
          justification: string | null
          mutation_type: string
          paid_at: string | null
          parcel_id: string | null
          parcel_number: string
          payment_id: string | null
          payment_status: string
          processing_notes: string | null
          proposed_changes: Json
          reference_number: string
          rejection_reason: string | null
          requester_email: string | null
          requester_id_document_url: string | null
          requester_name: string
          requester_phone: string | null
          requester_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          supporting_documents: Json | null
          total_amount_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiary_id_document_url?: string | null
          beneficiary_name?: string | null
          beneficiary_phone?: string | null
          created_at?: string
          estimated_processing_days?: number | null
          fee_items?: Json
          id?: string
          justification?: string | null
          mutation_type?: string
          paid_at?: string | null
          parcel_id?: string | null
          parcel_number: string
          payment_id?: string | null
          payment_status?: string
          processing_notes?: string | null
          proposed_changes?: Json
          reference_number: string
          rejection_reason?: string | null
          requester_email?: string | null
          requester_id_document_url?: string | null
          requester_name: string
          requester_phone?: string | null
          requester_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_documents?: Json | null
          total_amount_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficiary_id_document_url?: string | null
          beneficiary_name?: string | null
          beneficiary_phone?: string | null
          created_at?: string
          estimated_processing_days?: number | null
          fee_items?: Json
          id?: string
          justification?: string | null
          mutation_type?: string
          paid_at?: string | null
          parcel_id?: string | null
          parcel_number?: string
          payment_id?: string | null
          payment_status?: string
          processing_notes?: string | null
          proposed_changes?: Json
          reference_number?: string
          rejection_reason?: string | null
          requester_email?: string | null
          requester_id_document_url?: string | null
          requester_name?: string
          requester_phone?: string | null
          requester_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_documents?: Json | null
          total_amount_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutation_requests_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          email: string
          id: string
          items: Json
          status: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          email: string
          id?: string
          items: Json
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          email?: string
          id?: string
          items?: Json
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parcel_actions_config: {
        Row: {
          action_key: string
          badge_color: string | null
          badge_label: string | null
          badge_type: string
          category: string
          created_at: string
          description: string
          display_order: number
          icon_name: string | null
          id: string
          is_active: boolean
          is_visible: boolean
          label: string
          requires_auth: boolean
          updated_at: string
        }
        Insert: {
          action_key: string
          badge_color?: string | null
          badge_label?: string | null
          badge_type?: string
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          label: string
          requires_auth?: boolean
          updated_at?: string
        }
        Update: {
          action_key?: string
          badge_color?: string | null
          badge_label?: string | null
          badge_type?: string
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          label?: string
          requires_auth?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods_config: {
        Row: {
          api_credentials: Json | null
          config_type: string
          created_at: string | null
          display_order: number | null
          id: string
          is_enabled: boolean
          provider_id: string
          provider_name: string
          updated_at: string | null
        }
        Insert: {
          api_credentials?: Json | null
          config_type: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          provider_id: string
          provider_name: string
          updated_at?: string | null
        }
        Update: {
          api_credentials?: Json | null
          config_type?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          provider_id?: string
          provider_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_usd: number
          created_at: string | null
          error_message: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          payment_method: string
          phone_number: string | null
          provider: string
          status: string
          transaction_reference: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_method: string
          phone_number?: string | null
          provider: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_method?: string
          phone_number?: string | null
          provider?: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          payment_method: string
          payment_provider: string | null
          phone_number: string | null
          publication_id: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_provider?: string | null
          phone_number?: string | null
          publication_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_provider?: string | null
          phone_number?: string | null
          publication_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action_name: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          resource_name: string
        }
        Insert: {
          action_name: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          resource_name: string
        }
        Update: {
          action_name?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          resource_name?: string
        }
        Relationships: []
      }
      permit_admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          comment: string | null
          contribution_id: string
          created_at: string
          id: string
          requested_documents: Json | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          comment?: string | null
          contribution_id: string
          created_at?: string
          id?: string
          requested_documents?: Json | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          comment?: string | null
          contribution_id?: string
          created_at?: string
          id?: string
          requested_documents?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "permit_admin_actions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "cadastral_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_fees_config: {
        Row: {
          amount_usd: number
          created_at: string
          description: string | null
          display_order: number
          fee_name: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          permit_type: string
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          permit_type: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          permit_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      permit_payments: {
        Row: {
          contribution_id: string
          created_at: string
          fee_items: Json
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          permit_type: string
          phone_number: string | null
          receipt_url: string | null
          status: string
          total_amount_usd: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contribution_id: string
          created_at?: string
          fee_items?: Json
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          permit_type: string
          phone_number?: string | null
          receipt_url?: string | null
          status?: string
          total_amount_usd?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contribution_id?: string
          created_at?: string
          fee_items?: Json
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          permit_type?: string
          phone_number?: string | null
          receipt_url?: string | null
          status?: string
          total_amount_usd?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_payments_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "cadastral_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          deleted_at: string | null
          email: string
          fraud_strikes: number | null
          full_name: string | null
          id: string
          is_blocked: boolean | null
          organization: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          fraud_strikes?: number | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          fraud_strikes?: number | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          area_sqm: number
          bathrooms: number | null
          bedrooms: number | null
          city: string
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          features: string[] | null
          id: string
          image_urls: string[] | null
          is_available: boolean
          latitude: number
          longitude: number
          parking_spaces: number | null
          price: number
          property_type: string
          province: string
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          area_sqm: number
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_urls?: string[] | null
          is_available?: boolean
          latitude: number
          longitude: number
          parking_spaces?: number | null
          price: number
          property_type: string
          province?: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          area_sqm?: number
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_urls?: string[] | null
          is_available?: boolean
          latitude?: number
          longitude?: number
          parking_spaces?: number | null
          price?: number
          property_type?: string
          province?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_tax_rates_config: {
        Row: {
          area_multiplier: number | null
          base_amount_usd: number
          construction_type: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          max_area_sqm: number | null
          min_area_sqm: number | null
          rate_percentage: number
          tax_category: string
          updated_at: string
          usage_type: string
          zone_type: string
        }
        Insert: {
          area_multiplier?: number | null
          base_amount_usd?: number
          construction_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          max_area_sqm?: number | null
          min_area_sqm?: number | null
          rate_percentage?: number
          tax_category: string
          updated_at?: string
          usage_type?: string
          zone_type?: string
        }
        Update: {
          area_multiplier?: number | null
          base_amount_usd?: number
          construction_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          max_area_sqm?: number | null
          min_area_sqm?: number | null
          rate_percentage?: number
          tax_category?: string
          updated_at?: string
          usage_type?: string
          zone_type?: string
        }
        Relationships: []
      }
      publication_downloads: {
        Row: {
          downloaded_at: string
          id: string
          ip_address: string | null
          payment_id: string | null
          publication_id: string | null
          user_id: string | null
        }
        Insert: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          payment_id?: string | null
          publication_id?: string | null
          user_id?: string | null
        }
        Update: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          payment_id?: string | null
          publication_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_downloads_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_downloads_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          category: string
          content: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          download_count: number
          featured: boolean
          file_url: string | null
          id: string
          price_usd: number
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          featured?: boolean
          file_url?: string | null
          id?: string
          price_usd?: number
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          featured?: boolean
          file_url?: string | null
          id?: string
          price_usd?: number
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      real_estate_expertise_requests: {
        Row: {
          additional_notes: string | null
          assigned_at: string | null
          assigned_to: string | null
          certificate_expiry_date: string | null
          certificate_issue_date: string | null
          certificate_url: string | null
          construction_quality: string | null
          construction_year: number | null
          created_at: string
          distance_to_hospital_km: number | null
          distance_to_main_road_m: number | null
          distance_to_market_km: number | null
          distance_to_school_km: number | null
          erosion_risk_zone: boolean | null
          expertise_date: string | null
          expertise_report_url: string | null
          flood_risk_zone: boolean | null
          garden_area_sqm: number | null
          has_electricity: boolean | null
          has_garden: boolean | null
          has_internet: boolean | null
          has_parking: boolean | null
          has_security_system: boolean | null
          has_sewage_system: boolean | null
          has_water_supply: boolean | null
          id: string
          market_value_usd: number | null
          number_of_floors: number | null
          parcel_id: string | null
          parcel_number: string
          parking_spaces: number | null
          payment_status: string | null
          processing_notes: string | null
          property_condition: string | null
          property_description: string | null
          reference_number: string
          rejection_reason: string | null
          requester_email: string | null
          requester_name: string
          requester_phone: string | null
          road_access_type: string | null
          status: string
          supporting_documents: Json | null
          total_built_area_sqm: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          certificate_expiry_date?: string | null
          certificate_issue_date?: string | null
          certificate_url?: string | null
          construction_quality?: string | null
          construction_year?: number | null
          created_at?: string
          distance_to_hospital_km?: number | null
          distance_to_main_road_m?: number | null
          distance_to_market_km?: number | null
          distance_to_school_km?: number | null
          erosion_risk_zone?: boolean | null
          expertise_date?: string | null
          expertise_report_url?: string | null
          flood_risk_zone?: boolean | null
          garden_area_sqm?: number | null
          has_electricity?: boolean | null
          has_garden?: boolean | null
          has_internet?: boolean | null
          has_parking?: boolean | null
          has_security_system?: boolean | null
          has_sewage_system?: boolean | null
          has_water_supply?: boolean | null
          id?: string
          market_value_usd?: number | null
          number_of_floors?: number | null
          parcel_id?: string | null
          parcel_number: string
          parking_spaces?: number | null
          payment_status?: string | null
          processing_notes?: string | null
          property_condition?: string | null
          property_description?: string | null
          reference_number: string
          rejection_reason?: string | null
          requester_email?: string | null
          requester_name: string
          requester_phone?: string | null
          road_access_type?: string | null
          status?: string
          supporting_documents?: Json | null
          total_built_area_sqm?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          certificate_expiry_date?: string | null
          certificate_issue_date?: string | null
          certificate_url?: string | null
          construction_quality?: string | null
          construction_year?: number | null
          created_at?: string
          distance_to_hospital_km?: number | null
          distance_to_main_road_m?: number | null
          distance_to_market_km?: number | null
          distance_to_school_km?: number | null
          erosion_risk_zone?: boolean | null
          expertise_date?: string | null
          expertise_report_url?: string | null
          flood_risk_zone?: boolean | null
          garden_area_sqm?: number | null
          has_electricity?: boolean | null
          has_garden?: boolean | null
          has_internet?: boolean | null
          has_parking?: boolean | null
          has_security_system?: boolean | null
          has_sewage_system?: boolean | null
          has_water_supply?: boolean | null
          id?: string
          market_value_usd?: number | null
          number_of_floors?: number | null
          parcel_id?: string | null
          parcel_number?: string
          parking_spaces?: number | null
          payment_status?: string | null
          processing_notes?: string | null
          property_condition?: string | null
          property_description?: string | null
          reference_number?: string
          rejection_reason?: string | null
          requester_email?: string | null
          requester_name?: string
          requester_phone?: string | null
          road_access_type?: string | null
          status?: string
          supporting_documents?: Json | null
          total_built_area_sqm?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_expertise_requests_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_sales: {
        Row: {
          commission_earned_usd: number
          commission_paid: boolean
          commission_paid_at: string | null
          created_at: string
          discount_applied_usd: number | null
          discount_code_id: string | null
          id: string
          invoice_id: string | null
          payment_id: string | null
          reseller_id: string
          sale_amount_usd: number
        }
        Insert: {
          commission_earned_usd: number
          commission_paid?: boolean
          commission_paid_at?: string | null
          created_at?: string
          discount_applied_usd?: number | null
          discount_code_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          reseller_id: string
          sale_amount_usd: number
        }
        Update: {
          commission_earned_usd?: number
          commission_paid?: boolean
          commission_paid_at?: string | null
          created_at?: string
          discount_applied_usd?: number | null
          discount_code_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          reseller_id?: string
          sale_amount_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "reseller_sales_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_sales_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cadastral_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_sales_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          business_name: string | null
          commission_rate: number
          contact_phone: string | null
          created_at: string
          fixed_commission_usd: number | null
          id: string
          is_active: boolean
          reseller_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          commission_rate?: number
          contact_phone?: string | null
          created_at?: string
          fixed_commission_usd?: number | null
          id?: string
          is_active?: boolean
          reseller_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          commission_rate?: number
          contact_phone?: string | null
          created_at?: string
          fixed_commission_usd?: number | null
          id?: string
          is_active?: boolean
          reseller_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      subdivision_lots: {
        Row: {
          area_sqm: number
          color: string | null
          construction_type: string | null
          created_at: string
          fence_type: string | null
          gps_coordinates: Json | null
          has_fence: boolean | null
          id: string
          intended_use: string | null
          is_built: boolean | null
          lot_label: string | null
          lot_number: string
          notes: string | null
          owner_name: string | null
          parcel_number: string
          perimeter_m: number
          plan_coordinates: Json | null
          subdivision_request_id: string
          updated_at: string
        }
        Insert: {
          area_sqm?: number
          color?: string | null
          construction_type?: string | null
          created_at?: string
          fence_type?: string | null
          gps_coordinates?: Json | null
          has_fence?: boolean | null
          id?: string
          intended_use?: string | null
          is_built?: boolean | null
          lot_label?: string | null
          lot_number: string
          notes?: string | null
          owner_name?: string | null
          parcel_number: string
          perimeter_m?: number
          plan_coordinates?: Json | null
          subdivision_request_id: string
          updated_at?: string
        }
        Update: {
          area_sqm?: number
          color?: string | null
          construction_type?: string | null
          created_at?: string
          fence_type?: string | null
          gps_coordinates?: Json | null
          has_fence?: boolean | null
          id?: string
          intended_use?: string | null
          is_built?: boolean | null
          lot_label?: string | null
          lot_number?: string
          notes?: string | null
          owner_name?: string | null
          parcel_number?: string
          perimeter_m?: number
          plan_coordinates?: Json | null
          subdivision_request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subdivision_lots_subdivision_request_id_fkey"
            columns: ["subdivision_request_id"]
            isOneToOne: false
            referencedRelation: "subdivision_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      subdivision_requests: {
        Row: {
          additional_documents: Json | null
          approved_at: string | null
          created_at: string
          estimated_processing_days: number | null
          fee_items: Json | null
          final_paid_at: string | null
          final_payment_id: string | null
          final_payment_status: string | null
          id: string
          intended_use_per_lot: Json | null
          lots_data: Json
          number_of_lots: number
          parcel_id: string | null
          parcel_number: string
          parent_parcel_area_sqm: number
          parent_parcel_gps_coordinates: Json | null
          parent_parcel_location: string | null
          parent_parcel_owner_name: string
          parent_parcel_title_reference: string | null
          processing_notes: string | null
          proof_of_ownership_url: string | null
          purpose_of_subdivision: string | null
          reference_number: string
          rejection_reason: string | null
          remaining_fee_usd: number | null
          requester_email: string | null
          requester_first_name: string
          requester_id_document_url: string | null
          requester_last_name: string
          requester_middle_name: string | null
          requester_phone: string
          requester_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          subdivision_plan_data: Json | null
          subdivision_sketch_url: string | null
          submission_fee_usd: number | null
          submission_paid_at: string | null
          submission_payment_id: string | null
          submission_payment_status: string | null
          total_amount_usd: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_documents?: Json | null
          approved_at?: string | null
          created_at?: string
          estimated_processing_days?: number | null
          fee_items?: Json | null
          final_paid_at?: string | null
          final_payment_id?: string | null
          final_payment_status?: string | null
          id?: string
          intended_use_per_lot?: Json | null
          lots_data?: Json
          number_of_lots: number
          parcel_id?: string | null
          parcel_number: string
          parent_parcel_area_sqm: number
          parent_parcel_gps_coordinates?: Json | null
          parent_parcel_location?: string | null
          parent_parcel_owner_name: string
          parent_parcel_title_reference?: string | null
          processing_notes?: string | null
          proof_of_ownership_url?: string | null
          purpose_of_subdivision?: string | null
          reference_number: string
          rejection_reason?: string | null
          remaining_fee_usd?: number | null
          requester_email?: string | null
          requester_first_name: string
          requester_id_document_url?: string | null
          requester_last_name: string
          requester_middle_name?: string | null
          requester_phone: string
          requester_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subdivision_plan_data?: Json | null
          subdivision_sketch_url?: string | null
          submission_fee_usd?: number | null
          submission_paid_at?: string | null
          submission_payment_id?: string | null
          submission_payment_status?: string | null
          total_amount_usd?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_documents?: Json | null
          approved_at?: string | null
          created_at?: string
          estimated_processing_days?: number | null
          fee_items?: Json | null
          final_paid_at?: string | null
          final_payment_id?: string | null
          final_payment_status?: string | null
          id?: string
          intended_use_per_lot?: Json | null
          lots_data?: Json
          number_of_lots?: number
          parcel_id?: string | null
          parcel_number?: string
          parent_parcel_area_sqm?: number
          parent_parcel_gps_coordinates?: Json | null
          parent_parcel_location?: string | null
          parent_parcel_owner_name?: string
          parent_parcel_title_reference?: string | null
          processing_notes?: string | null
          proof_of_ownership_url?: string | null
          purpose_of_subdivision?: string | null
          reference_number?: string
          rejection_reason?: string | null
          remaining_fee_usd?: number | null
          requester_email?: string | null
          requester_first_name?: string
          requester_id_document_url?: string | null
          requester_last_name?: string
          requester_middle_name?: string | null
          requester_phone?: string
          requester_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subdivision_plan_data?: Json | null
          subdivision_sketch_url?: string | null
          submission_fee_usd?: number | null
          submission_paid_at?: string | null
          submission_payment_id?: string | null
          submission_payment_status?: string | null
          total_amount_usd?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subdivision_requests_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "cadastral_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      subdivision_roads: {
        Row: {
          created_at: string
          gps_coordinates: Json | null
          id: string
          is_existing: boolean | null
          plan_coordinates: Json | null
          road_name: string | null
          subdivision_request_id: string
          surface_type: string | null
          width_m: number | null
        }
        Insert: {
          created_at?: string
          gps_coordinates?: Json | null
          id?: string
          is_existing?: boolean | null
          plan_coordinates?: Json | null
          road_name?: string | null
          subdivision_request_id: string
          surface_type?: string | null
          width_m?: number | null
        }
        Update: {
          created_at?: string
          gps_coordinates?: Json | null
          id?: string
          is_existing?: boolean | null
          plan_coordinates?: Json | null
          road_name?: string | null
          subdivision_request_id?: string
          surface_type?: string | null
          width_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subdivision_roads_subdivision_request_id_fkey"
            columns: ["subdivision_request_id"]
            isOneToOne: false
            referencedRelation: "subdivision_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestive_picklist_values: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          picklist_key: string
          updated_at: string
          usage_count: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          picklist_key: string
          updated_at?: string
          usage_count?: number
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          picklist_key?: string
          updated_at?: string
          usage_count?: number
          value?: string
        }
        Relationships: []
      }
      tax_exemptions_config: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          duration_years: number | null
          exemption_type: string
          id: string
          is_active: boolean
          label: string
          max_area_sqm: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_years?: number | null
          exemption_type: string
          id?: string
          is_active?: boolean
          label: string
          max_area_sqm?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_years?: number | null
          exemption_type?: string
          id?: string
          is_active?: boolean
          label?: string
          max_area_sqm?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_payment_fees_config: {
        Row: {
          amount_usd: number | null
          created_at: string
          description: string | null
          display_order: number
          fee_name: string
          fee_type: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          percentage: number | null
          updated_at: string
        }
        Insert: {
          amount_usd?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name: string
          fee_type?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          percentage?: number | null
          updated_at?: string
        }
        Update: {
          amount_usd?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          fee_name?: string
          fee_type?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      territorial_zones: {
        Row: {
          coordinates: Json
          created_at: string
          densite_residentielle: number
          duree_moyenne_mise_location_jours: number | null
          id: string
          indice_pression_fonciere: string
          indice_pression_locative: string | null
          name: string
          nombre_transactions_estimees: number | null
          parent_zone_id: string | null
          population_locative_estimee: number
          prix_moyen_loyer: number
          prix_moyen_vente_m2: number
          recettes_fiscales_estimees_usd: number | null
          recettes_locatives_theoriques_usd: number
          taux_occupation_locatif: number | null
          taux_vacance_locative: number
          typologie_dominante: string
          updated_at: string
          valeur_fonciere_moyenne_parcelle_usd: number | null
          variation_loyer_3mois_pct: number
          volume_annonces_mois: number
          zone_type: string
        }
        Insert: {
          coordinates: Json
          created_at?: string
          densite_residentielle?: number
          duree_moyenne_mise_location_jours?: number | null
          id?: string
          indice_pression_fonciere?: string
          indice_pression_locative?: string | null
          name: string
          nombre_transactions_estimees?: number | null
          parent_zone_id?: string | null
          population_locative_estimee?: number
          prix_moyen_loyer?: number
          prix_moyen_vente_m2?: number
          recettes_fiscales_estimees_usd?: number | null
          recettes_locatives_theoriques_usd?: number
          taux_occupation_locatif?: number | null
          taux_vacance_locative?: number
          typologie_dominante?: string
          updated_at?: string
          valeur_fonciere_moyenne_parcelle_usd?: number | null
          variation_loyer_3mois_pct?: number
          volume_annonces_mois?: number
          zone_type: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          densite_residentielle?: number
          duree_moyenne_mise_location_jours?: number | null
          id?: string
          indice_pression_fonciere?: string
          indice_pression_locative?: string | null
          name?: string
          nombre_transactions_estimees?: number | null
          parent_zone_id?: string | null
          population_locative_estimee?: number
          prix_moyen_loyer?: number
          prix_moyen_vente_m2?: number
          recettes_fiscales_estimees_usd?: number | null
          recettes_locatives_theoriques_usd?: number
          taux_occupation_locatif?: number | null
          taux_vacance_locative?: number
          typologie_dominante?: string
          updated_at?: string
          valeur_fonciere_moyenne_parcelle_usd?: number | null
          variation_loyer_3mois_pct?: number
          volume_annonces_mois?: number
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "territorial_zones_parent_zone_id_fkey"
            columns: ["parent_zone_id"]
            isOneToOne: false
            referencedRelation: "territorial_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_details: Json | null
          activity_type: string
          created_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_details?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_details?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          data_sharing_consent: boolean | null
          email_notifications: boolean | null
          id: string
          language: string | null
          marketing_emails: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_sharing_consent?: boolean | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_sharing_consent?: boolean | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      properties_public: {
        Row: {
          address: string | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          features: string[] | null
          id: string | null
          image_urls: string[] | null
          is_available: boolean | null
          latitude: number | null
          longitude: number | null
          parking_spaces: number | null
          price: number | null
          property_type: string | null
          province: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: string[] | null
          id?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          parking_spaces?: number | null
          price?: number | null
          property_type?: string | null
          province?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: string[] | null
          id?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          parking_spaces?: number | null
          price?: number | null
          property_type?: string | null
          province?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_ccc_value: {
        Args: { contribution_id: string }
        Returns: number
      }
      calculate_surface_from_coordinates: {
        Args: { coordinates: Json }
        Returns: number
      }
      check_contribution_abuse: {
        Args: { p_parcel_id?: string; p_user_id: string }
        Returns: {
          is_abuse: boolean
          reason: string
          recent_count: number
        }[]
      }
      check_service_usage: { Args: { service_id_param: string }; Returns: Json }
      cleanup_expired_data: { Args: never; Returns: undefined }
      create_cadastral_invoice_secure: {
        Args: {
          discount_code_param?: string
          parcel_number_param: string
          selected_services_param: string[]
        }
        Returns: {
          discount_amount_usd: number
          discount_code_used: string
          error_message: string
          invoice_id: string
          invoice_number: string
          original_amount_usd: number
          services_data: Json
          total_amount_usd: number
        }[]
      }
      detect_suspicious_contribution: {
        Args: { p_parcel_number: string; p_user_id: string }
        Returns: {
          fraud_score: number
          is_suspicious: boolean
          reasons: string[]
        }[]
      }
      export_user_data: { Args: { target_user_id: string }; Returns: Json }
      extract_owner_names_from_details: {
        Args: { owners_details: Json }
        Returns: string
      }
      generate_ccc_code: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_land_title_reference: { Args: never; Returns: string }
      generate_mutation_reference: { Args: never; Returns: string }
      generate_permit_number: {
        Args: { permit_type: string; province: string }
        Returns: string
      }
      generate_reseller_code: { Args: never; Returns: string }
      generate_service_id: { Args: { service_name: string }; Returns: string }
      get_admin_statistics: {
        Args: { end_date?: string; start_date?: string; stat_type?: string }
        Returns: Json
      }
      get_cadastral_parcel_with_calculations: {
        Args: { parcel_number_param: string }
        Returns: {
          area_hectares: number
          area_sqm: number
          avenue: string
          calculated_area_hectares: number
          calculated_surface_sqm: number
          circonscription_fonciere: string
          collectivite: string
          commune: string
          created_at: string
          current_owner_legal_status: string
          current_owner_name: string
          current_owner_since: string
          gps_coordinates: Json
          groupement: string
          id: string
          latitude: number
          location: string
          longitude: number
          nombre_bornes: number
          parcel_number: string
          parcel_type: string
          property_title_type: string
          province: string
          quartier: string
          surface_calculee_bornes: number
          territoire: string
          updated_at: string
          village: string
          ville: string
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_parcel_contribution_history: {
        Args: { p_parcel_id: string }
        Returns: {
          change_justification: string
          changed_fields: Json
          contribution_id: string
          contribution_type: string
          contributor_name: string
          created_at: string
          reviewed_at: string
          status: string
          user_id: string
        }[]
      }
      get_reseller_statistics: {
        Args: {
          end_date?: string
          reseller_user_id: string
          start_date?: string
          stat_type?: string
        }
        Returns: Json
      }
      get_role_permissions: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          action_name: string
          description: string
          display_name: string
          permission_id: string
          resource_name: string
        }[]
      }
      get_service_audit_history: {
        Args: { service_id_param: string }
        Returns: {
          action: string
          changed_at: string
          changed_by: string
          new_values: Json
          old_values: Json
        }[]
      }
      get_user_activity_stats: {
        Args: { _end_date?: string; _start_date?: string; _user_id: string }
        Returns: {
          contribution_count: number
          last_activity: string
          login_count: number
          payment_count: number
          search_count: number
          total_activities: number
        }[]
      }
      get_user_highest_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_statistics: {
        Args: { end_date?: string; start_date?: string; target_user_id: string }
        Returns: Json
      }
      get_zone_trend_data: {
        Args: { months_back?: number; zone_id_param: string }
        Returns: {
          month: string
          period_date: string
          value: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_expert_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_permit_valid: {
        Args: { issue_date: string; validity_months: number }
        Returns: boolean
      }
      log_audit_action: {
        Args: {
          action_param: string
          new_values_param?: Json
          old_values_param?: Json
          record_id_param?: string
          table_name_param?: string
        }
        Returns: string
      }
      migrate_approved_contribution: {
        Args: { contribution_id: string }
        Returns: string
      }
      user_has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      validate_and_apply_ccc: {
        Args: { code_input: string; invoice_amount: number }
        Returns: {
          code_id: string
          discount_amount: number
          is_valid: boolean
          message: string
        }[]
      }
      validate_and_apply_discount_code: {
        Args: { code_input: string; invoice_amount: number }
        Returns: {
          code_id: string
          discount_amount: number
          is_valid: boolean
          reseller_id: string
        }[]
      }
      validate_contribution_completeness: {
        Args: { contribution_id: string }
        Returns: Json
      }
      validate_file_upload: {
        Args: { allowed_types: string[]; file_name: string; file_size: number }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "partner"
        | "user"
        | "expert_immobilier"
        | "mortgage_officer"
      user_role: "admin" | "partner" | "user"
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
      app_role: [
        "super_admin",
        "admin",
        "partner",
        "user",
        "expert_immobilier",
        "mortgage_officer",
      ],
      user_role: ["admin", "partner", "user"],
    },
  },
} as const
