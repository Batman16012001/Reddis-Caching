const express = require("express");
const bodyParser = require("body-parser");
const dashboardRoute = require("./routes/dashboardRoute");
const reportRoute = require("./routes/reportRoute");
var cors = require("cors");
console.log("APP::::::::::");
const app = express();

const requestLogger = require("./middlewares/loggerMiddleware");
const errorHandler = require("./middlewares/errorHandler");

app.use(cors());
app.options("*", cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  // console.log(`${req.method} ${req.url}`);
  next();
});

app.use(requestLogger);
app.use(errorHandler);

app.use("/dashboard", dashboardRoute);
app.use("/report", reportRoute);

module.exports = app;
