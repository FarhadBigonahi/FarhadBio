// One error shape for the whole API: { error: { code, message } }.
//
// A stable machine-readable `code` means the frontend can branch on failures
// without string-matching English prose, and prose can change freely.
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (msg: string, code = "BAD_REQUEST") =>
  new HttpError(400, code, msg);

export const unauthorized = (msg = "Authentication required.") =>
  new HttpError(401, "UNAUTHORIZED", msg);

export const notFound = (msg = "Not found.") =>
  new HttpError(404, "NOT_FOUND", msg);

export const conflict = (msg: string, code = "CONFLICT") =>
  new HttpError(409, code, msg);
