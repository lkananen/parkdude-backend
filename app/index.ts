// Note: Only used in local development

import { createApp } from "./app";

const port = process.env.PORT || 3000;

(async () => {
  const app = await createApp();
  app.listen(port);
  console.log(`Listening on port ${port}.`);
})();
