const express = require("express");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();



router.get("/getCampaignList/", dashboardController.getCampaignList);

router.get("/getLeadLocation/", dashboardController.getLeadLocation);

router.get("/getDashboardData/", dashboardController.getDashboardData);



module.exports = router;


