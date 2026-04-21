//express functions called by frontend/url mapping
const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.get("/get", userController.getUser);
router.post("/update", userController.updateUser);

module.exports = router;
