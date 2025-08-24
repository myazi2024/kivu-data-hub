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
          created_at: string
          current_owner_legal_status: string | null
          current_owner_name: string
          current_owner_since: string
          gps_coordinates: Json | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          parcel_number: string
          parcel_type: string
          property_title_type: string
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          area_sqm?: number
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name: string
          current_owner_since?: string
          gps_coordinates?: Json | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          parcel_number: string
          parcel_type: string
          property_title_type?: string
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          area_sqm?: number
          created_at?: string
          current_owner_legal_status?: string | null
          current_owner_name?: string
          current_owner_since?: string
          gps_coordinates?: Json | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          parcel_number?: string
          parcel_type?: string
          property_title_type?: string
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
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
