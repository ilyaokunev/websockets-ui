import { httpServer } from "./src/http_server/index.js";
import dotenv from "dotenv";
import './src/ws_server/index.js';
import './src/db/index.js';

dotenv.config();

const HTTP_PORT = process.env.HTTP_PORT || 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);