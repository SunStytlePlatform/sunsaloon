export function sendSuccess(res, { status = 200, message = 'Request completed successfully', data = null } = {}) {
  return res.status(status).json({ success: true, message, data });
}

export function errorBody(message, code, { details, requestId } = {}) {
  const error = { code };
  if (details !== undefined) error.details = details;
  if (requestId) error.requestId = requestId;
  return { success: false, message, error };
}
