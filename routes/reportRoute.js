const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/getReportData/", reportController.getReportData);

router.get("/getReportCampaignList/", reportController.getCampaignList);

router.get("/getReportGroupList/", reportController.getGroupList);

router.get("/getReportBranchList/", reportController.getBranchList);

router.get("/getReportUnitList/", reportController.getUnitList);

module.exports = router;
