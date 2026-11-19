const isCoordinate = (value, limit) =>
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
  Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;

const isText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function workflowError(res, error) {
  const statuses = { P0002: 404, '42501': 403, '23505': 409, '23514': 409, '22023': 400 };
  const status = statuses[error.code] || 500;
  if (status === 500) console.error('Workflow failed:', error.message);
  return res.status(status).json({ error: status === 500 ? 'Could not save this change. Please try again.' : error.message });
}

module.exports = { isCoordinate, isText, isUuid, workflowError };
