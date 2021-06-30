const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const BigNumber = require('bignumber.js');
const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');
const { expect } = require('chai');

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
const TWO_MILLION_DEC18 = (new BigNumber("20000000e18")).toNumber();
const TWO_MILLION_DEC6 = (new BigNumber("20000000e6")).toNumber();
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18").toNumber();
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6").toNumber();
const TEN_MILLION_DEC18 = new BigNumber("10000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6").toNumber();
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18").toNumber();
const COLLATERAL_SEED_DEC18 = new BigNumber("508500e18").toNumber();
const COLLATERAL_SEED_DEC6 = new BigNumber("508500e6").toNumber();
const SIX_HUNDRED_DEC18 = new BigNumber("600e18").toNumber();
const SIX_HUNDRED_DEC6 = new BigNumber("600e6").toNumber();
const ONE_DEC18 = new BigNumber("1e18").toNumber();
const ONE_HUNDRED_DEC18 = new BigNumber("100e18").toNumber();
const ONE_HUNDRED_DEC6 = new BigNumber("100e6").toNumber();
const Number133_DEC18 = new BigNumber("133e18").toNumber();
const EIGHT_HUNDRED_DEC18 = new BigNumber("800e18").toNumber();
const ONE_THOUSAND_DEC18 = new BigNumber("1000e18").toNumber();



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
	const METAMASK_ADDRESS = accounts[2];

	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
	const OWNER = accounts[1];
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
		swapToPriceInstance = await SwapToPrice.deployed();
	}

	const pool_instance_USDC = await Pool_USDC.deployed();
	if (true) {
		// Add allowances to the Uniswap Router
		await Promise.all([
			wethInstance.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC18), { from: OWNER }),
			col_instance_USDC.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			col_instance_USDT.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			ceresInstance.approve(routerInstance.address, new BigNumber(ONE_MILLION_DEC18), { from: OWNER }),
			cssInstance.approve(routerInstance.address, new BigNumber(FIVE_MILLION_DEC18), { from: OWNER })
		]);	

		// Add allowances to the swapToPrice contract
		await Promise.all([
			wethInstance.approve(swapToPriceInstance.address, new BigNumber(TWO_MILLION_DEC18), { from: OWNER }),
			col_instance_USDC.approve(swapToPriceInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			ceresInstance.approve(swapToPriceInstance.address, new BigNumber(ONE_MILLION_DEC18), { from: OWNER }),
			cssInstance.approve(swapToPriceInstance.address, new BigNumber(FIVE_MILLION_DEC18), { from: OWNER })
		]);
	};

	// Handle CERES / WETH
	// console.log("ceres / WETH swapped");
	await swapToPriceInstance.swapToPrice(
		ceresInstance.address,
		wethInstance.address,
		new BigNumber(365e6),
		new BigNumber(1e6),
		new BigNumber(100e18),
		new BigNumber(100e18),
		OWNER,
		new BigNumber(2105300114),
		{ from: OWNER }
	);
	await swapToPriceInstance.swapToPrice(
		ceresInstance.address,
		col_instance_USDC.address,
		new BigNumber(1008e3),
		new BigNumber(997e3),
		new BigNumber(100e18),
		new BigNumber(100e18),
		OWNER,
		new BigNumber(2105300114),
		{ from: OWNER }
	);
	
	
}
