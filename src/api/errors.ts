export class ApiError extends Error {
  readonly statusCode?: number;
  readonly data?: unknown;
  readonly errorCode?: string;

  constructor(
    message: string,
    statusCode?: number,
    data?: unknown,
    errorCode?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
    this.errorCode = errorCode;
  }
}

export function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
