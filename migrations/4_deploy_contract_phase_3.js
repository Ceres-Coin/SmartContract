const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');

const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");



// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	// Deploy Contracts P3
	console.log(chalk.red('====== Deploy Contracts P3 ======='));

    await deployer.deploy(UniswapV2ERC20);



}
