export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

// For limits enforced in a service rather than by the rate-limit middleware
// — per-account cooldowns, guess caps — where the right answer is still
// "you're doing that too often", not "you got it wrong".
export class TooManyRequestsError extends AppError {
  constructor(message: string) {
    super(429, message);
  }
}
