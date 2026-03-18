import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 4000);

const server = buildServer();

server
  .listen({ host: "0.0.0.0", port })
  .then(() => {
    console.log(`API listening on http://localhost:${port}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
