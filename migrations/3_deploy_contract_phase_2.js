const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const BigNumber = require('bignumber.js');
const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

// Defin Contracts
const FixedPoint = artifacts.require("Math/FixedPoint");
const Math = artifacts.require("Math/Math");
const SafeMath = artifacts.require("Math/SafeMath");
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	// Test Scripts for constants from '@openzeppelin/test-helpers'
	// console.log(chalk.red.bold(constants.ZERO_ADDRESS));
	// console.log(chalk.red.bold(constants.MAX_UINT256));

	// Test Scripts for time from '@openzeppelin/test-helpers'
	console.log(chalk.red.bold("timestamp_before: ", await time.latest())); //the current timestamp
	console.log(chalk.red.bold("latestBlock_before: ", await time.latestBlock()));
	await time.advanceBlock();
	await time.advanceBlock();
	await time.advanceBlock();
	// Test For advance3Block();
	console.log(chalk.red.bold("timestamp_after", await time.latest())); //the current timestamp
	console.log(chalk.red.bold("latestBlock_after", await time.latestBlock()));

	
	// Deploy Contracts P2
	console.log(chalk.red('====== Deploy Contracts P2 ======='));
	await deployer.deploy(FixedPoint);
	await deployer.deploy(Math);
	await deployer.deploy(SafeMath);
	await deployer.deploy(TransferHelper);
}
