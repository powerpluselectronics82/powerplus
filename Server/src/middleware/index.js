const auth = require("./auth");
const roles = require("./roleMiddleware");

module.exports = {
  auth,
  ...roles,
};
