const BigNumber = require('bignumber.js');
const BN = BigNumber.clone({ DECIMAL_PLACES: 9 })
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert, expect } = require('chai');
const constants = require('@openzeppelin/test-helpers/src/constants');

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:8545');

global.artifacts = artifacts;
global.web3 = web3;

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const Math = artifacts.require("Math/Math");
const SafeMath = artifacts.require("Math/SafeMath");
const Babylonian = artifacts.require("Math/Babylonian");
const FixedPoint = artifacts.require("Math/FixedPoint");
const UQ112x112 = artifacts.require("Math/UQ112x112");
const Owned = artifacts.require("Staking/Owned");
const ERC20 = artifacts.require("ERC20/ERC20");
const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// set constants
const ONE_HUNDRED_DEC18 = new BigNumber("100e18");
const ONE_THOUSAND_DEC18 = new BigNumber("1000e18");
const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6");
const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const TWO_MILLION_DEC18 = (new BigNumber("20000000e18")).toNumber();
const TWO_MILLION_DEC6 = (new BigNumber("20000000e6")).toNumber();

// Uniswap related
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_6DEC = artifacts.require("FakeCollateral/FakeCollateral_6DEC");

// Core Contract CERES & CSS
const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");

// Timelock
const Timelock = artifacts.require("Governance/Timelock");
const TimelockTest = artifacts.require("Governance/TimelockTest");

// Fake Oracle
const UniswapPairOracle_CERES_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_CERES_WETH");
const UniswapPairOracle_CERES_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_CERES_USDC");
const UniswapPairOracle_CSS_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_CSS_WETH");
const UniswapPairOracle_CSS_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_CSS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracle = artifacts.require("Oracle/UniswapPairOracle");

// ChainlinkETHUSD Contract
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

const Pool_USDC = artifacts.require("Ceres/Pools/Pool_USDC");

