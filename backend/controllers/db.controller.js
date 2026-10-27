import { checkDBConnection } from '../config/db.js';
import { getCurrentDateTime } from '../utils/dateTime.js';

export async function getDBStatus(req, res) {
  const { connected, message } = await checkDBConnection();
  res.status(connected ? 200 : 503).json({
    connected,
    message,
    checkedAt: getCurrentDateTime().readable,
  });
}
