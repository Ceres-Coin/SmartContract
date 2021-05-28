const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');

const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');


// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	const USE_MAINNET_EXISTING = true;
	const IS_MAINNET = (process.env.MIGRATION_MODE == 'mainnet');
	const IS_ROPSTEN = (process.env.MIGRATION_MODE == 'ropsten');

	console.log("IS_MAINNET: ",IS_MAINNET);
	console.log("IS_ROPSTEN: ",IS_ROPSTEN);

}