contract('test_6DEC_Tests', async (accounts) => {
	// deploy address;
	let ADMIN;
	let COLLATERAL_CERES_AND_CERESHARES_OWNER;
	let OWNER;
	let METAMASK_ADDRESS;

	// CERES Core  Contract instances
	let ceresInstance;
	let cssInstance;

	// UniswapV2Router
	let routerInstance;

	// timelock instance
	let timelockInstance;

	// uniswapFactoryInstance 
	let uniswapFactoryInstance;

	// uniswap library
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;
	let swapToPriceInstance;

	// ceres price pair
	let pair_addr_CERES_WETH;
	let pair_addr_CERES_USDC;

	// css price pair
	let pair_addr_CSS_WETH;
	let pair_addr_CSS_USDC;

	// uniswap oracle price
	let oracle_instance_CERES_WETH;
	let oracle_instance_CERES_USDC;
	let oracle_instance_CSS_WETH;
	let oracle_instance_CSS_USDC;
	let oracle_instance_USDC_WETH;

	let first_CERES_WETH;
	let first_CERES_USDC;
	let first_CSS_WETH;
	let first_CSS_USDC;
	// chainlink address
	let oracle_chainlink_ETH_USD;

	// USDC_Pool Parameter
	let pool_instance_USDC;
	// USDC_Pool Public Variants
	let collateral_token;
	let collateral_address;
	let owner_address;
	let ceres_contract_address;
	let css_contract_address;
	let timelock_address;

	let minting_fee;
	let redemption_fee;
	let buyback_fee;
	let recollat_fee;

	const MINTING_FEE = 300; // 0.03%
	const REDEMPTION_FEE = 400; // 0.04%
	const BUYBACK_FEE = 100; //0.01%
	const RECOLLAT_FEE = 100; //0.01%

	const MINTING_FEE_MODIFIED = 600; // 0.06%
	const REDEMPTION_FEE_MODIFIED = 800; // 0.08%
	const BUYBACK_FEE_MODIFIED = 200; //0.02%
	const RECOLLAT_FEE_MODIFIED = 200; //0.02%

	const CERES_STEP = 2500; 
	const CERES_STEP_MODIFIED = 5000; 
	const PRICE_TARGET = 1000000; 
	const PRICE_TARGET_MODIFIED = 1000000; 
	const PRICE_BAND = 5000; 
	const PRICE_BAND_MODIFIED = 10000; 
	const refresh_cooldown_default = 60; 
	const refresh_cooldown_modified = 120; 

	
	// USDC_Pool Constants
	const PRICE_PRECISION = new BigNumber(1e6);
	const COLLATERAL_RATIO_PRECISION = new BigNumber(1e6);
	const COLLATERAL_RATIO_MAX = new BigNumber(1e6);
	const MISSING_DECIMALS = 12;
	const TIMELOCK_DELAY = 300

	let price_precision;
	let collateral_ratio_precision;
	let collateral_ratio_max;
	let missing_decimals;

	let pool_ceiling;
	const POOL_CEILING = FIVE_MILLION_DEC6;

	let pausedPrice;
	const PAUSEDPRICE = 0;

	let bonus_rate;
	const BONUS_RATE = 7500;

	let redemption_delay;
	const REDEMPTION_DELAY = 1;

	// AccessControl state variables
	const er_mintPaused = false;
	const er_redeemPaused = false;
	const er_recollateralizePaused = false;
	const er_buyBackPaused = false;
	const er_collateralPricePaused = false;

	// AccessControl state variables
	let ar_mintPaused;
	let ar_redeemPaused;
	let ar_recollateralizePaused;
	let ar_buyBackPaused;
	let ar_collateralPricePaused;

	const global_collateral_ratio_initial_value = 1000000;
	const RefreshCooldown_Initial_Value = 60;
	const DECIMALS_DEFAULT_VALUE = 18;
	const NAME_DEFAULT_VALUE = "CERES";
	const SYMBOL_DEFAULT_VALUE = "CERES";
	const MIN_PERIOD = 1;
	const DEFAULT_PERIOD = 5;

    let account0;
    let account1;
    let account2;
    let account3;
    let account4;
    let account5;
    let account6;
    let account7;

    beforeEach(async() => {
		ADMIN = accounts[0];
		COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
		OWNER = accounts[1];
		METAMASK_ADDRESS = accounts[2];
		account0 = accounts[0];
		account1 = accounts[1];
		account2 = accounts[2];
		account3 = accounts[3];
		account4 = accounts[4];
		account5 = accounts[5];
		account6 = accounts[6];
		account7 = accounts[7];

		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		wethInstance = await WETH.deployed();

		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();

		routerInstance = await UniswapV2Router02_Modified.deployed(); 
		timelockInstance = await Timelock.deployed(); 
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		uniswapLibraryInstance = await UniswapV2Library.deployed(); 
		uniswapOracleLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		swapToPriceInstance = await SwapToPrice.deployed(); 

		pair_addr_CERES_WETH = await uniswapFactoryInstance.getPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		pair_addr_CERES_USDC = await uniswapFactoryInstance.getPair(ceresInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		pair_addr_CSS_WETH = await uniswapFactoryInstance.getPair(cssInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		pair_addr_CSS_USDC = await uniswapFactoryInstance.getPair(cssInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

		oracle_instance_CERES_WETH = await UniswapPairOracle_CERES_WETH.deployed();
		oracle_instance_CERES_USDC = await UniswapPairOracle_CERES_USDC.deployed();
		oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
		oracle_instance_CSS_WETH = await UniswapPairOracle_CSS_WETH.deployed();
		oracle_instance_CSS_USDC = await UniswapPairOracle_CSS_USDC.deployed();

		first_CERES_WETH = await oracle_instance_CERES_WETH.token0();
		first_CERES_USDC = await oracle_instance_CERES_USDC.token0();
		first_CSS_WETH = await oracle_instance_CSS_WETH.token0();
		first_CSS_USDC = await oracle_instance_CSS_USDC.token0();

		first_CERES_WETH = ceresInstance.address == first_CERES_WETH;
		first_CERES_USDC = ceresInstance.address == first_CERES_USDC;
		first_CSS_WETH = cssInstance.address == first_CSS_WETH;
		first_CSS_USDC = cssInstance.address == first_CSS_USDC;

		pool_instance_USDC = await Pool_USDC.deployed();
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumerTest.deployed();
    });

	it ("Test Scripts for ceresInstance.address", async() => {
		const ceresInstance_address = await ceresInstance.address;
		console.log(chalk.yellow(`ceresInstance_address: ${ceresInstance_address}`));
	});

	it('Check up on the oracles and make sure the prices are set', async () => {
		// Advance 24 hrs so the period can be computed
		await time.increase(86400 + 1);
		await time.advanceBlock();

		// Make sure the prices are updated
		await oracle_instance_CERES_WETH.update({ from: OWNER });
		await oracle_instance_CERES_USDC.update({ from: OWNER });
		await oracle_instance_CSS_WETH.update({ from: OWNER });
		await oracle_instance_CSS_USDC.update({ from: OWNER });
		await oracle_instance_USDC_WETH.update({ from: OWNER });
		
		// Get the prices
		// Price is in collateral needed for 1 CERES
		let ceres_price_from_CERES_WETH = parseFloat((new BigNumber(await oracle_instance_CERES_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6));
		let ceres_price_from_CERES_USDC = parseFloat((new BigNumber(await oracle_instance_CERES_USDC.consult.call(col_instance_USDC.address,BIG6))).div(BIG18));
		let css_price_from_CSS_WETH = parseFloat((new BigNumber(await oracle_instance_CSS_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6));
		let css_price_from_CSS_USDC = parseFloat((new BigNumber(await oracle_instance_CSS_USDC.consult.call(col_instance_USDC.address,BIG6))).div(BIG18));
		let usdc_price_from_USDC_WETH = parseFloat((new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, BIG18))).div(BIG6));
	
		console.log(chalk.yellow(`ceres_price_from_CERES_WETH: ${ceres_price_from_CERES_WETH}`));
		console.log(chalk.yellow(`ceres_price_from_CERES_USDC: ${ceres_price_from_CERES_USDC}`));
		console.log(chalk.yellow(`css_price_from_CSS_WETH: ${css_price_from_CSS_WETH}`));
		console.log(chalk.yellow(`css_price_from_CSS_USDC: ${css_price_from_CSS_USDC}`));
		console.log(chalk.yellow(`usdc_price_from_USDC_WETH: ${usdc_price_from_USDC_WETH}`));

		await Promise.all([
			wethInstance.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC18), { from: OWNER }),
			col_instance_USDC.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			col_instance_USDT.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			ceresInstance.approve(routerInstance.address, new BigNumber(ONE_MILLION_DEC18), { from: OWNER }),
			cssInstance.approve(routerInstance.address, new BigNumber(FIVE_MILLION_DEC18), { from: OWNER })
		]);	
		
		// // Add allowances to the swapToPrice contract
		// await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await col_instance_USDC.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// // await col_instance_yUSD.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await fraxInstance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await fxsInstance.approve(swapToPriceInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// console.log("===============FIRST SWAPS===============");
		
		// //--- FRAX

		// // Handle FRAX / WETH
		// // Targeting 390.6 FRAX / 1 WETH
		// await swapToPriceInstance.swapToPrice(
		// 	fraxInstance.address,
		// 	wethInstance.address,
		// 	new BigNumber(3906e5),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FRAX / USDC
		// // Targeting 1.003 FRAX / 1 USDC
		// await swapToPriceInstance.swapToPrice(
		// 	fraxInstance.address,
		// 	col_instance_USDC.address,
		// 	new BigNumber(1003e3),
		// 	new BigNumber(997e3),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FRAX / USDT
		// // Targeting 0.995 FRAX / 1 USDT
		// await swapToPriceInstance.swapToPrice(
		// 	fraxInstance.address,
		// 	col_instance_USDT.address,
		// 	new BigNumber(995e3),
		// 	new BigNumber(1005e3),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FRAX / yUSD
		// // Targeting 0.998 FRAX / 1 yUSD
		// // await swapToPriceInstance.swapToPrice(
		// // 	fraxInstance.address,
		// // 	col_instance_yUSD.address,
		// // 	new BigNumber(998e3),
		// // 	new BigNumber(1002e3),
		// // 	new BigNumber(100e18),
		// // 	new BigNumber(100e18),
		// // 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// // 	new BigNumber(2105300114),
		// // 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// // )

		// //--- FXS

		// // Handle FXS / WETH
		// // Targeting 1955 FXS / 1 WETH
		// await swapToPriceInstance.swapToPrice(
		// 	fxsInstance.address,
		// 	wethInstance.address,
		// 	new BigNumber(1955e6),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FXS / USDC
		// // Targeting 5.2 FXS / 1 USDC
		// await swapToPriceInstance.swapToPrice(
		// 	fxsInstance.address,
		// 	col_instance_USDC.address,
		// 	new BigNumber(52e5),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )


		// // Handle FXS / USDT
		// // Targeting 5.1 FXS / 1 USDT
		// await swapToPriceInstance.swapToPrice(
		// 	fxsInstance.address,
		// 	col_instance_USDT.address,
		// 	new BigNumber(51e5),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FXS / yUSD
		// // Targeting 4.9 FXS / 1 yUSD
		// // await swapToPriceInstance.swapToPrice(
		// // 	fxsInstance.address,
		// // 	col_instance_yUSD.address,
		// // 	new BigNumber(49e5),
		// // 	new BigNumber(1e6),
		// // 	new BigNumber(100e18),
		// // 	new BigNumber(100e18),
		// // 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// // 	new BigNumber(2105300114),
		// // 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// // )

		// // Advance 24 hrs so the period can be computed
		// await time.increase(86400 + 1);
		// await time.advanceBlock();

		// // Make sure the prices are updated
		// await oracle_instance_FRAX_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FRAX_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FRAX_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// // await oracle_instance_FRAX_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FXS_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FXS_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FXS_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// // await oracle_instance_FXS_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_USDT_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_USDC_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Advance 24 hrs so the period can be computed
		// await time.increase(86400 + 1);
		// await time.advanceBlock();

		// Get the prices
		// frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		// frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
		// frax_price_from_FRAX_USDT = (new BigNumber(await oracle_instance_FRAX_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
		// // frax_price_from_FRAX_yUSD = (new BigNumber(await oracle_instance_FRAX_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
		// fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		// fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
		// fxs_price_from_FXS_USDT = (new BigNumber(await oracle_instance_FXS_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
		// // fxs_price_from_FXS_yUSD = (new BigNumber(await oracle_instance_FXS_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
		// USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();
		// USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();
		// DEC6_price_from_DEC6_WETH = (new BigNumber(await oracle_instance_6DEC_WETH.consult.call(WETH.address, (1e18).toString()))).div(1e6).toNumber();

		// console.log(chalk.blue("==================PRICES=================="));
		// Print the new prices
		// console.log("ETH-USD price from Chainlink:", (new BigNumber((await fraxInstance.frax_info.call())['7'])).div(1e6).toString() , "USD = 1 ETH");
		// console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
		// console.log("FRAX-USD price from Chainlink, Uniswap:", (new BigNumber(await fraxInstance.frax_price.call())).div(1e6).toString(), "FRAX = 1 USD");
		//console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), " FRAX = 1 USDC");
		//console.log("frax_price_from_FRAX_USDT: ", frax_price_from_FRAX_USDT.toString(), " FRAX = 1 USDT");
		//console.log("frax_price_from_FRAX_yUSD: ", frax_price_from_FRAX_yUSD.toString(), " FRAX = 1 yUSD");
		// console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), " FXS = 1 WETH");
		// //console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), " FXS = 1 USDC");
		// //console.log("fxs_price_from_FXS_USDT: ", fxs_price_from_FXS_USDT.toString(), " FXS = 1 USDT");
		// //console.log("fxs_price_from_FXS_yUSD: ", fxs_price_from_FXS_yUSD.toString(), " FXS = 1 yUSD");
		// console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
		// console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");
		// console.log("6DEC_price_from_6DEC_WETH: ", DEC6_price_from_DEC6_WETH.toString(), " 6DEC = 1 WETH");
		// console.log("USDT_price_from_pool: ", (new BigNumber (await pool_instance_USDT.getCollateralPrice.call())).div(1e6).toString(), " USDT = 1 USD");
		// console.log("USDC_price_from_pool: ", (new BigNumber (await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), " USDC = 1 USD");
		// console.log("6DEC_price_from_pool: ", (new BigNumber (await pool_instance_6DEC.getCollateralPrice.call())).div(1e6).toString(), " 6DEC = 1 USD");


	});

});













