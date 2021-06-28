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
const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6");
const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const SIX_HUNDRED_DEC18 = new BigNumber(600e18);
const SIX_HUNDRED_DEC6 = new BigNumber(600e6);
const ONE_DEC18 = new BigNumber(1e18);
const ONE_HUNDRED_DEC18 = new BigNumber(100e18);
const ONE_HUNDRED_DEC6 = new BigNumber(100e6);
const MISSING_DECIMALS_DEC12 = new BigNumber(1e12);
const Number133_DEC18 = new BigNumber(133e18);
const EIGHT_HUNDRED_DEC18 = new BigNumber(800e18);
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

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

const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_USDC_WETH");

contract('oracle_instance_CSS_WETH', async (accounts) => {
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

	let pair_addr_USDC_WETH;

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
	let first_USDC_WETH;

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
	
	

    beforeEach(async() => {
		

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
		
		oracle_instance_CERES_WETH = await UniswapPairOracle_CERES_WETH.deployed();
		oracle_instance_CERES_USDC = await UniswapPairOracle_CERES_USDC.deployed();
		oracle_instance_CSS_WETH = await UniswapPairOracle_CSS_WETH.deployed();
		oracle_instance_CSS_USDC = await UniswapPairOracle_CSS_USDC.deployed();
		oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();

		first_CERES_WETH = await oracle_instance_CERES_WETH.token0();
		first_CERES_USDC = await oracle_instance_CERES_USDC.token0();
		first_CSS_WETH = await oracle_instance_CSS_WETH.token0();
		first_CSS_USDC = await oracle_instance_CSS_USDC.token0();
		first_USDC_WETH = await oracle_instance_USDC_WETH.token0();


		first_CERES_WETH = ceresInstance.address == first_CERES_WETH;
		first_CERES_USDC = ceresInstance.address == first_CERES_USDC;
		first_CSS_WETH = cssInstance.address == first_CSS_WETH;
		first_CSS_USDC = cssInstance.address == first_CSS_USDC;
		first_USDC_WETH = col_instance_USDC.address == first_USDC_WETH;

		pair_addr_CERES_WETH = await uniswapFactoryInstance.getPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		pair_addr_CERES_USDC = await uniswapFactoryInstance.getPair(ceresInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		pair_addr_CSS_USDC = await uniswapFactoryInstance.getPair(cssInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		pair_addr_CSS_WETH = await uniswapFactoryInstance.getPair(cssInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		

    });

	// // Always Passed
	// // No Assertion
	it("oracle_instance_CSS_WETH Initialize", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH Initialize ============"));
		console.log(chalk.green.bold("NO ASSERTION"));
		console.log(chalk.green.bold("first_CSS_WETH: ",first_CSS_WETH));

		console.log(chalk.yellow("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));
		
	});

	it("oracle_instance_CSS_WETH token0 & token1", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH token0 & token1 ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));

		// Before
		const er_token0 = cssInstance.address;
		const er_token1 = wethInstance.address;

		// Print ER
		console.log(chalk.blue("ER: cssInstance: ",er_token0));
		console.log(chalk.blue("ER: wethInstance: ",er_token1));

		// Action
		const ar_token0 = await oracle_instance_CSS_WETH.token0();
		const ar_token1 = await oracle_instance_CSS_WETH.token1();
		
		// Print
		console.log(chalk.yellow("AR: ar_token0: ",ar_token0.toString()));
		console.log(chalk.yellow("AR: ar_token1: ",ar_token1.toString()));

		// Assert
		console.log(chalk.green.bold("first_CSS_WETH: ",first_CSS_WETH));
		if (first_CSS_WETH) {
			assert.equal(er_token0,ar_token0);
			assert.equal(er_token1,ar_token1);
		} else {
			assert.equal(er_token0,ar_token1);
			assert.equal(er_token1,ar_token0);
		}
	});

	it("oracle_instance_CSS_WETH reserve0 & reserve1", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH reserve0 & reserve1 ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));
		
		// Action
		const ar_reserve0 = (await oracle_instance_CSS_WETH.reserve0.call()).toString();
		const ar_reserve1 = (await oracle_instance_CSS_WETH.reserve1.call()).toString();

		// Print
		console.log(chalk.yellow("ar_reserve0: ",ar_reserve0.toString()));
		console.log(chalk.yellow("ar_reserve1: ",ar_reserve1.toString()));

		console.log(chalk.green.bold("first_CSS_WETH: ",first_CSS_WETH));

		// ASSERT
		let ER_reserve0;
		let ER_reserve1;
		if (first_CSS_WETH) {
			ER_reserve0 = EIGHT_HUNDRED_DEC18.toString();
			ER_reserve1 = ONE_DEC18.toString();
		} else {
			ER_reserve0 = ONE_DEC18.toString();
			ER_reserve1 = EIGHT_HUNDRED_DEC18.toString();
		}

		console.log(chalk.blue("ER_reserve0: ",ER_reserve0));
		console.log(chalk.blue("ER_reserve1: ",ER_reserve1));

		assert.equal(ar_reserve0,ER_reserve0,chalk.red.bold("ASSERTION FAILED"));
		assert.equal(ar_reserve1,ER_reserve1,chalk.red.bold("ASSERTION FAILED"));
	});


	it("oracle_instance_CSS_WETH Price0 & Price1", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH Price0 & Price1 ============"));
		console.log(chalk.blue("ER: oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));
		
		// Before
		const ar_price0CumulativeLast_before = await oracle_instance_CSS_WETH.price0CumulativeLast.call();
		const ar_price1CumulativeLast_before = await oracle_instance_CSS_WETH.price1CumulativeLast.call();

		// ACTION
		// time.increase 1 day 
		console.log(chalk.yellow("Time.increase 1 day"));
		await time.increase(86400 + 1);
		await time.advanceBlock();
		await oracle_instance_CSS_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

		// AFTER
		const ar_price0CumulativeLast_after = await oracle_instance_CSS_WETH.price0CumulativeLast.call();
		const ar_price1CumulativeLast_after = await oracle_instance_CSS_WETH.price1CumulativeLast.call();

		// Assert
		console.log(chalk.green.bold("NO ASSERTION"));

		// Print
		console.log(chalk.yellow("AR: ar_price0CumulativeLast_before: ",ar_price0CumulativeLast_before.toString()));
		console.log(chalk.yellow("AR: ar_price1CumulativeLast_before: ",ar_price1CumulativeLast_before.toString()));

		console.log(chalk.yellow("AR: ar_price0CumulativeLast_after: ",ar_price0CumulativeLast_after.toString()));
		console.log(chalk.yellow("AR: ar_price1CumulativeLast_after: ",ar_price1CumulativeLast_after.toString()));
		
	});

	it("oracle_instance_CSS_WETH consult", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH consult ============"));
		console.log(chalk.blue("ER: oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));
		
		// BEFORE
		const ar_ceres_price_before = (new BigNumber(await oracle_instance_CSS_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6).toNumber();

		// ACTION
		// time.increase 1 day
		console.log(chalk.yellow("Time.increase 1 day"));
		await time.increase(86400 + 1);
		await time.advanceBlock();
		await oracle_instance_CSS_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

		// AFTER
		const ar_ceres_price_after = (new BigNumber(await oracle_instance_CSS_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6).toNumber();
		
		// Assert
		console.log(chalk.green.bold("NO ASSERTION"));

		// Print
		console.log(chalk.yellow("AR: ar_ceres_price_before: ",ar_ceres_price_before.toString()));	
		console.log(chalk.yellow("AR: ar_ceres_price_after: ",ar_ceres_price_after.toString()));		
	});

	it("oracle_instance_CSS_WETH blockTimestampLast", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH blockTimestampLast ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));
		
		// ACTION
		const ar_blockTimestampLast = await oracle_instance_CSS_WETH.blockTimestampLast.call();

		// ASSERT
		console.log(chalk.green.bold("NO ASSERTION"));

		// PRINT
		console.log(chalk.yellow("ar_blockTimestampLast: ",ar_blockTimestampLast.toString()));
	});

	it("oracle_instance_CSS_WETH price0Average & price1Average", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH price0Average & price0Average ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));
		
		// Action
		const ar_price0Average = await oracle_instance_CSS_WETH.price0Average.call();
		const ar_price1Average = await oracle_instance_CSS_WETH.price1Average.call();

		// ASSERT
		console.log(chalk.green.bold("NO ASSERTION"));

		// Print
		console.log(chalk.yellow("ar_price0Average: ",ar_price0Average.toString()));
		console.log(chalk.yellow("ar_price1Average: ",ar_price1Average.toString()));

		// ACTION
		// time.increase 1 day 
		console.log(chalk.yellow("Time.increase 1 day"));
		await time.increase(86400 + 1);
		await time.advanceBlock();
		await oracle_instance_CSS_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

		// Action
		const ar_price0Average_after = await oracle_instance_CSS_WETH.price0Average.call();
		const ar_price1Average_after = await oracle_instance_CSS_WETH.price1Average.call();

		// ASSERT
		console.log(chalk.green.bold("NO ASSERTION"));

		// Print
		console.log(chalk.yellow("ar_price0Average_after: ",ar_price0Average_after.toString()));
		console.log(chalk.yellow("ar_price1Average_after: ",ar_price1Average_after.toString()));
	});

	it("oracle_instance_CSS_WETH pair_address", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH pair_address ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));
		
		// Before
		console.log(chalk.blue("er: pair_addr_CSS_WETH: ",pair_addr_CSS_WETH.toString()));

		// Action
		const ar_pair_address = (await oracle_instance_CSS_WETH.pair_address.call()).toString();

		// ASSERT
		assert.equal(pair_addr_CSS_WETH.toString(),ar_pair_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.yellow("ar_pair_address: ",ar_pair_address.toString()));
	});

	it("oracle_instance_CSS_WETH owner_address", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH owner_address ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));

		// Before
		const er_owner_address = COLLATERAL_CERES_AND_CERESHARES_OWNER;
		
		// Action
		const ar_owner_address = await oracle_instance_CSS_WETH.owner_address.call();

		// Assert
		assert.equal(er_owner_address,ar_owner_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.blue("er_owner_address: ",er_owner_address));
		console.log(chalk.yellow("ar_owner_address: ",ar_owner_address.toString()));
	});

	it("oracle_instance_CSS_WETH timelock_address", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH timelock_address ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));

		// Before
		const er_timelock_address = timelockInstance.address;
		
		// Action
		const ar_timelock_address = await oracle_instance_CSS_WETH.timelock_address.call();

		// Assert
		assert.equal(er_timelock_address,ar_timelock_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.blue("er_timelock_address: ",er_timelock_address));
		console.log(chalk.yellow("ar_timelock_address: ",ar_timelock_address.toString()));
	});

	it("oracle_instance_CSS_WETH Constants ", async () => {
		console.log(chalk.red("============ oracle_instance_CSS_WETH timelock_address ============"));
		console.log(chalk.blue("oracle_instance_CSS_WETH: ",oracle_instance_CSS_WETH.address));

		// Before
		const er_PERIOD = 3600; // 1 hour TWAP (time-weighted average price)
		const er_CONSULT_LENIENCY = 120; // Used for being able to consult past the period end
		const er_ALLOW_STALE_CONSULTS = true; // If false, consult() will fail if the TWAP is stale
		
		// Action
		const ar_PERIOD = await oracle_instance_CSS_WETH.PERIOD.call();
		const ar_CONSULT_LENIENCY = await oracle_instance_CSS_WETH.CONSULT_LENIENCY.call();
		const ar_ALLOW_STALE_CONSULTS = await oracle_instance_CSS_WETH.ALLOW_STALE_CONSULTS.call();

		// Assert
		assert.equal(er_PERIOD,ar_PERIOD);
		assert.equal(er_CONSULT_LENIENCY,ar_CONSULT_LENIENCY);
		assert.equal(er_ALLOW_STALE_CONSULTS,ar_ALLOW_STALE_CONSULTS);

		// Print
		console.log(chalk.blue("er_PERIOD: ",er_PERIOD));
		console.log(chalk.blue("er_Per_CONSULT_LENIENCYERIOD: ",er_CONSULT_LENIENCY));
		console.log(chalk.blue("er_ALLOW_STALE_CONSULTS: ",er_ALLOW_STALE_CONSULTS));

		console.log(chalk.yellow("ar_PERIOD: ",ar_PERIOD.toString()));
		console.log(chalk.yellow("ar_CONSULT_LENIENCY: ",ar_CONSULT_LENIENCY.toString()));
		console.log(chalk.yellow("ar_ALLOW_STALE_CONSULTS: ",ar_ALLOW_STALE_CONSULTS.toString()));
	});


	
});

















