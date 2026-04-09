//express functions called by frontend/url mapping
const express = require("express");
const actRouter = express.Router();

const activities = require("../controllers/activitiesController");

actRouter.post("/complete", activities.submitActivity);
actRouter.get("/list", activities.getActivities);

module.exports = actRouter;
