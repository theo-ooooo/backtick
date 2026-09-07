export interface ApiResponse<T> {
  status: number;
  data: T;
}

export interface ApiErrorResponse extends ApiResponse<null> {
  message: string | string[];
}
