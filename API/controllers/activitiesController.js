const activityService = require("../services/firestore-functions");

/**
 * controller layer for per-user exercise activity records.
 * the auth middleware (mounted in server.js before this router) attaches
 * the verified Firebase token to req.user, so the userId always comes from
 * the token — never from body params, which would let any caller write
 * activities into another user's history.
 */

// minimal shape validation. we don't enforce every optional field — angles
// and feedback events are added incrementally in later phases — but the
// fields below are load-bearing for the activity history UI and must exist.
function validateActivityRecord(record) {
  if (!record || typeof record !== 'object') return 'body must be a JSON object';
  if (typeof record.id !== 'string' || !record.id) return 'id is required (string)';
  if (typeof record.exerciseId !== 'string' || !record.exerciseId) return 'exerciseId is required';
  if (typeof record.exerciseName !== 'string') return 'exerciseName is required';
  if (typeof record.category !== 'string') return 'category is required';
  if (typeof record.completedAt !== 'string') return 'completedAt is required (ISO string)';
  if (typeof record.setsCompleted !== 'number') return 'setsCompleted is required (number)';
  if (typeof record.setsTarget !== 'number') return 'setsTarget is required (number)';
  if (typeof record.durationSec !== 'number') return 'durationSec is required (number)';
  if (typeof record.totalReps !== 'number') return 'totalReps is required (number)';
  if (!Array.isArray(record.repsPerSet)) return 'repsPerSet must be an array';
  if (typeof record.unilateral !== 'boolean') return 'unilateral must be a boolean';
  return null;
}

// POST /activities/complete — write a completed activity to the user's history
exports.submitActivity = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No verified user on request',
      });
    }

    const record = req.body;
    const validationError = validateActivityRecord(record);
    if (validationError) {
      return res.status(400).json({
        error: 'Invalid activity record',
        message: validationError,
      });
    }

    await activityService.writeUserActivity(userId, record);

    res.status(201).json({
      success: true,
      activityId: record.id,
    });
  } catch (error) {
    console.error('Error submitting activity:', error);
    res.status(500).json({
      error: 'Failed to submit activity',
      message: error.message,
    });
  }
};

// GET /activities/list — return the authenticated user's full activity history
exports.getActivities = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No verified user on request',
      });
    }

    const activities = await activityService.getUserActivities(userId);

    res.status(200).json({
      activities,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      error: 'Failed to fetch activities',
      message: error.message,
    });
  }
};
