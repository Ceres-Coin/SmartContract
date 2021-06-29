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

	it ("Test Scripts for collat_eth_oracle_address()", async() => {
		const collat_eth_oracle_address = await pool_instance_USDC.collat_eth_oracle_address();
		// console.log(chalk.yellow(`collat_eth_oracle_address: ${collat_eth_oracle_address}`));
		expect(collat_eth_oracle_address).to.not.be.empty;
	});

	it ("Print Parameters", async() => {
		// PRINT
		console.log(chalk.yellow("=================== PRINT PARAMETERS for Contract================="));
		console.log(chalk.yellow(`timelock_address: ${await pool_instance_USDC.timelock_address()}`));
		console.log(chalk.yellow(`owner_address: ${await pool_instance_USDC.owner_address()}`));
		console.log(chalk.yellow(`collat_eth_oracle_address: ${await pool_instance_USDC.collat_eth_oracle_address()}`));

		// ASSERTION
		expect(await pool_instance_USDC.owner_address()).to.equal(OWNER);
		expect(await pool_instance_USDC.timelock_address()).to.equal(timelockInstance.address);
		
		console.log(chalk.yellow("=================== PRINT PARAMETERS for Token================="));
		console.log(chalk.yellow(`ceres_contract_address: ${await pool_instance_USDC.ceres_contract_address()}`));
		console.log(chalk.yellow(`css_contract_address: ${await pool_instance_USDC.css_contract_address()}`));
		console.log(chalk.yellow(`weth_address: ${await pool_instance_USDC.weth_address()}`));
		console.log(chalk.yellow(`collateral_address: ${await pool_instance_USDC.collateral_address()}`));
		
		// ASSERTION
		expect(await pool_instance_USDC.ceres_contract_address()).to.equal(ceresInstance.address);
		expect(await pool_instance_USDC.css_contract_address()).to.equal(cssInstance.address);
		expect(await pool_instance_USDC.weth_address()).to.equal(wethInstance.address);
		expect(await pool_instance_USDC.collateral_address()).to.equal(col_instance_USDC.address);
	})

	it ("Print Parameters P2", async() => {
		// GET
		const PRICE_PRECISION = (new BigNumber(await pool_instance_USDC.PRICE_PRECISION())).toNumber();
		const COLLATERAL_RATIO_PRECISION = (new BigNumber(await pool_instance_USDC.COLLATERAL_RATIO_PRECISION())).toNumber();
		const COLLATERAL_RATIO_MAX = (new BigNumber(await pool_instance_USDC.COLLATERAL_RATIO_MAX())).toNumber();
		// ASSERTION
		expect(PRICE_PRECISION).to.equal(BIG6.toNumber());
		expect(COLLATERAL_RATIO_PRECISION).to.equal(BIG6.toNumber());
		expect(COLLATERAL_RATIO_MAX).to.equal(BIG6.toNumber());

		// GET-2
		const missing_decimals = (new BigNumber(await pool_instance_USDC.missing_decimals())).toNumber();
		const pausedPrice = (new BigNumber(await pool_instance_USDC.pausedPrice())).toNumber();
		const redemption_delay = (new BigNumber(await pool_instance_USDC.redemption_delay())).toNumber();
		const bonus_rate = (new BigNumber(await pool_instance_USDC.bonus_rate())).toNumber();
		// ASSERTION-2
		expect(missing_decimals).to.equal(12);
		expect(pausedPrice).to.equal(0);
		expect(redemption_delay).to.equal(1);
		expect(bonus_rate).to.equal(7500);
	});

	it ("Print Parameters P3", async() => {
		// TEST CASE for AccessControl state variables
		// GET
		const mintPaused = await pool_instance_USDC.mintPaused();
		const redeemPaused = await pool_instance_USDC.redeemPaused();
		const recollateralizePaused = await pool_instance_USDC.recollateralizePaused();
		const buyBackPaused = await pool_instance_USDC.buyBackPaused();
		const collateralPricePaused = await pool_instance_USDC.collateralPricePaused();
		// ASSERTION
		expect(mintPaused).to.equal(false);
		expect(redeemPaused).to.equal(false);
		expect(recollateralizePaused).to.equal(false);
		expect(buyBackPaused).to.equal(false);
		expect(collateralPricePaused).to.equal(false);

	});

	it ("Test Cases for addresses of CERES & CSS", async() => {
		// TESE CASE for CERES & CSS address, it should be equal to ceresInstance/cssInstance.address
		// GET FOR CERES & CSS
		const CERES = await pool_instance_USDC.CERES();
		const CSS = await pool_instance_USDC.CSS();
		// ASSERTION for address
		expect(CERES).to.equal(ceresInstance.address);
		expect(CSS).to.equal(cssInstance.address);

		// const tmpCERES = await CEREStable.at(CERES);
		// const tmpCSS = await CEREShares.at(CSS);
	});

	it ("Test Cases for CERES Invoke Func in CERES_USDC_POOL", async() => {
		const instanceCERES = await CEREStable.at(await pool_instance_USDC.CERES());
		// console.log(chalk.yellow(`instanceCERES.name(): ${await instanceCERES.name()}`));
		// console.log(chalk.yellow(`instanceCERES.symbol(): ${await instanceCERES.symbol()}`));
		// console.log(chalk.yellow(`instanceCERES.decimals(): ${await instanceCERES.decimals()}`));
		// console.log(chalk.blue(`instanceCERES.eth_usd_price(): ${await instanceCERES.eth_usd_price()}`));

		const instanceCERES_name = await instanceCERES.name();
		const instanceCERES_symbol = await instanceCERES.symbol();
		const instanceCERES_decimals = (new BigNumber(await instanceCERES.decimals())).toNumber();
		const instanceCERES_eth_usd_price = (new BigNumber(await instanceCERES.eth_usd_price())).toNumber();

		expect(instanceCERES_name).to.equal("CERES");
		expect(instanceCERES_symbol).to.equal("CERES");
		expect(instanceCERES_decimals).to.equal(18);
		expect(instanceCERES_eth_usd_price).to.not.equal(0);
		// Verify the instance.eth_usd_price is equal to pool.ceres_eth_usd_price();
		expect(instanceCERES_eth_usd_price).to.equal((new BigNumber(await pool_instance_USDC.ceres_eth_usd_price())).toNumber());

	});

	it ("Test Cases for CSS Invoke Func in CERES_USDC_POOL", async() => {
		const instanceCSS = await CEREShares.at(await pool_instance_USDC.CSS());
		const instanceCSS_name = await instanceCSS.name();
		const instanceCSS_symbol = await instanceCSS.symbol();
		const instanceCSS_decimals = (new BigNumber(await instanceCSS.decimals())).toNumber();

		expect(instanceCSS_name).to.equal("CERES Share");
		expect(instanceCSS_symbol).to.equal("CSS");
		expect(instanceCSS_decimals).to.equal(18);
	});



});













