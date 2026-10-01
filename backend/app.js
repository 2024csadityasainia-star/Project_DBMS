const path = require("path");
const express = require("express");
const cors = require("cors");

const { frontendDir } = require("./config/env");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(frontendDir));

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.htm"));
});

app.use(errorHandler);

module.exports = app;
