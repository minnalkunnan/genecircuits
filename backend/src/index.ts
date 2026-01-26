// backend/src/index.ts
import { startServer } from "./server";

const port = Number(process.env.PORT ?? "3001");
startServer(port);
