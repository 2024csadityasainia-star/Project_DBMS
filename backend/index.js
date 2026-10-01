const { port } = require("./config/env");
const app = require("./app");
const { ensureDemoUser } = require("./utilities/dbInit");

ensureDemoUser()
  .then(() => {
    app.listen(port, () => {
      console.log(`NutriTrack running at http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error("Could not start NutriTrack:", error.message);
    process.exit(1);
  });
