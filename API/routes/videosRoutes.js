//express functions called by frontend/url mapping
const express = require("express");
const vidRouter = express.Router();

const videos = require("../controllers/videoController");



vidRouter.get("/getTugURL", videos.getTugURL);
vidRouter.get("/getCRiseURL", videos.getCRiseURL);
vidRouter.get("/getBalanceURL", videos.getBalanceURL);
vidRouter.get("/getAnkleURL", videos.getAnkleURL);
vidRouter.get("/getBackURL", videos.getBackURL);
vidRouter.get("/getHeadURL", videos.getHeadURL);
vidRouter.get("/getNeckURL", videos.getNeckURL);
vidRouter.get("/getTrunkURL", videos.getTrunkURL);
vidRouter.get("/getBWWalkURL", videos.getBWWalkURL);
vidRouter.get("/getHTStandURL", videos.getHTStandURL);
vidRouter.get("/getHTWalkURL", videos.getHTWalkURL);
vidRouter.get("/getHTWalkBkwdURL", videos.getHTWalkBkwdURL);
vidRouter.get("/getHWalkURL", videos.getHWalkURL);
vidRouter.get("/getKneeBendsURL", videos.getKneeBendsURL);
vidRouter.get("/getOLStandURL", videos.getOLStandURL);
vidRouter.get("/getSWWalkURL", videos.getSWWalkURL);
vidRouter.get("/getSitStandURL", videos.getSitStandURL);
vidRouter.get("/getToeWalkURL", videos.getToeWalkURL);
vidRouter.get("/getWalkTurnURL", videos.getWalkTurnURL);
vidRouter.get("/getBackKneeURL", videos.getBackKneeURL);
vidRouter.get("/getCalfRaisesURL", videos.getCalfRaisesURL);
vidRouter.get("/getFrntKneeURL", videos.getFrntKneeURL);
vidRouter.get("/getSideHipURL", videos.getSideHipURL);
vidRouter.get("/getToeRaisesURL", videos.getToeRaisesURL);

module.exports = vidRouter;
