export class AppError extends Error {
  constructor(public code: string, public httpStatus = 400, message?: string) {
    super(message ?? code);
  }
}
