import { createRequestHandler } from "@react-router/express";
import express from "express";
import * as build from "../build/server/index.js";

const app = express();

app.all("*", createRequestHandler({ build }));

export default app;
