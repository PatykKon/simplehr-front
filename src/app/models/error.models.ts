export interface ErrorResponse {
  code: string; // e.g., BAD_REQUEST, CONFLICT, FORBIDDEN, NOT_FOUND, INTERNAL_ERROR
  message: string;
  path?: string | null;
  correlationId?: string | null;
  details?: any; // could be map of field -> message for validation errors
}
