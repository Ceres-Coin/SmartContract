const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');

const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');


// Define UniswapV2Factory & Router
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");

// Define WETH & USDC & USDT & 6DEC USDC
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_6DEC = artifacts.require("FakeCollateral/FakeCollateral_6DEC");

// set constants
console.log(chalk.yellow('===== SET CONSTANTS ====='));
const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);

const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");

// Core Contract
const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");

// UniswapPairOracle
const UniswapPairOracle_CERES_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_WETH");
const UniswapPairOracle_CERES_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_USDC");
const UniswapPairOracle_CSS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_WETH");
const UniswapPairOracle_CSS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_USDC");

// Uniswap Contract
const Timelock = artifacts.require("Governance/Timelock");



// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {

	// Uniswap Address
	let uniswapFactoryInstance;
	let ceresInstance;
	let cssInstance;
	let wethInstance;
	let col_instance_USDC;
	let col_instance_USDT;
	let col_instance_6DEC;
	let timelockInstance;
	let routerInstance;

	// set the deploy address
	console.log(chalk.yellow('===== SET THE DEPLOY ADDRESSES ====='));
	const ADMIN = accounts[0];
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];

	console.log("ADMIN is: ",ADMIN);
	console.log("COLLATERAL_CERES_AND_CERESHARES_OWNER is: ",COLLATERAL_CERES_AND_CERESHARES_OWNER);

	// Set the Network Settings
	const IS_MAINNET = (process.env.MIGRATION_MODE == 'mainnet');
	const IS_ROPSTEN = (process.env.MIGRATION_MODE == 'ropsten');
	const IS_RINKEBY = (process.env.MIGRATION_MODE == 'rinkeby');
	const IS_DEV = (process.env.MIGRATION_MODE == 'dev');

	console.log("IS_MAINNET: ",IS_MAINNET);
	console.log("IS_ROPSTEN: ",IS_ROPSTEN);
	console.log("IS_RINKEBY: ",IS_RINKEBY);
	console.log("IS_DEV: ",IS_DEV);

	if (IS_DEV) {
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		timelockInstance = await Timelock.deployed();
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
	}
	


	// get uniswapFactory Instance * ceres/css instance;

	// ======== Set the Uniswap oracles ========
	console.log(chalk.yellow('========== UNISWAP ORACLES =========='));
	console.log(chalk.blue('=== CERES ORACLES ==='));
	await Promise.all([
		// deployer.deploy(UniswapPairOracle_CERES_WETH, uniswapFactoryInstance.address, ceresInstance.address, wethInstance.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address),
		// deployer.deploy(UniswapPairOracle_CERES_USDC, uniswapFactoryInstance.address, ceresInstance.address, col_instance_USDC.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address),
		
		
	]);


	



	
}
