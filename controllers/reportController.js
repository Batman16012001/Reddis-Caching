const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const validateSchema = require("../validatorsJSON/reportValidation.json");
const reportService = require("../services/reportService");
const errors = require("../error");

const ajv = new Ajv({ allErrors: true });
ajvFormats(ajv);
const DecryptionService = require("../decryptionService/decryptQueryParams");
const decryptionService = new DecryptionService();

const logger = require("../utils/logger");

// exports.getReportData = async (req, res, next) => {  //without decryption
//   try {
//     logger.info(
//       `[getReportData] Request received with query: ${JSON.stringify(
//         req.query
//       )}`
//     );

//     const validate = ajv.compile(validateSchema.definitions.reportInput);
//     const valid = validate(req.query);

//     logger.info(`[getReportData] Validation result: ${valid}`);

//     if (!valid) {
//       logger.warn(
//         `[getReportData] Validation errors: ${JSON.stringify(validate.errors)}`
//       );

//       const invalidFormatError = errors.InvalidDataFormat;
//       const missingFieldsError = errors.MissingRequiredFields;

//       const invalidFields = validate.errors
//         .filter((error) => error.keyword === "format")
//         .map((error) => error.dataPath.substring(1));

//       if (invalidFields.length > 0) {
//         const details = invalidFields.map(
//           (field) => `${field} parameter ${invalidFormatError.details}`
//         );

//         logger.warn(
//           `[getReportData] Invalid format fields: ${invalidFields.join(", ")}`
//         );

//         return res.status(invalidFormatError.statusCode).json({
//           errorCode: invalidFormatError.errorCode,
//           message: invalidFormatError.message,
//           details: details.join(". "),
//         });
//       }

//       const missingFields = validate.errors
//         .filter((error) => error.keyword === "required")
//         .map((error) => error.params.missingProperty);

//       if (missingFields.length > 0) {
//         logger.warn(
//           `[getReportData] Missing required fields: ${missingFields.join(", ")}`
//         );

//         return res.status(missingFieldsError.statusCode).json({
//           errorCode: missingFieldsError.errorCode,
//           message: `The following required fields are missing: ${missingFields.join(
//             ", "
//           )}`,
//           details: missingFields.details,
//         });
//       }
//     } else {
//       const getCampaignRes = await reportService.getReportDataService(
//         req.query
//       );
//       logger.info(
//         `[getReportData] Service response: ${JSON.stringify(getCampaignRes)}`
//       );

//       if (typeof getCampaignRes === "string") {
//         const [errorCode, createdBy] = getCampaignRes.split(": ");
//         const error = errors[errorCode];

//         logger.error(
//           `[getReportData] Error from service: ${errorCode} by ${createdBy}`
//         );

//         return res.status(error.statusCode).json({
//           errorCode: error.errorCode,
//           message: error.message.replace("{userId}", createdBy),
//           details: error.details,
//         });
//       }

//       return res.status(201).json(getCampaignRes);
//     }
//   } catch (error) {
//     logger.error(`[getReportData] Internal error: ${JSON.stringify(error)}`);
//     const internalError = errors.InternalServerError;

//     return res.status(internalError.statusCode).json({
//       errorCode: internalError.errorCode,
//       message: internalError.message,
//       details: internalError.details,
//     });
//   }
// };

