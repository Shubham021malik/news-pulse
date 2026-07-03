import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import logger from "./utils/logger";

const PORT = parseInt(process.env.PORT || "4000", 10);

createApp().listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});
