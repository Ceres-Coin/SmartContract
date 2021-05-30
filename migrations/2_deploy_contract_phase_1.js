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

// Define WETH & USDC & USDT & 6DEC USDC
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_6DEC = artifacts.require("FakeCollateral/FakeCollateral_6DEC");




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
	console.log("ONE_BILLION_DEC18: ",ONE_BILLION_DEC18.toString());
	console.log("COLLATERAL_SEED_DEC18: ",COLLATERAL_SEED_DEC18.toString());

	// Deploy Contracts P1 
	console.log(chalk.red('====== Deploy Contracts P1 ======='));
	await deployer.deploy(Address);
	await deployer.deploy(BlockMiner);
	await deployer.deploy(Babylonian);
	await deployer.deploy(UQ112x112);
	await deployer.deploy(StringHelpers);
	await deployer.deploy(Owned, COLLATERAL_CERES_AND_CERESHARES_OWNER);

	if (IS_MAINNET){
		console.log(chalk.yellow('===== REAL COLLATERAL ====='));
		wethInstance = await WETH.at("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
		col_instance_USDC = await FakeCollateral_USDC.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 
		col_instance_USDT = await FakeCollateral_USDT.at("0xdac17f958d2ee523a2206206994597c13d831ec7"); 

	}
	else {
		console.log(chalk.yellow('===== FAKE COLLATERAL ====='));

		await deployer.deploy(WETH, COLLATERAL_CERES_AND_CERESHARES_OWNER);
		await deployer.deploy(FakeCollateral_USDC, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDC", 6);
		await deployer.deploy(FakeCollateral_USDT, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDT", 6);
		await deployer.deploy(FakeCollateral_6DEC, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDT", 6);
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed(); 

		console.log("wethInstance: ",wethInstance.address);
		console.log("col_instance_USDC: ",col_instance_USDC.address);
		console.log("col_instance_USDT: ",col_instance_USDT.address);
		console.log("col_instance_6DEC: ",col_instance_6DEC.address);

	}


}
