const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');

const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

// Define Contracts
const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const Babylonian = artifacts.require("Math/Babylonian");
const UQ112x112 = artifacts.require("Math/UQ112x112");
const StringHelpers = artifacts.require("Utils/StringHelpers");
const Owned = artifacts.require("Staking/Owned");

// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	const USE_MAINNET_EXISTING = true;

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

	const ADMIN = accounts[0];
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
	const OWNER = accounts[1];
	console.log(chalk.red.bold("ADMIN is: ",ADMIN));
	console.log(chalk.red.bold("OWNER is: ",OWNER));
	const account0 = accounts[0];
	const account1 = accounts[1];
	const account2 = accounts[2];
	const account3 = accounts[3];
	const account4 = accounts[4];
	const account5 = accounts[5];
	const account6 = accounts[6];
	const account7 = accounts[7];

	// set constants
	const ONE_MILLION_DEC18 = (new BigNumber("1000000e18")).toNumber();
	const FIVE_MILLION_DEC18 = (new BigNumber("5000000e18")).toNumber();
	const TEN_MILLION_DEC18 = (new BigNumber("10000000e18")).toNumber();
	const ONE_HUNDRED_MILLION_DEC18 = (new BigNumber("100000000e18")).toNumber();
	const ONE_HUNDRED_MILLION_DEC6 = (new BigNumber("100000000e6")).toNumber();
	const ONE_BILLION_DEC18 = (new BigNumber("1000000000e18")).toNumber();
	const COLLATERAL_SEED_DEC18 = (new BigNumber("508500e18")).toNumber();

	// Deploy Contracts P1 
	console.log(chalk.red('====== Deploy Contracts P1 ======='));
	await deployer.deploy(Address);
	await deployer.deploy(BlockMiner);
	await deployer.deploy(Babylonian);
	await deployer.deploy(UQ112x112);
	await deployer.deploy(StringHelpers);
	await deployer.deploy(Owned, COLLATERAL_CERES_AND_CERESHARES_OWNER);
}
