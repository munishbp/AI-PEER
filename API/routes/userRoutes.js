//express functions called by frontend/url mapping
const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.post("/register", userController.registerUser);

router.get("/get", userController.getUser);

router.post("/delete", userController.deleteUser);
router.post("/update", userController.updateUser);

module.exports = router;
