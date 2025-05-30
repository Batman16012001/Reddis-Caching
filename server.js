const app = require("./app");
require('dotenv').config();
const debug = require("debug")("node-angular");
const http = require("http");

const normalizePort = val => {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

const onError = error => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + port;
  switch (error.code) {
    case "EACCES":
      console.log(JSON.stringify(bind) + "requires elevated privileges " +  "\n");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.log(JSON.stringify(bind) + "is already in use " +  "\n");

      process.exit(1);
      break;
    default:
      throw error;
  }
};


const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + port;
  debug("Listening on " + bind);
};




const port = normalizePort(process.env.PORT);
app.set("port", port);
console.log("Port number :: " + JSON.stringify(port));
const server = http.createServer(app);
server.on("error", onError);
server.on("listening", onListening);
server.listen(port);
console.log("started::::::::::");