const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const validateSchema = require("../validatorsJSON/dashboardValidation.json");
const dashboardService = require("../services/dashboardService");
const errors = require("../error");
const logger = require("../utils/logger");
const DecryptionService = require("../decryptionService/decryptQueryParams");
const ajv = new Ajv({ allErrors: true });
ajvFormats(ajv);
const decryptionService = new DecryptionService();

exports.getLeadLocation = async (req, res, next) => {
  try {
    //console.log("getLeadSourceScore request " + JSON.stringify(req.query) + "\n");
    logger.info(
      `[getLeadLocation Controller] Request received with query: ${JSON.stringify(
        req.query
      )}`
    );

    const validate = ajv.compile(validateSchema.definitions.leadStagesCount);
    //console.log(validate)
    const valid = validate(req.query);
    //console.log(valid)
    logger.info(
      `[getLeadLocation Controller] AJV Validation Result: ${JSON.stringify(
        valid
      )}`
    );
    if (!valid) {
      //console.log("Validate Errors " + JSON.stringify(validate.errors) + "\n");
      logger.warn(
        `[getLeadLocation Controller] Validation errors: ${JSON.stringify(
          validate.errors
        )}`
      );

      const invalidFormatError = errors.InvalidDataFormat;
      const missingFieldsError = errors.MissingRequiredFields;

      const invalidFields = validate.errors
        .filter((error) => error.keyword === "format")
        .map((error) => error.dataPath.substring(1)); // Remove the leading dot from dataPath

      if (invalidFields.length > 0) {
        const details = invalidFields.map(
          (field) => `${field} parameter should ${invalidFormatError.details}`
        );

        return res.status(invalidFormatError.statusCode).json({
          errorCode: invalidFormatError.errorCode,
          message: invalidFormatError.message,
          details: details.join(". "),
        });
      }
      const missingFields = validate.errors
        .filter((error) => error.keyword === "required")
        .map((error) => error.params.missingProperty);

      if (missingFields.length > 0) {
        return res.status(missingFieldsError.statusCode).json({
          errorCode: missingFieldsError.errorCode,
          message: `The following required fields are missing: ${missingFields.join(
            ", "
          )}`,
          details: missingFields.details,
        });
      }
    } else {
      const getCampaignRes = await dashboardService.getLeadLocationService(
        req.query
      );
      //console.log(getCampaignRes);
      logger.info(
        `[getLeadLocation Controller] Response from service: ${JSON.stringify(
          getCampaignRes
        )}`
      );
      if (typeof getCampaignRes === "string") {
        const [errorCode, createdBy] = getCampaignRes.split(": ");
        const error = errors[errorCode];
        return res.status(error.statusCode).json({
          errorCode: error.errorCode,
          message: error.message.replace("{userId}", createdBy),
          details: error.details,
        });
      }

      return res.status(201).json(getCampaignRes);
    }
  } catch (error) {
    //console.log("Error in getLeadLocation Controller :" + JSON.stringify(error));
    logger.error(
      `[getLeadLocation Controller] Internal error: ${JSON.stringify(error)}`
    );
    const internalError = errors.InternalServerError;
    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};

exports.getDashboardData = async (req, res, next) => {
  //decryption
  try {
    const encryptedData = req.query.dashboard_details;
    logger.info(
      `[getDashboardData Controller] Encrypted query: ${JSON.stringify(
        encryptedData
      )}`
    );

    let decryptedData;
    try {
      decryptedData = await decryptionService.decryptQueryParams(encryptedData);
      logger.info(
        `[getDashboardData Controller] Decrypted query: ${JSON.stringify(
          decryptedData
        )}`
      );
    } catch (decryptError) {
      logger.error(
        `[getDashboardData Controller] Decryption error: ${JSON.stringify(
          decryptError
        )}`
      );
      return res.status(400).json({
        status: "error",
        error_code: "DECRYPTION_FAILED",
        message: "Failed to decrypt dashboard details",
        details: decryptError.message,
      });
    }

    const validate = ajv.compile(validateSchema.definitions.getDashboardData);
    const valid = validate(decryptedData);
    logger.info(
      `[getDashboardData Controller] AJV Validation Result: ${JSON.stringify(
        valid
      )}`
    );

    if (!valid) {
      const invalidFormatError = errors.InvalidDataFormat;
      const missingFieldsError = errors.MissingRequiredFields;

      const invalidFields = validate.errors
        .filter((error) => error.keyword === "format")
        .map((error) => error.dataPath.substring(1)); // remove dot

      if (invalidFields.length > 0) {
        const details = invalidFields.map(
          (field) => `${field} parameter should ${invalidFormatError.details}`
        );
        return res.status(invalidFormatError.statusCode).json({
          errorCode: invalidFormatError.errorCode,
          message: invalidFormatError.message,
          details: details.join(". "),
        });
      }

      const missingFields = validate.errors
        .filter((error) => error.keyword === "required")
        .map((error) => error.params.missingProperty);

      if (missingFields.length > 0) {
        return res.status(missingFieldsError.statusCode).json({
          errorCode: missingFieldsError.errorCode,
          message: `The following required fields are missing: ${missingFields.join(
            ", "
          )}`,
          details: missingFieldsError.details,
        });
      }
    }

    // Pass decryptedData instead of req.query
    const getCampaignRes = await dashboardService.getDashboardDataService(
      decryptedData
    );
    logger.info(
      `[getDashboardData Controller] Response from getDashboardDataAPI: ${JSON.stringify(
        getCampaignRes
      )}`
    );

    if (typeof getCampaignRes === "string") {
      const [errorCode, createdBy] = getCampaignRes.split(": ");
      const error = errors[errorCode];
      return res.status(error.statusCode).json({
        errorCode: error.errorCode,
        message: error.message.replace("{userId}", createdBy),
        details: error.details,
      });
    }

    return res.status(201).json(getCampaignRes);
  } catch (error) {
    logger.error(
      `[getDashboardData Controller] Internal error: ${JSON.stringify(error)}`
    );
    const internalError = errors.InternalServerError;
    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};

exports.getCampaignList = async (req, res, next) => {
  //decryption
  try {
    const encryptedData = req.query.dashboard_camplist;
    logger.info(
      `[getCampaignList Controller] Encrypted dashboard_camplist: ${JSON.stringify(
        encryptedData
      )}`
    );

    let decryptedData;
    try {
      decryptedData = await decryptionService.decryptQueryParams(encryptedData);
      logger.info(
        `[getCampaignList Controller] Decrypted query: ${JSON.stringify(
          decryptedData
        )}`
      );
    } catch (decryptError) {
      logger.error(
        `[getCampaignList Controller] Decryption error: ${JSON.stringify(
          decryptError
        )}`
      );
      return res.status(400).json({
        status: "error",
        error_code: "DECRYPTION_FAILED",
        message: "Failed to decrypt dashboard_camplist",
        details: decryptError.message,
      });
    }

    const validate = ajv.compile(validateSchema.definitions.campaignList);
    const valid = validate(decryptedData);

    logger.info(
      `[getCampaignList Controller] AJV Validation Result: ${JSON.stringify(
        valid
      )}`
    );

    if (!valid) {
      const invalidFormatError = errors.InvalidDataFormat;
      const missingFieldsError = errors.MissingRequiredFields;

      const invalidFields = validate.errors
        .filter((error) => error.keyword === "format")
        .map((error) => error.dataPath.substring(1));

      if (invalidFields.length > 0) {
        const details = invalidFields.map(
          (field) => `${field} parameter should ${invalidFormatError.details}`
        );

        return res.status(invalidFormatError.statusCode).json({
          errorCode: invalidFormatError.errorCode,
          message: invalidFormatError.message,
          details: details.join(". "),
        });
      }

      const missingFields = validate.errors
        .filter((error) => error.keyword === "required")
        .map((error) => error.params.missingProperty);

      if (missingFields.length > 0) {
        return res.status(missingFieldsError.statusCode).json({
          errorCode: missingFieldsError.errorCode,
          message: `The following required fields are missing: ${missingFields.join(
            ", "
          )}`,
          details: missingFieldsError.details,
        });
      }
    }

    const getCampaignRes =
      await dashboardService.getDashboadCampaignListService(decryptedData);
    logger.info(
      `[getCampaignList Controller] Response from service: ${JSON.stringify(
        getCampaignRes
      )}`
    );

    if (typeof getCampaignRes === "string") {
      const [errorCode, createdBy] = getCampaignRes.split(": ");
      const error = errors[errorCode];
      return res.status(error.statusCode).json({
        errorCode: error.errorCode,
        message: error.message.replace("{userId}", createdBy),
        details: error.details,
      });
    }

    return res.status(201).json(getCampaignRes);
  } catch (error) {
    logger.error(
      `[getCampaignList Controller] Internal error: ${JSON.stringify(error)}`
    );
    const internalError = errors.InternalServerError;
    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};
