//express route for LLM model download URL
const express = require("express");
const router = express.Router();

const model = require("../controllers/modelController");

router.get("/getModelURL", model.getModelURL);

module.exports = router;
