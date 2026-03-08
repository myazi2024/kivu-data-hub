/**
 * Shared types and helpers for Land Dispute views (Admin & User)
 */
import React from 'react';

export interface LandDispute {
  id: string;
  parcel_number: string;
  reference_number: string;
  dispute_type: string;
  dispute_nature: string;
  dispute_description: string | null;
  current_status: string;
  resolution_level: string | null;
  resolution_details: string | null;
  declarant_name: string;
  declarant_phone: string | null;
  declarant_email: string | null;
  declarant_id_number?: string | null;
  declarant_quality: string;
  dispute_start_date: string | null;
  parties_involved: any;
  supporting_documents: any;
  lifting_status: string | null;
  lifting_reason: string | null;
  lifting_request_reference: string | null;
  lifting_documents: any;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Max number of parties a user can add */
export const MAX_PARTIES = 10;

/** Max description length */
export const MAX_DESCRIPTION_LENGTH = 2000;
