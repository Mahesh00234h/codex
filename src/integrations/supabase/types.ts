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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          attachment_url: string | null
          consultation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          message_type: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          consultation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          consultation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          consultation_type: string
          created_at: string
          disease_detection_id: string | null
          ended_at: string | null
          farmer_id: string | null
          fee_paid: number | null
          id: string
          notes: string | null
          prescription: string | null
          rating: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          vet_id: string
        }
        Insert: {
          consultation_type?: string
          created_at?: string
          disease_detection_id?: string | null
          ended_at?: string | null
          farmer_id?: string | null
          fee_paid?: number | null
          id?: string
          notes?: string | null
          prescription?: string | null
          rating?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          vet_id: string
        }
        Update: {
          consultation_type?: string
          created_at?: string
          disease_detection_id?: string | null
          ended_at?: string | null
          farmer_id?: string | null
          fee_paid?: number | null
          id?: string
          notes?: string | null
          prescription?: string | null
          rating?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_disease_detection_id_fkey"
            columns: ["disease_detection_id"]
            isOneToOne: false
            referencedRelation: "disease_detections"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_recommendations: {
        Row: {
          created_at: string
          farm_id: string | null
          id: string
          location_data: Json | null
          recommendations: Json
          user_id: string
          weather_data: Json | null
        }
        Insert: {
          created_at?: string
          farm_id?: string | null
          id?: string
          location_data?: Json | null
          recommendations: Json
          user_id: string
          weather_data?: Json | null
        }
        Update: {
          created_at?: string
          farm_id?: string | null
          id?: string
          location_data?: Json | null
          recommendations?: Json
          user_id?: string
          weather_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_recommendations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_locations: {
        Row: {
          delivery_partner_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          order_id: string
          speed: number | null
          updated_at: string
        }
        Insert: {
          delivery_partner_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          order_id: string
          speed?: number | null
          updated_at?: string
        }
        Update: {
          delivery_partner_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          order_id?: string
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_offers: {
        Row: {
          created_at: string
          distance_km: number
          estimated_earnings: number
          expires_at: string
          id: string
          order_id: string
          partner_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          distance_km: number
          estimated_earnings: number
          expires_at?: string
          id?: string
          order_id: string
          partner_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          estimated_earnings?: number
          expires_at?: string
          id?: string
          order_id?: string
          partner_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      delivery_partner_presence: {
        Row: {
          id: string
          is_online: boolean
          latitude: number | null
          longitude: number | null
          partner_id: string
          radius_km: number
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          latitude?: number | null
          longitude?: number | null
          partner_id: string
          radius_km?: number
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          id?: string
          is_online?: boolean
          latitude?: number | null
          longitude?: number | null
          partner_id?: string
          radius_km?: number
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      delivery_ratings: {
        Row: {
          comment: string | null
          created_at: string
          delivery_partner_id: string
          id: string
          order_id: string
          rated_by: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_partner_id: string
          id?: string
          order_id: string
          rated_by: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_partner_id?: string
          id?: string
          order_id?: string
          rated_by?: string
          rating?: number
        }
        Relationships: []
      }
      disease_detections: {
        Row: {
          ai_response: Json | null
          confidence_score: number | null
          created_at: string
          disease_name: string | null
          escalated_to_vet: boolean | null
          farm_id: string | null
          id: string
          image_url: string | null
          severity: string | null
          user_id: string
          vet_id: string | null
        }
        Insert: {
          ai_response?: Json | null
          confidence_score?: number | null
          created_at?: string
          disease_name?: string | null
          escalated_to_vet?: boolean | null
          farm_id?: string | null
          id?: string
          image_url?: string | null
          severity?: string | null
          user_id: string
          vet_id?: string | null
        }
        Update: {
          ai_response?: Json | null
          confidence_score?: number | null
          created_at?: string
          disease_name?: string | null
          escalated_to_vet?: boolean | null
          farm_id?: string | null
          id?: string
          image_url?: string | null
          severity?: string | null
          user_id?: string
          vet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disease_detections_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          attempts: number
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
          purpose: string
          user_id: string
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          otp_hash: string
          purpose?: string
          user_id: string
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      equipment_bookings: {
        Row: {
          created_at: string
          end_date: string
          id: string
          notes: string | null
          rental_id: string
          renter_id: string
          start_date: string
          status: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          rental_id: string
          renter_id: string
          start_date: string
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          rental_id?: string
          renter_id?: string
          start_date?: string
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_bookings_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "equipment_rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rentals: {
        Row: {
          category: string
          created_at: string
          daily_rate: number
          description: string | null
          id: string
          images: Json | null
          is_available: boolean | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          daily_rate?: number
          description?: string | null
          id?: string
          images?: Json | null
          is_available?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          daily_rate?: number
          description?: string | null
          id?: string
          images?: Json | null
          is_available?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      farmer_trades: {
        Row: {
          buyer_id: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          price_per_unit: number
          product_name: string
          quantity: number
          seller_id: string
          status: string
          total_price: number
          unit: string
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          price_per_unit: number
          product_name: string
          quantity: number
          seller_id: string
          status?: string
          total_price: number
          unit?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          price_per_unit?: number
          product_name?: string
          quantity?: number
          seller_id?: string
          status?: string
          total_price?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      farms: {
        Row: {
          area_acres: number
          coordinates: Json
          created_at: string
          id: string
          location_address: string | null
          name: string
          soil_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_acres: number
          coordinates: Json
          created_at?: string
          id?: string
          location_address?: string | null
          name: string
          soil_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_acres?: number
          coordinates?: Json
          created_at?: string
          id?: string
          location_address?: string | null
          name?: string
          soil_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          breakdown: Json | null
          buyer_id: string
          created_at: string
          delivery_fee: number
          id: string
          invoice_number: string
          order_id: string
          payment_method: string
          platform_fee: number
          seller_id: string | null
          seller_payout: number
          subtotal: number
          total: number
        }
        Insert: {
          breakdown?: Json | null
          buyer_id: string
          created_at?: string
          delivery_fee?: number
          id?: string
          invoice_number: string
          order_id: string
          payment_method: string
          platform_fee?: number
          seller_id?: string | null
          seller_payout?: number
          subtotal: number
          total: number
        }
        Update: {
          breakdown?: Json | null
          buyer_id?: string
          created_at?: string
          delivery_fee?: number
          id?: string
          invoice_number?: string
          order_id?: string
          payment_method?: string
          platform_fee?: number
          seller_id?: string | null
          seller_payout?: number
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          frequency: string
          id: string
          last_digest_at: string | null
          smart_suggestions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          last_digest_at?: string | null
          smart_suggestions?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          last_digest_at?: string | null
          smart_suggestions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          notification_type?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string | null
          created_at: string
          delivery_address: string
          delivery_coordinates: Json | null
          delivery_fee: number
          delivery_partner_id: string | null
          id: string
          payment_method: string
          payment_status: string
          platform_fee: number
          product_id: string | null
          quantity: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          seller_id: string | null
          seller_payout: number
          status: string
          subtotal: number | null
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          delivery_address: string
          delivery_coordinates?: Json | null
          delivery_fee?: number
          delivery_partner_id?: string | null
          id?: string
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          product_id?: string | null
          quantity: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          seller_id?: string | null
          seller_payout?: number
          status?: string
          subtotal?: number | null
          total_price: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          delivery_address?: string
          delivery_coordinates?: Json | null
          delivery_fee?: number
          delivery_partner_id?: string | null
          id?: string
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          product_id?: string | null
          quantity?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          seller_id?: string | null
          seller_payout?: number
          status?: string
          subtotal?: number | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          created_at: string
          farmer_id: string
          id: string
          message: string | null
          retailer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_id: string
          id?: string
          message?: string | null
          retailer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_id?: string
          id?: string
          message?: string | null
          retailer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          currency: string
          delivery_fee: number
          id: string
          method: string | null
          notes: Json | null
          order_id: string
          platform_fee: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          seller_id: string | null
          seller_payout: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string
          delivery_fee?: number
          id?: string
          method?: string | null
          notes?: Json | null
          order_id: string
          platform_fee?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          seller_id?: string | null
          seller_payout?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          delivery_fee?: number
          id?: string
          method?: string | null
          notes?: Json | null
          order_id?: string
          platform_fee?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          seller_id?: string | null
          seller_payout?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          product_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          farmer_id: string
          id: string
          images: Json | null
          is_available: boolean | null
          is_verified: boolean | null
          name: string
          price: number
          quality_score: number | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          farmer_id: string
          id?: string
          images?: Json | null
          is_available?: boolean | null
          is_verified?: boolean | null
          name: string
          price: number
          quality_score?: number | null
          quantity: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          farmer_id?: string
          id?: string
          images?: Json | null
          is_available?: boolean | null
          is_verified?: boolean | null
          name?: string
          price?: number
          quality_score?: number | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_verified: boolean | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_verified?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_verified?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retailer_inventory: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          current_stock: number
          id: string
          last_restocked: string | null
          max_stock: number
          min_stock: number
          name: string
          retailer_id: string
          selling_price: number
          trend: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_price?: number
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked?: string | null
          max_stock?: number
          min_stock?: number
          name: string
          retailer_id: string
          selling_price?: number
          trend?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked?: string | null
          max_stock?: number
          min_stock?: number
          name?: string
          retailer_id?: string
          selling_price?: number
          trend?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      suggestion_interactions: {
        Row: {
          action: string
          created_at: string
          id: string
          notification_id: string | null
          score: number | null
          suggestion_type: string
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notification_id?: string | null
          score?: number | null
          suggestion_type?: string
          title?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notification_id?: string | null
          score?: number | null
          suggestion_type?: string
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vet_profiles: {
        Row: {
          certificate_url: string | null
          consultation_fee: number | null
          created_at: string
          experience_years: number | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          license_number: string
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          rating: number | null
          specialization: string | null
          total_consultations: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          consultation_fee?: number | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          license_number: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          rating?: number | null
          specialization?: string | null
          total_consultations?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          consultation_fee?: number | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          license_number?: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          rating?: number | null
          specialization?: string | null
          total_consultations?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "farmer"
        | "veterinary"
        | "consumer"
        | "retailer"
        | "delivery"
        | "admin"
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
        "farmer",
        "veterinary",
        "consumer",
        "retailer",
        "delivery",
        "admin",
      ],
    },
  },
} as const
