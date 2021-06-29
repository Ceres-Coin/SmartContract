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
const ONE_MILLION_DEC18 = new BigNumber("1000000e18").toNumber();
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18").toNumber();
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6").toNumber();
const TEN_MILLION_DEC18 = new BigNumber("10000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6").toNumber();
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18").toNumber();
const COLLATERAL_SEED_DEC18 = new BigNumber("508500e18").toNumber();
const SIX_HUNDRED_DEC18 = new BigNumber("600e18").toNumber();
const SIX_HUNDRED_DEC6 = new BigNumber("600e6").toNumber();
const ONE_DEC18 = new BigNumber("1e18").toNumber();
const ONE_HUNDRED_DEC18 = new BigNumber("100e18").toNumber();
const ONE_HUNDRED_DEC6 = new BigNumber("100e6").toNumber();
const Number133_DEC18 = new BigNumber("133e18").toNumber();
const EIGHT_HUNDRED_DEC18 = new BigNumber("800e18").toNumber();


const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");

// Core Contract
const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");

// UniswapPairOracle
const UniswapPairOracle_CERES_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_WETH");
const UniswapPairOracle_CERES_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_USDC");
const UniswapPairOracle_CSS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_WETH");
const UniswapPairOracle_CSS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Uniswap Contract
const Timelock = artifacts.require("Governance/Timelock");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

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

	// Set the Network Settings
	const IS_MAINNET = (network == 'mainnet');
	const IS_ROPSTEN = (network == 'ropsten');
	const IS_DEV = (network == 'development');
	const IS_GANACHE = (network == 'devganache');
	const IS_BSC_TESTNET = (network == 'testnet');
	const IS_RINKEBY = (network == 'rinkeby');

	// set the deploy address
	const ADMIN = accounts[0];
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
	const account0 = accounts[0];
	const account1 = accounts[1];
	const account2 = accounts[2];
	const account3 = accounts[3];

	if (IS_ROPSTEN || IS_RINKEBY){
		// Note UniswapV2Router02 vs UniswapV2Router02_Modified
		routerInstance = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"); 
		uniswapFactoryInstance = await UniswapV2Factory.at("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"); 
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		timelockInstance = await Timelock.deployed();
	}
	if (IS_DEV || IS_BSC_TESTNET || IS_GANACHE) {
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		timelockInstance = await Timelock.deployed();
		routerInstance = await UniswapV2Router02_Modified.deployed(); 

		console.log(chalk.red(`ceresInstance: ${ceresInstance.address}`));
		console.log(chalk.red(`cssInstance: ${cssInstance.address}`));
		console.log(chalk.red(`wethInstance: ${wethInstance.address}`))
		console.log(chalk.red(`col_instance_USDC: ${col_instance_USDC.address}`))
	}
	
	// ============= Set the CERES Pools ========
	await deployer.link(StringHelpers, [Pool_USDC]);
	await Promise.all([
		deployer.deploy(Pool_USDC, ceresInstance.address, cssInstance.address, col_instance_USDC.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address, FIVE_MILLION_DEC6),
	]);
	
	// ============= Get the pool instances ========
	const pool_instance_USDC = await Pool_USDC.deployed();
	// Set the redemption fee to 0.04% & Set the minting fee to 0.03%
	await Promise.all([
		ceresInstance.setRedemptionFee(REDEMPTION_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		ceresInstance.setMintingFee(MINTING_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	]);

	// ============= Set the pool parameters so the minting and redemption fees get set ========
	await Promise.all([
		await pool_instance_USDC.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, MINTING_FEE, REDEMPTION_FEE, BUYBACK_FEE, RECOLLAT_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),	
	]);

	const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
	
	// await oracle_instance_USDC_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// console.log(chalk.red.bold(`wethInstance.address: ${wethInstance.address}`));
	// console.log(chalk.red.bold(`col_instance_USDC.address: ${col_instance_USDC.address}`));
	// console.log(chalk.red.bold("reserve0:", await oracle_instance_USDC_WETH.reserve0()));
	// console.log(chalk.red.bold("reserve1:", await oracle_instance_USDC_WETH.reserve1()));
	// console.log(chalk.red.bold("token0.address:", await oracle_instance_USDC_WETH.token0()));
	// console.log(chalk.red.bold("token1.address:", await oracle_instance_USDC_WETH.token1()));
	// console.log(chalk.red.bold("price0CumulativeLast:", await oracle_instance_USDC_WETH.price0CumulativeLast()));
	// console.log(chalk.red.bold("price1CumulativeLast:", await oracle_instance_USDC_WETH.price1CumulativeLast()));
	// console.log(chalk.red.bold("pair.address:", await oracle_instance_USDC_WETH.pair()));

	// const tmpPrice = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, BIG18))).div(BIG6).toNumber();
	// console.log(chalk.red.bold(`tmpPrice: ${tmpPrice}`));

	await Promise.all([
		pool_instance_USDC.setCollatETHOracle(oracle_instance_USDC_WETH.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	]);

	console.log(chalk.red(`oracle_instance_USDC_WETH.address: ${oracle_instance_USDC_WETH.address}`));
}
