const logger = require("../utils/logger");

// const requestLogger = (req, res, next) => {
//   logger.info(
//     `Incoming request: ${req.method} ${req.url} - Body: ${JSON.stringify(
//       req.body
//     )}`
//   );
//   next();
// };

const requestLogger = (req, res, next) => {
  const { method, url, query, params, body } = req;

  logger.info(
    `Incoming Request → Method: ${method}, URL: ${url}, Query: ${JSON.stringify(
      query
    )}, Params: ${JSON.stringify(params)}, Body: ${JSON.stringify(body)}`
  );

  next();
};

// const requestLogger = (req, res, next) => {
//     const { method, url, body, query, headers } = req;

//     logger.info({
//       message: "Incoming request",
//       method,
//       url,
//       headers: {
//         "user-agent": headers["user-agent"],
//         authorization: headers.authorization ? "******" : undefined,
//       },
//       query,
//       body: JSON.stringify(body),
//     });

//     next();
//   };

module.exports = requestLogger;
