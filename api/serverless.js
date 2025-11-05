const { createRequestHandler } = require("@react-router/express");
const express = require("express");
const app = express();

app.all("*", createRequestHandler({ build: require("../build") }));

module.exports = app;
