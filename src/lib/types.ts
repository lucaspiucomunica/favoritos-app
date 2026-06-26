export type AiStatus = 'pending' | 'done' | 'failed';

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Link = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  category_id: string | null;
  tags: string[];
  is_read: boolean;
  is_favorite: boolean;
  ai_status: AiStatus;
  ai_error: string | null;
  created_at: string;
  updated_at: string;
};
