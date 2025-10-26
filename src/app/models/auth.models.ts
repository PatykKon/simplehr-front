export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  userId: number;
  username: string;
  companyId: number;
  roles: string[];
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  taxId?: string;
  companyEmail?: string;
  companyPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface RegisterResponse {
  userId: number;
  companyId: number;
  username: string;
  companyName: string;
  message: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: number;
  companyName?: string;
  roles: string[];
}