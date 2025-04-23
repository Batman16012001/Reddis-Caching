const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

const logFormat = format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Ensure logs directory exists
const logDir = path.join(__dirname, "../logs");
const fs = require("fs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const transport = new transports.DailyRotateFile({
  filename: path.join(logDir, "DashboardReport-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "10m",
  maxFiles: "14d",
});

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json(), logFormat),
  transports: [transport, new transports.Console()],
});

module.exports = logger;