exports.getReportData = async (req, res, next) => {
  // with decryption
  try {
    const encryptedData = req.query.report_details;
    logger.info(
      `[getReportData] Encrypted query: ${JSON.stringify(encryptedData)}`
    );

    let decryptedData;
    try {
      decryptedData = await decryptionService.decryptQueryParams(encryptedData);
      logger.info(
        `[getReportData] Decrypted query: ${JSON.stringify(decryptedData)}`
      );
    } catch (decryptError) {
      logger.error(
        `[getReportData] Decryption error: ${JSON.stringify(decryptError)}`
      );
      return res.status(400).json({
        status: "error",
        error_code: "DECRYPTION_FAILED",
        message: "Failed to decrypt report data",
        details: decryptError.message,
      });
    }

    // ✅ Validate decrypted data
    const validate = ajv.compile(validateSchema.definitions.reportInput);
    const valid = validate(decryptedData);

    logger.info(`[getReportData] Validation result: ${valid}`);

    if (!valid) {
      logger.warn(
        `[getReportData] Validation errors: ${JSON.stringify(validate.errors)}`
      );

      const invalidFormatError = errors.InvalidDataFormat;
      const missingFieldsError = errors.MissingRequiredFields;

      const invalidFields = validate.errors
        .filter((error) => error.keyword === "format")
        .map((error) => error.dataPath.substring(1));

      if (invalidFields.length > 0) {
        const details = invalidFields.map(
          (field) => `${field} parameter ${invalidFormatError.details}`
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

    // ✅ Call service with decrypted data
    const getCampaignRes = await reportService.getReportDataService(
      decryptedData
    );
    logger.info(
      `[getReportData] Service response: ${JSON.stringify(getCampaignRes)}`
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
    logger.error(`[getReportData] Internal error: ${JSON.stringify(error)}`);
    const internalError = errors.InternalServerError;
    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};

// exports.getCampaignList = async (req, res, next) => {
//   // without decryption
//   try {
//     logger.info(
//       `[getCampaignList] Request received with query: ${JSON.stringify(
//         req.query
//       )}`
//     );

//     const validate = ajv.compile(validateSchema.definitions.campaignList);
//     const valid = validate(req.query);

//     logger.info(`[getCampaignList] Validation result: ${valid}`);

//     if (!valid) {
//       logger.warn(
//         `[getCampaignList] Validation errors: ${JSON.stringify(
//           validate.errors
//         )}`
//       );

//       const invalidFormatError = errors.InvalidDataFormat;
//       const missingFieldsError = errors.MissingRequiredFields;

//       const invalidFields = validate.errors
//         .filter((error) => error.keyword === "format")
//         .map((error) => error.dataPath.substring(1));

//       if (invalidFields.length > 0) {
//         const details = invalidFields.map(
//           (field) => `${field} parameter should ${invalidFormatError.details}`
//         );

//         logger.warn(
//           `[getCampaignList] Invalid format fields: ${invalidFields.join(", ")}`
//         );

//         return res.status(invalidFormatError.statusCode).json({
//           errorCode: invalidFormatError.errorCode,
//           message: invalidFormatError.message,
//           details: details.join(". "),
//         });
//       }

//       const missingFields = validate.errors
//         .filter((error) => error.keyword === "required")
//         .map((error) => error.params.missingProperty);

//       if (missingFields.length > 0) {
//         logger.warn(
//           `[getCampaignList] Missing required fields: ${missingFields.join(
//             ", "
//           )}`
//         );

//         return res.status(missingFieldsError.statusCode).json({
//           errorCode: missingFieldsError.errorCode,
//           message: `The following required fields are missing: ${missingFields.join(
//             ", "
//           )}`,
//           details: missingFields.details,
//         });
//       }
//     } else {
//       const getCampaignRes = await reportService.getCampaignListService(
//         req.query
//       );
//       logger.info(
//         `[getCampaignList] Service response: ${JSON.stringify(getCampaignRes)}`
//       );

//       if (typeof getCampaignRes === "string") {
//         const [errorCode, createdBy] = getCampaignRes.split(": ");
//         const error = errors[errorCode];

//         logger.error(
//           `[getCampaignList] Error from service: ${errorCode} by ${createdBy}`
//         );

//         return res.status(error.statusCode).json({
//           errorCode: error.errorCode,
//           message: error.message.replace("{userId}", createdBy),
//           details: error.details,
//         });
//       }

//       return res.status(201).json(getCampaignRes);
//     }
//   } catch (error) {
//     logger.error(`[getCampaignList] Internal error: ${JSON.stringify(error)}`);
//     const internalError = errors.InternalServerError;

//     return res.status(internalError.statusCode).json({
//       errorCode: internalError.errorCode,
//       message: internalError.message,
//       details: internalError.details,
//     });
//   }
// };

exports.getCampaignList = async (req, res, next) => {
  try {
    logger.info(
      `[getCampaignList] Raw query received: ${JSON.stringify(req.query)}`
    );

    // Step 1: Extract and decrypt the campaign_details param
    const encryptedData = req.query.campaign_details;
    console.log("Encrypted data for getCampaignList::", encryptedData);

    if (!encryptedData) {
      return res.status(400).json({
        errorCode: "MISSING_ENCRYPTED_QUERY",
        message: "Encrypted query param 'campaign_details' is required",
        details: "Missing 'campaign_details' in query string",
      });
    }

    const decryptedQuery = await decryptionService.decryptQueryParams(
      encryptedData
    );

    logger.info(
      `[getCampaignList] Decrypted query: ${JSON.stringify(decryptedQuery)}`
    );

    // Step 2: Validate decrypted query
    const validate = ajv.compile(validateSchema.definitions.campaignList);
    const valid = validate(decryptedQuery);

    logger.info(`[getCampaignList] Validation result: ${valid}`);

    if (!valid) {
      logger.warn(
        `[getCampaignList] Validation errors: ${JSON.stringify(
          validate.errors
        )}`
      );

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
          details: missingFields.details,
        });
      }
    }

    // Step 3: Pass decrypted data to service
    const getCampaignRes = await reportService.getCampaignListService(
      decryptedQuery
    );

    logger.info(
      `[getCampaignList] Service response: ${JSON.stringify(getCampaignRes)}`
    );

    if (typeof getCampaignRes === "string") {
      const [errorCode, createdBy] = getCampaignRes.split(": ");
      const error = errors[errorCode];

      logger.error(
        `[getCampaignList] Error from service: ${errorCode} by ${createdBy}`
      );

      return res.status(error.statusCode).json({
        errorCode: error.errorCode,
        message: error.message.replace("{userId}", createdBy),
        details: error.details,
      });
    }

    return res.status(201).json(getCampaignRes);
  } catch (error) {
    logger.error(`[getCampaignList] Internal error: ${JSON.stringify(error)}`);
    const internalError = errors.InternalServerError;

    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};
exports.getGroupList = async (req, res, next) => {
  try {
    logger.info(
      `getGroupList → Incoming Request: ${JSON.stringify(req.query)}`
    );

    const getGroupRes = await reportService.getGroupListService(req.query);

    if (typeof getGroupRes === "string") {
      const [errorCode, createdBy] = getGroupRes.split(": ");
      const error = errors[errorCode];
      logger.warn(
        `getGroupList → Service returned error: ${errorCode}, createdBy: ${createdBy}`
      );
      return res.status(error.statusCode).json({
        errorCode: error.errorCode,
        message: error.message.replace("{userId}", createdBy),
        details: error.details,
      });
    }

    logger.info(`getGroupList → Success Response`);
    return res.status(201).json(getGroupRes);
  } catch (error) {
    logger.error(`getGroupList → Exception: ${JSON.stringify(error)}`);
    const internalError = errors.InternalServerError;
    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};

exports.getBranchList = async (req, res, next) => {
  try {
    logger.info(
      `getBranchList → Incoming Request: ${JSON.stringify(req.query)}`
    );

    const validate = ajv.compile(validateSchema.definitions.branchList);
    const valid = validate(req.query);

    if (!valid) {
      logger.warn(
        `getBranchList → Validation failed: ${JSON.stringify(validate.errors)}`
      );

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
          details: missingFields.details,
        });
      }
    } else {
      const getBranchRes = await reportService.getBranchListService(req.query);

      if (typeof getBranchRes === "string") {
        const [errorCode, createdBy] = getBranchRes.split(": ");
        const error = errors[errorCode];
        logger.warn(
          `getBranchList → Service returned error: ${errorCode}, createdBy: ${createdBy}`
        );
        return res.status(error.statusCode).json({
          errorCode: error.errorCode,
          message: error.message.replace("{userId}", createdBy),
          details: error.details,
        });
      }

      logger.info(`getBranchList → Success Response`);
      return res.status(201).json(getBranchRes);
    }
  } catch (error) {
    logger.error(`getBranchList → Exception: ${JSON.stringify(error)}`);
    const internalError = errors.InternalServerError;
    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};

exports.getUnitList = async (req, res, next) => {
  try {
    logger.info(`getUnitList → Incoming Request: ${JSON.stringify(req.query)}`);

    const validate = ajv.compile(validateSchema.definitions.unitList);
    const valid = validate(req.query);

    if (!valid) {
      logger.warn(
        `getUnitList → Validation failed: ${JSON.stringify(validate.errors)}`
      );

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
          details: missingFields.details,
        });
      }
    } else {
      const getUnitRes = await reportService.getUnitListService(req.query);

      if (typeof getUnitRes === "string") {
        const [errorCode, createdBy] = getUnitRes.split(": ");
        const error = errors[errorCode];
        logger.warn(
          `getUnitList → Service returned error: ${errorCode}, createdBy: ${createdBy}`
        );
        return res.status(error.statusCode).json({
          errorCode: error.errorCode,
          message: error.message.replace("{userId}", createdBy),
          details: error.details,
        });
      }

      logger.info(`getUnitList → Success Response`);
      return res.status(201).json(getUnitRes);
    }
  } catch (error) {
    logger.error(`getUnitList → Exception: ${JSON.stringify(error)}`);
    const internalError = errors.InternalServerError;
    return res.status(internalError.statusCode).json({
      errorCode: internalError.errorCode,
      message: internalError.message,
      details: internalError.details,
    });
  }
};
