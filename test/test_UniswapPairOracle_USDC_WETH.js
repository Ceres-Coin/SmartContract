const BigNumber = require('bignumber.js');
const BN = BigNumber.clone({ DECIMAL_PLACES: 9 })
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

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
console.log(chalk.yellow('===== SET CONSTANTS ====='));
const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6");
const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);

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

// ChainlinkETHUSD Contract
const ChainlinkETHUSDPriceConsumerTest2 = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest2");

const Pool_USDC = artifacts.require("Ceres/Pools/Pool_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");



contract('Oracle_Instance_USDC_WETH', async (accounts) => {
	// deploy address;
	let ADMIN;
	let COLLATERAL_CERES_AND_CERESHARES_OWNER;

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

	let first_CERES_WETH;
	let first_CERES_USDC;
	let first_CSS_WETH;
	let first_CSS_USDC;

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

	
	// USDC_Pool Constants
	const PRICE_PRECISION = new BigNumber(1e6);
	const COLLATERAL_RATIO_PRECISION = new BigNumber(1e6);
	const COLLATERAL_RATIO_MAX = new BigNumber(1e6);
	const MISSING_DECIMALS = 12;

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

	// Core
	let instantce_UniswapPairOracle_USDC_WETH;
	

    beforeEach(async() => {
		console.log(chalk.white.bgRed.bold("====================== BEFORE EACH TEST CASE ======================"));

		ADMIN = accounts[0];
		COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];

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
		
		instantce_UniswapPairOracle_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();

		

    });

	it("UniswapPairOracle_USDC_WETH Initialize", async () => {
		console.log(chalk.red("============ UniswapPairOracle_USDC_WETH Initialize ============"));
		console.log(chalk.yellow("instantce_UniswapPairOracle_USDC_WETH: ",instantce_UniswapPairOracle_USDC_WETH.address));
	});

	it("UniswapPairOracle_USDC_WETH token0 & token1", async () => {
		console.log(chalk.red("============ UniswapPairOracle_USDC_WETH token0 & token1 ============"));
		console.log(chalk.blue("ER: col_instance_USDC: ",col_instance_USDC.address));
		console.log(chalk.blue("ER: wethInstance: ",wethInstance.address));

		// Action
		const ar_token0 = await instantce_UniswapPairOracle_USDC_WETH.token0();
		const ar_token1 = await instantce_UniswapPairOracle_USDC_WETH.token1();

		// Print
		console.log(chalk.yellow("AR: ar_token0: ",ar_token0.toString()));
		console.log(chalk.yellow("AR: ar_token1: ",ar_token1.toString()));
		
	});

	it("instantce_UniswapPairOracle_USDC_WETH consult", async () => {
		console.log(chalk.red("============ instantce_UniswapPairOracle_USDC_WETH consult ============"));
		console.log(chalk.blue("instantce_UniswapPairOracle_USDC_WETH: ",instantce_UniswapPairOracle_USDC_WETH.address));
		
		// BEFORE
		// const ar_ceres_price = await oracle_instance_CERES_WETH.consult.call(wethInstance.address, 1e6);
		const ar_usdc_price_before = (new BigNumber(await instantce_UniswapPairOracle_USDC_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();

		// ACTION
		// time.increase 1 day & update oracle_instance_CERES_WETH;
		console.log(chalk.yellow("Time.increase 1 day"));
		await time.increase(86400 + 1);
		await time.advanceBlock();
		await instantce_UniswapPairOracle_USDC_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

		// AFTER
		const ar_usdc_price_after = (new BigNumber(await instantce_UniswapPairOracle_USDC_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();

		// Print
		console.log(chalk.yellow("AR: ar_usdc_price_before: ",ar_usdc_price_before.toString()));	
		console.log(chalk.yellow("AR: ar_usdc_price_after: ",ar_usdc_price_after.toString()));		
	});

	it("instantce_UniswapPairOracle_USDC_WETH blockTimestampLast", async () => {
		console.log(chalk.red("============ instantce_UniswapPairOracle_USDC_WETH blockTimestampLast ============"));
		console.log(chalk.blue("instantce_UniswapPairOracle_USDC_WETH: ",instantce_UniswapPairOracle_USDC_WETH.address));
		
		// BEFORE
		// const ar_ceres_price = await oracle_instance_CERES_WETH.consult.call(wethInstance.address, 1e6);
		const ar_blockTimestampLast = await instantce_UniswapPairOracle_USDC_WETH.blockTimestampLast.call();
		console.log(chalk.yellow("ar_blockTimestampLast: ",ar_blockTimestampLast.toString()));

	});

	it("instantce_UniswapPairOracle_USDC_WETH canUpdate", async () => {
		console.log(chalk.red("============ instantce_UniswapPairOracle_USDC_WETH canUpdate ============"));
		console.log(chalk.blue("instantce_UniswapPairOracle_USDC_WETH: ",instantce_UniswapPairOracle_USDC_WETH.address));
		
		const ar_canUpdate = await instantce_UniswapPairOracle_USDC_WETH.canUpdate();
		console.log(chalk.yellow("ar_canUpdate: ",ar_canUpdate.toString()));

	});

});

















