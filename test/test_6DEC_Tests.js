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
const ONE_HUNDRED_DEC6 = new BigNumber("100e6");
const FIVE_HUNDRED_DEC18 = new BigNumber("500e18");
const ONE_THOUSAND_DEC18 = new BigNumber("1000e18");
const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6");
const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const TWO_MILLION_DEC18 = (new BigNumber("2000000e18")).toNumber();
const TWO_MILLION_DEC6 = (new BigNumber("2000000e6")).toNumber();

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
		// console.log(chalk.yellow(`ceresInstance_address: ${ceresInstance_address}`));
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

		// Add allowances to the swapToPrice contract
		await Promise.all([
			wethInstance.approve(swapToPriceInstance.address, new BigNumber(TWO_MILLION_DEC18), { from: OWNER }),
			col_instance_USDC.approve(swapToPriceInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: OWNER }),
			ceresInstance.approve(swapToPriceInstance.address, new BigNumber(ONE_MILLION_DEC18), { from: OWNER }),
			cssInstance.approve(swapToPriceInstance.address, new BigNumber(FIVE_MILLION_DEC18), { from: OWNER })
		]);

		await swapToPriceInstance.swapToPrice(
			ceresInstance.address,
			wethInstance.address,
			new BigNumber(3906e5),
			new BigNumber(1e6),
			new BigNumber(100e18),
			new BigNumber(100e18),
			OWNER,
			new BigNumber(2105300114),
			{ from: OWNER }
		);

		await swapToPriceInstance.swapToPrice(
			cssInstance.address,
			wethInstance.address,
			new BigNumber(1955e6),
			new BigNumber(1e6),
			new BigNumber(100e18),
			new BigNumber(100e18),
			OWNER,
			new BigNumber(2105300114),
			{ from: OWNER }
		);
		
		// Advance 24 hrs so the period can be computed
		await time.increase(86400 + 1);
		await time.advanceBlock();

		// Make sure the prices are updated
		await oracle_instance_CERES_WETH.update({ from: OWNER });
		await oracle_instance_CERES_USDC.update({ from: OWNER });
		await oracle_instance_CSS_WETH.update({ from: OWNER });
		await oracle_instance_CSS_USDC.update({ from: OWNER });
		await oracle_instance_USDC_WETH.update({ from: OWNER });

		// Advance 24 hrs so the period can be computed
		await time.increase(86400 + 1);
		await time.advanceBlock();

		let ceres_price_from_CERES_WETH_after = parseFloat((new BigNumber(await oracle_instance_CERES_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6));
		let ceres_price_from_CERES_USDC_after = parseFloat((new BigNumber(await oracle_instance_CERES_USDC.consult.call(col_instance_USDC.address,BIG6))).div(BIG18));
		let css_price_from_CSS_WETH_after = parseFloat((new BigNumber(await oracle_instance_CSS_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6));
		let css_price_from_CSS_USDC_after = parseFloat((new BigNumber(await oracle_instance_CSS_USDC.consult.call(col_instance_USDC.address,BIG6))).div(BIG18));
		let usdc_price_from_USDC_WETH_after = parseFloat((new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, BIG18))).div(BIG6));
	
		console.log(chalk.blue(`ceres_price_from_CERES_WETH_after: ${ceres_price_from_CERES_WETH_after}`));
		console.log(chalk.blue(`ceres_price_from_CERES_USDC_after: ${ceres_price_from_CERES_USDC_after}`));
		console.log(chalk.blue(`css_price_from_CSS_WETH_after: ${css_price_from_CSS_WETH_after}`));
		console.log(chalk.blue(`css_price_from_CSS_USDC_after: ${css_price_from_CSS_USDC_after}`));
		console.log(chalk.blue(`usdc_price_from_USDC_WETH_after: ${usdc_price_from_USDC_WETH_after}`));

	});

	it("[mint1t1CERES]: Mints USDC 1-to-1", async () => {
		console.log("============6DEC mint1t1FRAX()============");
		const totalSupplyCERES = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18).toNumber();
		const totalSupplyCSS = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18).toNumber();
		// console.log(chalk.yellow(`totalSupplyCERES: ${totalSupplyCERES}`));
		// console.log(chalk.yellow(`totalSupplyCSS: ${totalSupplyCSS}`));

		const global_collateral_ratio = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		const globalCollateralValue = new BigNumber(await ceresInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log(chalk.blue(`global_collateral_ratio: ${global_collateral_ratio}`));
		// console.log(chalk.yellow(`globalCollateralValue: ${globalCollateralValue}`));

		// console.log("CERES price (USD): ", (new BigNumber(await ceresInstance.ceres_price.call()).div(BIG6)).toNumber());
		// console.log("CSS price (USD): ", (new BigNumber(await ceresInstance.css_price.call()).div(BIG6)).toNumber());
	
		// Note the collateral ratio
		const global_collateral_ratio_before = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		// console.log(chalk.yellow(`global_collateral_ratio_before: ${global_collateral_ratio_before}`));
		
		// Note the collateral and CERES amounts before minting
		const ceres_before = new BigNumber(await ceresInstance.balanceOf.call(OWNER)).div(BIG18);
		const usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(OWNER)).div(BIG6);
		const pool_usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		const collateral_price = (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber()

		console.log(chalk.yellow(`ceres_before: ${ceres_before}`));
		console.log(chalk.yellow(`usdc_before: ${usdc_before}`));
		console.log(chalk.yellow(`pool_usdc_before: ${pool_usdc_before}`));
		// console.log(chalk.blue(`collateral_price: ${collateral_price}`));

		const bal_ceres = ceres_before;
		const col_bal_6dec = usdc_before;
		const pool_bal_6dec = pool_usdc_before;
		// console.log("bal_frax: ", bal_ceres.toNumber());
		// console.log("col_bal_6dec: ", col_bal_6dec.toNumber());
		// console.log("pool_bal_6dec: ", pool_bal_6dec.toNumber());
		// console.log("6DEC price:", collateral_price);

		// ACTION
		const collateral_amount = ONE_HUNDRED_DEC6;
		await col_instance_USDC.approve(pool_instance_USDC.address, collateral_amount, { from: OWNER });
		const ceres_out_min = new BigNumber(collateral_amount.times(collateral_price).times(0.99)); // 1% slippage
		await pool_instance_USDC.mint1t1CERES(collateral_amount, ceres_out_min, { from: OWNER });

		const ceres_after = new BigNumber(await ceresInstance.balanceOf.call(OWNER)).div(BIG18);
		const usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(OWNER)).div(BIG6);
		const pool_usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		console.log(chalk.yellow(`ceres_after: ${ceres_after}`));
		console.log(chalk.yellow(`usdc_after: ${usdc_after}`));
		console.log(chalk.yellow(`pool_usdc_after: ${pool_usdc_after}`));


		console.log("accounts[0] ceres change: ", ceres_after.toNumber() - ceres_before.toNumber());
		console.log("accounts[0] usdc change: ", usdc_after.toNumber() - usdc_before.toNumber());
		console.log("pool_usdc_after usdc change: ", pool_usdc_after.toNumber() - pool_usdc_before.toNumber());

		// // Note the new collateral ratio
		const global_collateral_ratio_after = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6);
		console.log(chalk.blue("global_collateral_ratio_after: ", global_collateral_ratio_after.toNumber()));

	});

	it("[redeem1t1CERES][account5]: Redeem USDC 1-TO-1", async() => {
		console.log(chalk.blue("============USDC redeem1t1CERES(ACCOUNT5)============"));

		// Note the collateral and CERES amounts before REDEEM
		const totalSupplyCERES_before = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_before = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const ceres_before = new BigNumber(await ceresInstance.balanceOf.call(account5)).div(BIG18);
		const css_before = new BigNumber(await cssInstance.balanceOf.call(account5)).div(BIG18);
		const usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(account5)).div(BIG6);
		const pool_ceres_before = new BigNumber(await ceresInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18); 
		const pool_css_before = new BigNumber(await cssInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const pool_usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		
		// console.log(chalk.blue("============================ SEPERATOR ========================="));
		// console.log(chalk.yellow(`totalSupplyCERES_before: ${totalSupplyCERES_before}`));
		// console.log(chalk.yellow(`totalSupplyCSS_before: ${totalSupplyCSS_before}`));

		// console.log(chalk.yellow(`account5_ceres_before: ${ceres_before}`));
		// console.log(chalk.yellow(`account5_css_before: ${css_before}`));
		// console.log(chalk.yellow(`account5_usdc_before: ${usdc_before}`));
		// console.log(chalk.yellow(`pool_ceres_before: ${pool_ceres_before}`));
		// console.log(chalk.yellow(`pool_css_before: ${pool_css_before}`));
		// console.log(chalk.yellow(`pool_usdc_before: ${pool_usdc_before}`));

		// ACTION

		// Need to approve first so the pool contract can use transfer
		const ceres_amount = new BigNumber(ONE_HUNDRED_DEC18);
		await ceresInstance.transfer(account5,ceres_amount,{from: OWNER});

		await ceresInstance.approve(pool_instance_USDC.address, ceres_amount, { from: account5 });
		await col_instance_USDC.approve(pool_instance_USDC.address, TWO_MILLION_DEC6, { from: account5 });
		
		// Redeem some CERES
		await pool_instance_USDC.redeem1t1CERES(ceres_amount, new BigNumber("1e6"), { from: account5 });
		// Collect redemption
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await pool_instance_USDC.collectRedemption({ from: account5 });

		// Note the collateral and CERES amounts before REDEEM
		const totalSupplyCERES_after = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_after = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const ceres_after = new BigNumber(await ceresInstance.balanceOf.call(account5)).div(BIG18);
		const css_after = new BigNumber(await cssInstance.balanceOf.call(account5)).div(BIG18);
		const usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(account5)).div(BIG6);
		const pool_ceres_after = new BigNumber(await ceresInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18); 
		const pool_css_after = new BigNumber(await cssInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const pool_usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		// console.log(chalk.blue("============================ SEPERATOR ========================="));
		// console.log(chalk.yellow(`totalSupplyCERES_after: ${totalSupplyCERES_after}`));
		// console.log(chalk.yellow(`totalSupplyCSS_after: ${totalSupplyCSS_after}`));

		// console.log(chalk.yellow(`account5_ceres_after: ${ceres_after}`));
		// console.log(chalk.yellow(`account5_css_after: ${css_after}`));
		// console.log(chalk.yellow(`account5_usdc_after: ${usdc_after}`));
		// console.log(chalk.yellow(`pool_ceres_after: ${pool_ceres_after}`));
		// console.log(chalk.yellow(`pool_css_after: ${pool_css_after}`));
		// console.log(chalk.yellow(`pool_usdc_after: ${pool_usdc_after}`));

		console.log(chalk.blue("============================ SEPERATOR ========================="));
		console.log(chalk.yellow("ceres total supply change: ", totalSupplyCERES_after.toNumber() - totalSupplyCERES_before.toNumber()));
		console.log(chalk.yellow("css total supply change: ", totalSupplyCSS_after.toNumber() - totalSupplyCSS_before.toNumber()));
		console.log(chalk.yellow("account5_ceres change: ", ceres_after.toNumber() - ceres_before.toNumber()));
		console.log(chalk.yellow("account5_css change: ", css_after.toNumber() - css_before.toNumber()));
		console.log(chalk.yellow("account5_usdc change: ", usdc_after.toNumber() - usdc_before.toNumber()));
		console.log(chalk.yellow("pool_ceres_change: ", pool_ceres_after.toNumber() - pool_ceres_before.toNumber()));
		console.log(chalk.yellow("pool_css_change: ", pool_css_after.toNumber() - pool_css_before.toNumber()));
		console.log(chalk.yellow("pool_usdc_change: ", pool_usdc_after.toNumber() - pool_usdc_before.toNumber()));
	})

	it("[mintFractionalCERES]: Mint some CERES using CSS and 6DEC (collateral ratio between .000001 and .999999)", async () => {
		console.log(chalk.blue("============USDC mintFractionalCERES()============"));
		const totalSupplyCERES_before = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_before = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const global_collateral_ratio = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		const globalCollateralValue = new BigNumber(await ceresInstance.globalCollateralValue.call()).div(BIG18).toNumber();

		// Before
		await ceresInstance.setRefreshCooldown(1,{from: OWNER});
		// Action
		await ceresInstance.refreshCollateralRatio();
		//ROLL BACK
		await ceresInstance.setRefreshCooldown(RefreshCooldown_Initial_Value,{from: OWNER}); 

		// Note the collateral ratio
		const global_collateral_ratio_before = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		
		
		// Note the collateral and CERES amounts before minting
		const ceres_before = new BigNumber(await ceresInstance.balanceOf.call(OWNER)).div(BIG18);
		const css_before = new BigNumber(await cssInstance.balanceOf.call(OWNER)).div(BIG18);
		const usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(OWNER)).div(BIG6);
		const pool_usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		const collateral_price = (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber()

		// COMMENT PRINT CODE
		// COMMENT PRINT CODE
		// COMMENT PRINT CODE
		// console.log(chalk.yellow(`ceres_before: ${ceres_before}`));
		// console.log(chalk.yellow(`css_before: ${css_before}`));
		// console.log(chalk.yellow(`usdc_before: ${usdc_before}`));
		// console.log(chalk.yellow(`pool_usdc_before: ${pool_usdc_before}`))

		// ACTION
		const css_amount = new BigNumber(FIVE_HUNDRED_DEC18);
		await cssInstance.approve(pool_instance_USDC.address, css_amount, { from: OWNER });
		const usdc_amount = new BigNumber(ONE_HUNDRED_DEC6);
		await col_instance_USDC.approve(pool_instance_USDC.address, usdc_amount, { from: OWNER });
		await pool_instance_USDC.mintFractionalCERES(usdc_amount, css_amount, new BigNumber("10e18"), { from: OWNER });
		
		const ceres_after = new BigNumber(await ceresInstance.balanceOf.call(OWNER)).div(BIG18);
		const css_after = new BigNumber(await cssInstance.balanceOf.call(OWNER)).div(BIG18);
		const usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(OWNER)).div(BIG6);
		const pool_usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		
		const totalSupplyCERES_after = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_after = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		// COMMENT PRINT CODE
		// COMMENT PRINT CODE
		// COMMENT PRINT CODE
		// console.log(chalk.yellow(`ceres_after: ${ceres_after}`));
		// console.log(chalk.yellow(`css_after: ${css_after}`));
		// console.log(chalk.yellow(`usdc_after: ${usdc_after}`));
		// console.log(chalk.yellow(`pool_usdc_after: ${pool_usdc_after}`));

		console.log(chalk.blue("ceres total supply change: ", totalSupplyCERES_after.toNumber() - totalSupplyCERES_before.toNumber()));
		console.log(chalk.blue("css total supply change: ", totalSupplyCSS_after.toNumber() - totalSupplyCSS_before.toNumber()));
		console.log(chalk.yellow("OWNER ceres change: ", ceres_after.toNumber() - ceres_before.toNumber()));
		console.log(chalk.yellow("OWNER css change: ", css_after.toNumber() - css_before.toNumber()));
		console.log(chalk.yellow("OWNER usdc change: ", usdc_after.toNumber() - usdc_before.toNumber()));
		console.log(chalk.yellow("pool_usdc_after usdc change: ", pool_usdc_after.toNumber() - pool_usdc_before.toNumber()));

		// // Note the new collateral ratio
		const global_collateral_ratio_after = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6);
		// console.log(chalk.blue(`global_collateral_ratio_before: ${global_collateral_ratio_before}`));
		// console.log(chalk.blue("global_collateral_ratio_after: ", global_collateral_ratio_after.toNumber()));
	});

	it("[redeemFractionalCERES][OWNER]: Redeem some CERES for CSS and USDC (collateral ratio between .000001 and .999999)", async() => {
		console.log(chalk.blue("============USDC redeemFractionalCERES()============"));
		// refreshCollateralRatio
		await ceresInstance.setRefreshCooldown(1,{from: OWNER});
		await ceresInstance.refreshCollateralRatio();
		await ceresInstance.setRefreshCooldown(RefreshCooldown_Initial_Value,{from: OWNER}); 

		// Note the collateral ratio
		const global_collateral_ratio_before = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		const collateral_price = (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber();
		const globalCollateralValue = new BigNumber(await ceresInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		
		// Note the collateral and CERES amounts before REDEEM
		const totalSupplyCERES_before = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_before = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const ceres_before = new BigNumber(await ceresInstance.balanceOf.call(OWNER)).div(BIG18);
		const css_before = new BigNumber(await cssInstance.balanceOf.call(OWNER)).div(BIG18);
		const usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(OWNER)).div(BIG6);
		const pool_usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		
		// ACTION

		// Need to approve first so the pool contract can use transfer
		const ceres_amount = new BigNumber("135242531948024e6");
		await ceresInstance.approve(pool_instance_USDC.address, ceres_amount, { from: OWNER });
		await col_instance_USDC.approve(pool_instance_USDC.address, TWO_MILLION_DEC6, { from: OWNER });
		
		// Redeem some CERES
		await pool_instance_USDC.redeemFractionalCERES(ceres_amount, new BigNumber("1e6"), new BigNumber("1e6"), { from: OWNER });
		// Collect redemption
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await pool_instance_USDC.collectRedemption({ from: OWNER });

		// Note the collateral and CERES amounts before REDEEM
		const totalSupplyCERES_after = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_after = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const ceres_after = new BigNumber(await ceresInstance.balanceOf.call(OWNER)).div(BIG18);
		const css_after = new BigNumber(await cssInstance.balanceOf.call(OWNER)).div(BIG18);
		const usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(OWNER)).div(BIG6);
		const pool_usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);

		console.log(chalk.yellow("ceres total supply change: ", totalSupplyCERES_after.toNumber() - totalSupplyCERES_before.toNumber()));
		console.log(chalk.yellow("css total supply change: ", totalSupplyCSS_after.toNumber() - totalSupplyCSS_before.toNumber()));
		console.log(chalk.yellow("OWNER ceres change: ", ceres_after.toNumber() - ceres_before.toNumber()));
		console.log(chalk.yellow("OWNER css change: ", css_after.toNumber() - css_before.toNumber()));
		console.log(chalk.yellow("OWNER usdc change: ", usdc_after.toNumber() - usdc_before.toNumber()));
		console.log(chalk.yellow("pool_usdc_after usdc change: ", pool_usdc_after.toNumber() - pool_usdc_before.toNumber()));

		const global_collateral_ratio_after = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6);
		console.log(chalk.blue(`global_collateral_ratio_before: ${global_collateral_ratio_before}`));
		console.log(chalk.blue("global_collateral_ratio_after: ", global_collateral_ratio_after.toNumber()));
	});

	it("[redeemFractionalCERES][ACCOUNT5]: Redeem some CERES for CSS and USDC FROM ACCOUNT5", async() => {
		console.log(chalk.blue("============USDC redeemFractionalCERES(ACCOUNT5)============"));

		// Note the collateral and CERES amounts before REDEEM
		const totalSupplyCERES_before = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_before = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const ceres_before = new BigNumber(await ceresInstance.balanceOf.call(account5)).div(BIG18);
		const css_before = new BigNumber(await cssInstance.balanceOf.call(account5)).div(BIG18);
		const usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(account5)).div(BIG6);
		const pool_ceres_before = new BigNumber(await ceresInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18); 
		const pool_css_before = new BigNumber(await cssInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const pool_usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);

		// console.log(chalk.blue("============================ SEPERATOR ========================="));
		// console.log(chalk.yellow(`totalSupplyCERES_before: ${totalSupplyCERES_before}`));
		// console.log(chalk.yellow(`totalSupplyCSS_before: ${totalSupplyCSS_before}`));

		// console.log(chalk.yellow(`account5_ceres_before: ${ceres_before}`));
		// console.log(chalk.yellow(`account5_css_before: ${css_before}`));
		// console.log(chalk.yellow(`account5_usdc_before: ${usdc_before}`));
		// console.log(chalk.yellow(`pool_ceres_before: ${pool_ceres_before}`));
		// console.log(chalk.yellow(`pool_css_before: ${pool_css_before}`));
		// console.log(chalk.yellow(`pool_usdc_before: ${pool_usdc_before}`));

		// ACTION

		// Need to approve first so the pool contract can use transfer
		const ceres_amount = new BigNumber("135242531948024e6");
		await ceresInstance.transfer(account5,ceres_amount,{from: OWNER});

		await ceresInstance.approve(pool_instance_USDC.address, ceres_amount, { from: account5 });
		await col_instance_USDC.approve(pool_instance_USDC.address, TWO_MILLION_DEC6, { from: account5 });
		
		// Redeem some CERES
		await pool_instance_USDC.redeemFractionalCERES(ceres_amount, new BigNumber("1e6"), new BigNumber("1e6"), { from: account5 });
		// Collect redemption
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await pool_instance_USDC.collectRedemption({ from: account5 });

		// Note the collateral and CERES amounts before REDEEM
		const totalSupplyCERES_after = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_after = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const ceres_after = new BigNumber(await ceresInstance.balanceOf.call(account5)).div(BIG18);
		const css_after = new BigNumber(await cssInstance.balanceOf.call(account5)).div(BIG18);
		const usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(account5)).div(BIG6);

		const pool_ceres_after = new BigNumber(await ceresInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18); 
		const pool_css_after = new BigNumber(await cssInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const pool_usdc_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
		// console.log(chalk.blue("============================ SEPERATOR ========================="));
		// console.log(chalk.yellow(`totalSupplyCERES_after: ${totalSupplyCERES_after}`));
		// console.log(chalk.yellow(`totalSupplyCSS_after: ${totalSupplyCSS_after}`));

		// console.log(chalk.yellow(`account5_ceres_after: ${ceres_after}`));
		// console.log(chalk.yellow(`account5_css_after: ${css_after}`));
		// console.log(chalk.yellow(`account5_usdc_after: ${usdc_after}`));
		// console.log(chalk.yellow(`pool_ceres_after: ${pool_ceres_after}`));
		// console.log(chalk.yellow(`pool_css_after: ${pool_css_after}`));
		// console.log(chalk.yellow(`pool_usdc_after: ${pool_usdc_after}`));


		console.log(chalk.blue("============================ SEPERATOR ========================="));
		console.log(chalk.yellow("ceres total supply change: ", totalSupplyCERES_after.toNumber() - totalSupplyCERES_before.toNumber()));
		console.log(chalk.yellow("css total supply change: ", totalSupplyCSS_after.toNumber() - totalSupplyCSS_before.toNumber()));
		console.log(chalk.yellow("account5_ceres change: ", ceres_after.toNumber() - ceres_before.toNumber()));
		console.log(chalk.yellow("account5_css change: ", css_after.toNumber() - css_before.toNumber()));
		console.log(chalk.yellow("account5_usdc change: ", usdc_after.toNumber() - usdc_before.toNumber()));
		console.log(chalk.yellow("pool_ceres_change: ", pool_ceres_after.toNumber() - pool_ceres_before.toNumber()));
		console.log(chalk.yellow("pool_css_change: ", pool_css_after.toNumber() - pool_css_before.toNumber()));
		console.log(chalk.yellow("pool_usdc_change: ", pool_usdc_after.toNumber() - pool_usdc_before.toNumber()));
	});

	it("[recollateralizeCERES][ACCOUNT5]: Recollateralizes the system using recollateralizeCERES()",async() => {
		console.log(chalk.blue("============USDC recollateralizeCERES(ACCOUNT5)============"));

		const totalSupplyCERES_before = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18);
		const totalSupplyCSS_before = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18);
		const ceres_before = new BigNumber(await ceresInstance.balanceOf.call(account5)).div(BIG18);
		const css_before = new BigNumber(await cssInstance.balanceOf.call(account5)).div(BIG18);
		const usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(account5)).div(BIG6);
		const pool_ceres_before = new BigNumber(await ceresInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18); 
		const pool_css_before = new BigNumber(await cssInstance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const pool_usdc_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);

		console.log(chalk.blue("============================ SEPERATOR ========================="));
		console.log(chalk.yellow(`totalSupplyCERES_before: ${totalSupplyCERES_before}`));
		console.log(chalk.yellow(`totalSupplyCSS_before: ${totalSupplyCSS_before}`));

		console.log(chalk.yellow(`account5_ceres_before: ${ceres_before}`));
		console.log(chalk.yellow(`account5_css_before: ${css_before}`));
		console.log(chalk.yellow(`account5_usdc_before: ${usdc_before}`));
		console.log(chalk.yellow(`pool_ceres_before: ${pool_ceres_before}`));
		console.log(chalk.yellow(`pool_css_before: ${pool_css_before}`));
		console.log(chalk.yellow(`pool_usdc_before: ${pool_usdc_before}`));

	});




});













