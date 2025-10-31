// Users search contracts for admin employee list
export interface UserSearchItem {
  user_id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: string[];    // e.g. ['ROLE_USER','ROLE_MANAGER']
  enabled: boolean;   // account status
  created_at: string; // ISO DateTime
}

export interface UserPageResponse {
  items: UserSearchItem[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  sort?: string;
}
