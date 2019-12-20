export class StatusError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

export class BadRequestError extends StatusError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ForbiddenError extends StatusError {
  constructor(message = 'Permission denied.') {
    super(message, 403);
  }
}

export class ReservationFailedError extends Error {
  constructor(message: string, public dates: string[]) {
    super(message);
  }
}

export class ReleaseFailedError extends Error {
  constructor(message: string, public dates: string[]) {
    super(message);
  }
}

export class ConflictError extends StatusError {
  constructor(message: string) {
    super(message, 409);
  }
}
