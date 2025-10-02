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
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cadastral_boundary_history: {
        Row: {
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
      cadastral_contributions: {
        Row: {
          area_sqm: number | null
          avenue: string | null
          boundary_history: Json | null
          collectivite: string | null
          commune: string | null
          construction_nature: string | null
          construction_type: string | null
          created_at: string
          current_owner_legal_status: string | null
          current_owner_name: string | null
          current_owner_since: string | null
          declared_usage: string | null
          gps_coordinates: Json | null
          groupement: string | null
          id: string
          mortgage_history: Json | null
          ownership_history: Json | null
          parcel_number: string
          property_title_type: string | null
          province: string | null
          quartier: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_history: Json | null
          territoire: string | null
          updated_at: string
          user_id: string | null
          village: string | null
          ville: string | null
          whatsapp_number: string | null
        }
        Insert: {
          area_sqm?: number | null
          avenue?: string | null
          boundary_history?: Json | null
          collectivite?: string | null
          commune?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name?: string | null
          current_owner_since?: string | null
          declared_usage?: string | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          mortgage_history?: Json | null
          ownership_history?: Json | null
          parcel_number: string
          property_title_type?: string | null
          province?: string | null
          quartier?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_history?: Json | null
          territoire?: string | null
          updated_at?: string
          user_id?: string | null
          village?: string | null
          ville?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          area_sqm?: number | null
          avenue?: string | null
          boundary_history?: Json | null
          collectivite?: string | null
          commune?: string | null
          construction_nature?: string | null
          construction_type?: string | null
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name?: string | null
          current_owner_since?: string | null
          declared_usage?: string | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          mortgage_history?: Json | null
          ownership_history?: Json | null
          parcel_number?: string
          property_title_type?: string | null
          province?: string | null
          quartier?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_history?: Json | null
          territoire?: string | null
          updated_at?: string
          user_id?: string | null
          village?: string | null
          ville?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      cadastral_contributor_codes: {
        Row: {
          code: string
          contribution_id: string
          created_at: string
          expires_at: string
          id: string
          invoice_id: string | null
          is_used: boolean
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
          invoice_id?: string | null
          is_used?: boolean
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
          invoice_id?: string | null
          is_used?: boolean
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
      cadastral_mortgage_payments: {
        Row: {
          created_at: string
          id: string
          mortgage_id: string
          payment_amount_usd: number
          payment_date: string
          payment_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          mortgage_id: string
          payment_amount_usd?: number
          payment_date?: string
          payment_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          mortgage_id?: string
          payment_amount_usd?: number
          payment_date?: string
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
          created_at: string
          current_owner_legal_status: string | null
          current_owner_name: string
          current_owner_since: string
          declared_usage: string | null
          gps_coordinates: Json | null
          groupement: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          nombre_bornes: number | null
          parcel_number: string
          parcel_type: string
          property_title_type: string
          province: string | null
          quartier: string | null
          surface_calculee_bornes: number | null
          territoire: string | null
          updated_at: string
          village: string | null
          ville: string | null
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
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name: string
          current_owner_since?: string
          declared_usage?: string | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          nombre_bornes?: number | null
          parcel_number: string
          parcel_type: string
          property_title_type?: string
          province?: string | null
          quartier?: string | null
          surface_calculee_bornes?: number | null
          territoire?: string | null
          updated_at?: string
          village?: string | null
          ville?: string | null
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
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name?: string
          current_owner_since?: string
          declared_usage?: string | null
          gps_coordinates?: Json | null
          groupement?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          nombre_bornes?: number | null
          parcel_number?: string
          parcel_type?: string
          property_title_type?: string
          province?: string | null
          quartier?: string | null
          surface_calculee_bornes?: number | null
          territoire?: string | null
          updated_at?: string
          village?: string | null
          ville?: string | null
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
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_usd: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_usd?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_usd?: number
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
          tax_year: number
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          id?: string
          parcel_id: string
          payment_date?: string | null
          payment_status?: string
          tax_year: number
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          parcel_id?: string
          payment_date?: string | null
          payment_status?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
      calculate_surface_from_coordinates: {
        Args: { coordinates: Json }
        Returns: number
      }
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
      generate_ccc_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_reseller_code: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_zone_trend_data: {
        Args: { months_back?: number; zone_id_param: string }
        Returns: {
          month: string
          period_date: string
          value: number
        }[]
      }
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
    }
    Enums: {
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
      user_role: ["admin", "partner", "user"],
    },
  },
} as const
