const userService = require("../services/firestore-functions");

// user identity always comes from the verified Firebase token attached by
// authMiddleware (req.user.uid). never trust id from query/body — that was
// an IDOR vector where any logged-in caller could read or update any other
// user's record. /register and /delete used to live here; registration is
// handled by /auth/send-code?mode=create and account deletion is not a
// user-facing feature today.

exports.getUser = async (req, res) => {
  try {
    const id = req.user?.uid;
    if (!id) return res.status(401).json({ error: "Unauthorized" });

    const result = await userService.readId(id);

    res.status(200).json({
      message: "User retrieved successfully",
      user: result ? result.data() : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = req.user?.uid;
    if (!id) return res.status(401).json({ error: "Unauthorized" });

    // strip any client-supplied id so a caller can't rename the target doc
    const { id: _ignored, ...patch } = req.body ?? {};

    await userService.updateUser(id, patch);

    res.status(200).json({
      message: "User updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
