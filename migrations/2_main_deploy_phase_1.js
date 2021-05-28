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

	// set the deploy address
	console.log(chalk.yellow('===== SET THE DEPLOY ADDRESSES ====='));
	const ADMIN = accounts[0];
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];

	console.log("ADMIN is: ",ADMIN);
	console.log("COLLATERAL_CERES_AND_CERESHARES_OWNER is: ",COLLATERAL_CERES_AND_CERESHARES_OWNER);

	// set constants
	console.log(chalk.yellow('===== SET CONSTANTS ====='));
	const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
	const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
	const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
	const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
	const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
	const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
	const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);

	
	console.log("ONE_MILLION_DEC18: ",ONE_MILLION_DEC18.toString());
	console.log("FIVE_MILLION_DEC18: ",FIVE_MILLION_DEC18.toString());
	console.log("TEN_MILLION_DEC18: ",TEN_MILLION_DEC18.toString());
	console.log("ONE_HUNDRED_MILLION_DEC18: ",ONE_HUNDRED_MILLION_DEC18.toString());
	console.log("ONE_HUNDRED_MILLION_DEC6: ",ONE_HUNDRED_MILLION_DEC6.toString());
	console.log("COLLATERAL_SEED_DEC18: ",COLLATERAL_SEED_DEC18.toString());

}
