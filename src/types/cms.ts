export interface CMSContent {
  id: string;
  page_slug: string;
  content_key: string;
  content_type: string;
  content_value: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  meta_data?: any;
}

export interface SEOData {
  id: string;
  page_slug: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots_meta: string;
  schema_markup?: any;
}

export interface PageContent {
  [key: string]: CMSContent;
}

export interface ContentType {
  value: string;
  label: string;
  icon: any;
  color: string;
}

export interface PageInfo {
  value: string;
  label: string;
  icon: any;
  color: string;
}

export interface ContentStats {
  total: number;
  active: number;
}

export interface CMSError {
  message: string;
  code?: string;
  field?: string;
}