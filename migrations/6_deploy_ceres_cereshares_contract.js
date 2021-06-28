const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');

const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

const Timelock = artifacts.require("Governance/Timelock");
const MigrationHelper = artifacts.require("Utils/MigrationHelper");

const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");



// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	// Set the Network Settings
	const IS_MAINNET = (network == 'mainnet');
	const IS_ROPSTEN = (network == 'ropsten');
	const IS_DEV = (network == 'development');
	const IS_GANACHE = (network == 'devganache');
    const IS_BSC_TESTNET = (network == 'testnet');
	const IS_RINKEBY = (network == 'rinkeby');

	console.log("IS_MAINNET: ",IS_MAINNET);
	console.log("IS_ROPSTEN: ",IS_ROPSTEN);
	console.log("IS_DEV: ",IS_DEV);
	console.log("IS_GANACHE: ",IS_GANACHE);
	console.log("IS_BSC_TESTNET: ",IS_BSC_TESTNET);
	console.log("IS_RINKEBY: ",IS_RINKEBY);

	// set the deploy address
	console.log(chalk.yellow('===== SET THE DEPLOY ADDRESSES ====='));
	const ADMIN = accounts[0];
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
	console.log("ADMIN is: ",ADMIN);
	console.log("COLLATERAL_CERES_AND_CERESHARES_OWNER is: ",COLLATERAL_CERES_AND_CERESHARES_OWNER);

	// set the timelock constants
	console.log(chalk.yellow('===== Constants ====='));
	const TIMELOCK_DELAY = 300 // 5 minutes in test phrase
	console.log("TIMELOCK_DELAY: ",TIMELOCK_DELAY);



	// Deploy Timelock & MigrationHelp 
	console.log(chalk.red("======== deploy contracts TIMELOCK ==========="));
	await deployer.deploy(Timelock, ADMIN, TIMELOCK_DELAY);
	// For Test Setting 
	if (IS_DEV || IS_BSC_TESTNET || IS_ROPSTEN) {
		const TimelockTest = artifacts.require("Governance/TimelockTest");
		await deployer.deploy(TimelockTest,ADMIN,TIMELOCK_DELAY);
	}
	await deployer.deploy(MigrationHelper, ADMIN);

	// Timelock and MigrationHelper instance
	const timelockInstance = await Timelock.deployed();
	const migrationHelperInstance = await MigrationHelper.deployed();

	console.log("timelockInstance: ",timelockInstance.address);
	console.log("migrationHelperInstance: ",migrationHelperInstance.address);
	

	// CERES
	await deployer.deploy(CEREStable, "CERES", "CERES", COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address);
	const ceresInstance = await CEREStable.deployed();
	console.log("ceresInstance: ",ceresInstance.address);

	// CSS
	await deployer.deploy(CEREShares, "CERES Share", "CSS", COLLATERAL_CERES_AND_CERESHARES_OWNER, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address);
	const cssInstance = await CEREShares.deployed();
	console.log("cssInstance: ",cssInstance.address);
}
