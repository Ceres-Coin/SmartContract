const BigNumber = require('bignumber.js');
const BN = BigNumber.clone({ DECIMAL_PLACES: 9 })
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert, expect } = require('chai');

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

contract('test_CERES_USDC_Pool_P2', async (accounts) => {
	// deploy address;
	let ADMIN;
	let COLLATERAL_CERES_AND_CERESHARES_OWNER;
	let OWNER;

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

	const MINTING_FEE_MODIFIED = 600; // 0.06%
	const REDEMPTION_FEE_MODIFIED = 800; // 0.08%
	const BUYBACK_FEE_MODIFIED = 200; //0.02%
	const RECOLLAT_FEE_MODIFIED = 200; //0.02%

	
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

    beforeEach(async() => {
		ADMIN = accounts[0];
		COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
		OWNER = accounts[1];
		const account0 = accounts[0];
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];
		const account4 = accounts[4];
		const account5 = accounts[5];
		const account6 = accounts[6];
		const account7 = accounts[7];

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
    });

	it ("[FUNC][toggleMinting] test scripts", async() => {
		expect(await pool_instance_USDC.mintPaused()).to.equal(false);
		await pool_instance_USDC.toggleMinting({from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
		expect(await pool_instance_USDC.mintPaused()).to.equal(true);
	});

	it ("[FUNC][setOwner] test scripts", async() => {
		// Before
		expect(await pool_instance_USDC.owner_address()).to.equal(COLLATERAL_CERES_AND_CERESHARES_OWNER);
		// Action
		await pool_instance_USDC.setOwner(ADMIN,{from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
		// Assetion
		expect (await pool_instance_USDC.owner_address()).to.equal(ADMIN);
		// Roll back
		await pool_instance_USDC.setOwner(COLLATERAL_CERES_AND_CERESHARES_OWNER,{from: ADMIN});
		expect(await pool_instance_USDC.owner_address()).to.equal(COLLATERAL_CERES_AND_CERESHARES_OWNER);
	});

	it ("[FUNC][setPoolParameters] test scripts ",async() => {
		// ACTION
		await pool_instance_USDC.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, MINTING_FEE_MODIFIED, REDEMPTION_FEE_MODIFIED, BUYBACK_FEE_MODIFIED, RECOLLAT_FEE_MODIFIED, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		// ASSERTION
		// console.log(chalk.yellow((new BigNumber(await pool_instance_USDC.minting_fee())).toNumber()));
		expect((new BigNumber(await pool_instance_USDC.minting_fee())).toNumber()).to.equal(MINTING_FEE_MODIFIED);
		expect((new BigNumber(await pool_instance_USDC.redemption_fee())).toNumber()).to.equal(REDEMPTION_FEE_MODIFIED);
		expect((new BigNumber(await pool_instance_USDC.buyback_fee())).toNumber()).to.equal(BUYBACK_FEE_MODIFIED);
		expect((new BigNumber(await pool_instance_USDC.recollat_fee())).toNumber()).to.equal(RECOLLAT_FEE_MODIFIED);

		// ROLLBACK
		await pool_instance_USDC.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, MINTING_FEE, REDEMPTION_FEE, BUYBACK_FEE, RECOLLAT_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		expect((new BigNumber(await pool_instance_USDC.minting_fee())).toNumber()).to.equal(MINTING_FEE);
		expect((new BigNumber(await pool_instance_USDC.redemption_fee())).toNumber()).to.equal(REDEMPTION_FEE);
		expect((new BigNumber(await pool_instance_USDC.buyback_fee())).toNumber()).to.equal(BUYBACK_FEE);
		expect((new BigNumber(await pool_instance_USDC.recollat_fee())).toNumber()).to.equal(RECOLLAT_FEE);
	});

	it ("[FUNC][setTimelock] test scripts ",async() => {
		const instanceTimelock = await Timelock.deployed();
		const instanceTimelockTest = await TimelockTest.deployed();
		// Before
		expect(await pool_instance_USDC.timelock_address()).to.equal(instanceTimelock.address);
		// Action
		await pool_instance_USDC.setTimelock(instanceTimelockTest.address,{from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
		// Assertion
		expect(await pool_instance_USDC.timelock_address()).to.equal(instanceTimelockTest.address);
		// Roll Back
		await pool_instance_USDC.setTimelock(instanceTimelock.address,{from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
	});

	it ("[FUNC][toggleBuyBack] test scripts ", async() => {
		// console.log(chalk.yellow(await pool_instance_USDC.buyBackPaused()));
		expect(await pool_instance_USDC.buyBackPaused()).to.equal(false);
		await pool_instance_USDC.toggleBuyBack({from:COLLATERAL_CERES_AND_CERESHARES_OWNER});
		expect(await pool_instance_USDC.buyBackPaused()).to.equal(true);

		// roll back code
		await pool_instance_USDC.toggleBuyBack({from:COLLATERAL_CERES_AND_CERESHARES_OWNER});
		expect(await pool_instance_USDC.buyBackPaused()).to.equal(false);
	});

	it ("[FUNC][collatEthOracle_eth_collat_price] test scripts", async() => {
		// console.log(chalk.yellow(`collateralPricePaused: ${await pool_instance_USDC.collateralPricePaused()}`));
		// console.log(chalk.yellow(`pausedPrice: ${await pool_instance_USDC.pausedPrice()}`));
		// console.log(chalk.yellow(`collatEthOracle_eth_collat_price: ${await pool_instance_USDC.collatEthOracle_eth_collat_price()}`));
	});

	it ("Test Scripts for CERES_USDC_POOL.missing_decimals ", async() => {
		const missing_decimals = (new BigNumber(await pool_instance_USDC.missing_decimals())).toNumber();
		expect(missing_decimals).to.equal(12);
	})

	it ("Test Scripts for CERES_USDC_POOL.collateral_token ",async() => {
		const collateral_token = await pool_instance_USDC.collateral_token();
		expect(collateral_token).not.to.be.empty;
	});

	it ("Test Scripts for CERES_USDC_POOL.ceres_eth_usd_price ",async() => {
		const ceres_eth_usd_price = (new BigNumber(await pool_instance_USDC.ceres_eth_usd_price())).toNumber();
		// console.log(chalk.yellow(`ceres_eth_usd_price: ${ceres_eth_usd_price}`));		
	});
	
	it ("Test Scripts for CERES_USDC_POOL.collatEthOracle_eth_collat_price", async() => {
		const collatEthOracle_eth_collat_price = (new BigNumber(await pool_instance_USDC.collatEthOracle_eth_collat_price())).toNumber();
		// console.log(chalk.yellow(`collatEthOracle_eth_collat_price: ${collatEthOracle_eth_collat_price}`));
	});

	// TODO: To Tuning the test scripts of CERES_USDC_POOL.collatDollarBalance()
	it ("Test Scripts for CERES_USDC_POOL.collatDollarBalance()", async() => {
		const ceres_eth_usd_price = (new BigNumber(await pool_instance_USDC.ceres_eth_usd_price())).toNumber();
		const collatEthOracle_eth_collat_price = (new BigNumber(await pool_instance_USDC.collatEthOracle_eth_collat_price())).toNumber();
		
		// console.log(ceres_eth_usd_price);
		// console.log(collatEthOracle_eth_collat_price);

		// const collat_usd_price = ceres_eth_usd_price.mul(1000000).div(collatEthOracle_eth_collat_price);
		// console.log("collat_usd_price: ", collat_usd_price);

		const collatDollarBalance = (new BigNumber(await pool_instance_USDC.collatDollarBalance())).toNumber();
		// console.log(chalk.yellow(`collatDollarBalance: ${collatDollarBalance}`));
	});

	it ("Test Scripts for tmpValue() ", async() => {
		// console.log(`tmpValue: ${await pool_instance_USDC.tmpValue()}`);
		// console.log(`tmpValue2: ${await pool_instance_USDC.tmpValue2()}`);
		expect((new BigNumber(await pool_instance_USDC.tmpValue())).toNumber()).to.equal(0);
		expect((new BigNumber(await pool_instance_USDC.tmpValue2())).toNumber()).to.equal(0);
	});

	it ("Test Scripts for getCollateralPrice()", async() => {
		// console.log(`getCollateralPrice: ${await pool_instance_USDC.getCollateralPrice()}`);
		expect(await pool_instance_USDC.getCollateralPrice()).not.to.be.empty;
	});

	it ("Test Scripts for toggleCollateralPrice()", async() => {
		// Before
		const OLDVALUE = (new BigNumber(await pool_instance_USDC.pausedPrice())).toNumber();
		// ACTION
		const NEWVALUE = 1000000;
		await pool_instance_USDC.toggleCollateralPrice(NEWVALUE,{from: OWNER});
		const toggleCollateralPrice = (new BigNumber(await pool_instance_USDC.pausedPrice())).toNumber();
		// ASSERTION
		expect(toggleCollateralPrice).to.equal(NEWVALUE);
		// Roll back
		await pool_instance_USDC.toggleCollateralPrice(OLDVALUE,{from: OWNER});
	});

	it ("Test Scripts for redeemPaused()", async() => {
		// Before
		const OLDVALUE = await pool_instance_USDC.redeemPaused();
		// ACTION
		await pool_instance_USDC.toggleRedeeming({from: OWNER});
		const NEWVALUE = await pool_instance_USDC.redeemPaused();
		// ASSERTION
		expect(NEWVALUE).to.equal(!OLDVALUE);

		// ROLLBACK
		await pool_instance_USDC.toggleRedeeming({from: OWNER});
		const ROLLBACKVALUE = await pool_instance_USDC.redeemPaused();
		expect(ROLLBACKVALUE).to.equal(OLDVALUE);
	});

	it ("Test Scripts for toggleRecollateralize()", async() => {
		// Before
		const OLDVALUE = await pool_instance_USDC.recollateralizePaused();
		// ACTION
		await pool_instance_USDC.toggleRecollateralize({from: OWNER});
		const NEWVALUE = await pool_instance_USDC.recollateralizePaused();
		// ASSERTION
		expect(NEWVALUE).to.equal(!OLDVALUE);

		// ROLLBACK
		await pool_instance_USDC.toggleRecollateralize({from: OWNER});
		const ROLLBACKVALUE = await pool_instance_USDC.recollateralizePaused();
		expect(ROLLBACKVALUE).to.equal(OLDVALUE);
	});

	it ("Test Scripts for availableExcessCollatDV() func, its default value is 0", async() => {
		const availableExcessCollatDV = (new BigNumber(await pool_instance_USDC.availableExcessCollatDV())).toNumber();		
		expect(availableExcessCollatDV).to.equal(0)
	});



});













