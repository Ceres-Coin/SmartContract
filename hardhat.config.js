/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomiclabs/hardhat-truffle5");

module.exports = {
  solidity: "0.6.12",
  networks: {
    hardhat: {
			host: "127.0.0.1",
			port: 8545,
			network_id: "31337",
			blockGasLimit: 8000000,
      gas: 8000000,
      gasPrice: 20000000000,
      gasLimit: 8000000
		}
  }
};
