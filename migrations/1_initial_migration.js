// const Migrations = artifacts.require("Migrations");

// module.exports = function (deployer) {
//   deployer.deploy(Migrations);
// };

const Migrations = artifacts.require("Migrations");

module.exports = function(deployer, network, accounts) {

  console.log("ACCOUNTS");
  console.log(accounts);

  deployer.deploy(Migrations);
};

