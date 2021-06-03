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
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6");
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

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// Core Pool
// CERES_USDC Pool
const StringHelpers = artifacts.require("Utils/StringHelpers");
const Pool_USDC = artifacts.require("Ceres/Pools/Pool_USDC");

const MINTING_FEE = 300; // 0.03%
const REDEMPTION_FEE = 400; // 0.04%
const BUYBACK_FEE = 100; //0.01%
const RECOLLAT_FEE = 100; //0.01%




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
	
	// ============= Set the CERES Pools ========
	console.log(chalk.yellow('========== CERES POOLS =========='));
	await deployer.link(StringHelpers, [Pool_USDC]);
	await Promise.all([
		deployer.deploy(Pool_USDC, ceresInstance.address, cssInstance.address, col_instance_USDC.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address, FIVE_MILLION_DEC6),
	]);

	// ============= Get the pool instances ========
	console.log(chalk.yellow('========== POOL INSTANCES =========='));
	const pool_instance_USDC = await Pool_USDC.deployed();
	console.log("pool_instance_USDC: ",pool_instance_USDC.address);

	// Set the redemption fee to 0.04%
	// Set the minting fee to 0.03%
	await Promise.all([
		ceresInstance.setRedemptionFee(REDEMPTION_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		ceresInstance.setMintingFee(MINTING_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	]);

	// ============= Set the pool parameters so the minting and redemption fees get set ========
	console.log(chalk.yellow('========== REFRESH POOL PARAMETERS =========='));
	await Promise.all([
		await pool_instance_USDC.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, MINTING_FEE, REDEMPTION_FEE, BUYBACK_FEE, RECOLLAT_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),	
	]);


	
}
