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
const UniswapPairOracle = artifacts.require("Oracle/UniswapPairOracle");

// ChainlinkETHUSD Contract
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

const Pool_USDC = artifacts.require("Ceres/Pools/Pool_USDC");

contract('test_CERES_Contract_P3', async (accounts) => {
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

    beforeEach(async() => {
		ADMIN = accounts[0];
		COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
		OWNER = accounts[1];
		METAMASK_ADDRESS = accounts[2];
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
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumerTest.deployed();
    });

	it ("Test Scripts for ceresInstance.address", async() => {
		const ceresInstance_address = await ceresInstance.address;
		// console.log(chalk.blue(`ceresInstance_address: ${ceresInstance_address}`));
		expect(ceresInstance_address).to.not.be.empty;
		expect(ceresInstance_address).to.not.be.undefined;
	});

	it ("Test Scripts for ceresInstance.pool_mint()",async() => {
		const balanceOf_before = parseFloat(await ceresInstance.balanceOf(METAMASK_ADDRESS));
		// console.log(chalk.yellow(`balanceOf_before: ${balanceOf_before}`));

		await ceresInstance.addPool(METAMASK_ADDRESS,{from: OWNER});
		await ceresInstance.pool_mint(METAMASK_ADDRESS,ONE_THOUSAND_DEC18,{from: METAMASK_ADDRESS});
		
		const balanceOf_after = parseFloat(await ceresInstance.balanceOf(METAMASK_ADDRESS));
		// console.log(chalk.yellow(`balanceOf_after: ${balanceOf_after}`));
		expect(balanceOf_after-balanceOf_before).to.equal(parseFloat(ONE_THOUSAND_DEC18));

		// ROLL BACK CODE
		await ceresInstance.removePool(METAMASK_ADDRESS,{from: OWNER});
	});

	it ("Test Scripts for ceresInstance.addPool() & removePool()", async() => {
		const ceres_pools_OWNER_BEFORE = await ceresInstance.ceres_pools(OWNER);
		// ASSERTION: DEFAULT VALUE IS FALSE
		expect(ceres_pools_OWNER_BEFORE).to.equal(false);
		// ACTION: AddPool()
		await ceresInstance.addPool(OWNER,{from: OWNER});

		const ceres_pools_OWNER_AFTER = await ceresInstance.ceres_pools(OWNER);
		// ASSERTION: AFTER AddPool(), VALUE IS CHANGED TO TRUE
		expect(ceres_pools_OWNER_AFTER).to.equal(true);
		
		// ACTION: RemovePool
		await ceresInstance.removePool(OWNER,{from: OWNER});
		const ceres_pools_OWNER_AFTER_RemovePool = await ceresInstance.ceres_pools(OWNER);
		// ASSERTION: // ASSERTION: AFTER RemovePool(), VALUE IS CHANGED TO FALSE
		expect(ceres_pools_OWNER_AFTER_RemovePool).to.equal(false);
		
	});

	it ("Test Scripts for ceresInstance.setOwner()", async() => {
		const owner_address = await ceresInstance.owner_address();
		expect(owner_address).to.equal(OWNER);
		// ACTION
		await ceresInstance.setOwner(ADMIN,{from: OWNER});
		// ASSERTION
		expect(await ceresInstance.owner_address()).to.equal(ADMIN);

		// ROLL BACK
		await ceresInstance.setOwner(OWNER,{from: ADMIN}); 
		expect(await ceresInstance.owner_address()).to.equal(OWNER);
	});

	it ("TEST SCRIPTS FOR ceresInstance.setRedemptionFee()",async() => {
		expect(parseFloat(await ceresInstance.redemption_fee())).to.equal(REDEMPTION_FEE);
		// ACTION & ASSERTION
		await ceresInstance.setRedemptionFee(REDEMPTION_FEE_MODIFIED,{from: OWNER});
		expect(parseFloat(await ceresInstance.redemption_fee())).to.equal(REDEMPTION_FEE_MODIFIED);
		// ROLLBACK CODE
		await ceresInstance.setRedemptionFee(REDEMPTION_FEE,{from: OWNER});
		expect(parseFloat(await ceresInstance.redemption_fee())).to.equal(REDEMPTION_FEE);
	});

	it ("TEST SCRIPTS FOR ceresInstance.setMintingFee()",async() => {
		expect(parseFloat(await ceresInstance.minting_fee())).to.equal(MINTING_FEE);
		// ACTION & ASSERTION
		await ceresInstance.setMintingFee(MINTING_FEE_MODIFIED,{from: OWNER});
		expect(parseFloat(await ceresInstance.minting_fee())).to.equal(MINTING_FEE_MODIFIED);
		// ROLLBACK CODE
		await ceresInstance.setMintingFee(MINTING_FEE,{from: OWNER});
		expect(parseFloat(await ceresInstance.minting_fee())).to.equal(MINTING_FEE);
	});

	it ("TEST SCRIPTS FOR ceresInstance.setCeresStep()",async() => {
		expect(parseFloat(await ceresInstance.ceres_step())).to.equal(CERES_STEP);
		// ACTION & ASSERTION
		await ceresInstance.setCeresStep(CERES_STEP_MODIFIED,{from: OWNER});
		expect(parseFloat(await ceresInstance.ceres_step())).to.equal(CERES_STEP_MODIFIED);
		// ROLLBACK CODE
		await ceresInstance.setCeresStep(CERES_STEP,{from: OWNER});
		expect(parseFloat(await ceresInstance.ceres_step())).to.equal(CERES_STEP);
	});

	it ("TEST SCRIPTS FOR ceresInstance.setPriceTarget()",async() => {
		expect(parseFloat(await ceresInstance.price_target())).to.equal(PRICE_TARGET);
		// ACTION & ASSERTION
		await ceresInstance.setPriceTarget(PRICE_TARGET_MODIFIED,{from: OWNER});
		expect(parseFloat(await ceresInstance.price_target())).to.equal(PRICE_TARGET_MODIFIED);
		// ROLLBACK CODE
		await ceresInstance.setPriceTarget(PRICE_TARGET,{from: OWNER});
		expect(parseFloat(await ceresInstance.price_target())).to.equal(PRICE_TARGET);
	});

	it ("TEST SCRIPTS FOR ceresInstance.setRefreshCooldown()",async() => {
		expect(parseFloat(await ceresInstance.refresh_cooldown())).to.equal(refresh_cooldown_default);
		// ACTION & ASSERTION
		await ceresInstance.setRefreshCooldown(refresh_cooldown_modified,{from: OWNER});
		expect(parseFloat(await ceresInstance.refresh_cooldown())).to.equal(refresh_cooldown_modified);
		// ROLLBACK CODE
		await ceresInstance.setRefreshCooldown(refresh_cooldown_default,{from: OWNER});
		expect(parseFloat(await ceresInstance.refresh_cooldown())).to.equal(refresh_cooldown_default);
	});

	it ("TEST SCRIPTS FOR ceresInstance.setCSSAddress()",async() => {
		// console.log(chalk.yellow(`ceresInstance.css_address, ${await ceresInstance.css_address()}`));
		expect(await ceresInstance.css_address()).to.equal(constants.ZERO_ADDRESS);
		// ACTION & ASSERTION
		await ceresInstance.setCSSAddress(cssInstance.address,{from: OWNER});
		expect(await ceresInstance.css_address()).to.equal(cssInstance.address);

		// ROLLBACK CODE
		await ceresInstance.setCSSAddress(constants.ZERO_ADDRESS,{from: OWNER});
		expect(await ceresInstance.css_address()).to.equal(constants.ZERO_ADDRESS);
	});

	it ("TEST SCRIPTS FOR ceresInstance.setTimelock()",async() => {
		// console.log(chalk.yellow(`timelock_address: ${await ceresInstance.timelock_address()}`));
		expect(await ceresInstance.timelock_address()).to.equal(timelockInstance.address);
		// ACTION & ASSERTION
		await ceresInstance.setTimelock(constants.ZERO_ADDRESS,{from: OWNER});
		expect(await ceresInstance.timelock_address()).to.equal(constants.ZERO_ADDRESS);

		// // ROLLBACK CODE
		await ceresInstance.setTimelock(timelockInstance.address,{from: OWNER});
		expect(await ceresInstance.timelock_address()).to.equal(timelockInstance.address);

	});

	it ("TEST SCRIPTS FOR ceresInstance.setController()", async() => {
		// BEFORE
		expect(await ceresInstance.controller_address()).to.equal(constants.ZERO_ADDRESS);
		// ACTION & ASSERTION
		await ceresInstance.setController(ADMIN,{from: OWNER});
		expect(await ceresInstance.controller_address()).to.equal(ADMIN);

		// ROLLBACK CODE
		await ceresInstance.setController(constants.ZERO_ADDRESS,{from: OWNER});
		expect(await ceresInstance.controller_address()).to.equal(constants.ZERO_ADDRESS);
	});

	it ("TEST SCRIPTS FOR ceresInstance.toggleCollateralRatio()", async() => {
		// BEFORE
		// console.log(chalk.yellow(`collateral_ratio_paused: ${await ceresInstance.collateral_ratio_paused()}`))
		expect(await ceresInstance.collateral_ratio_paused()).to.equal(false);
		// ACTION & ASSERTION
		await ceresInstance.toggleCollateralRatio({from: OWNER});
		expect(await ceresInstance.collateral_ratio_paused()).to.equal(true);

		// // ROLLBACK CODE
		await ceresInstance.toggleCollateralRatio({from: OWNER});
		expect(await ceresInstance.collateral_ratio_paused()).to.equal(false);
	});

	it ("Test Scripts for ceresInstance.ceresInfo() func", async() => {
		let info_before;
		console.log(chalk.blue("=========== get ceres_info before setRedemptionFee() & setMintingFee()  ========== "));
		info_before = await ceresInstance.ceres_info();
		console.log(chalk.blue("oracle_price CERES: ",info_before[0].toString()));
		console.log(chalk.blue("oracle_price CSS : ",info_before[1].toString()));
		console.log(chalk.blue("totalSupply: ",info_before[2].toString()));
		console.log(chalk.blue("global_collateral_ratio: ",info_before[3].toString()));
		console.log(chalk.blue("globalCollateralValue: ",info_before[4].toString()));
		console.log(chalk.blue("minting_fee: ",info_before[5].toString()));
		console.log(chalk.blue("redemption_fee: ",info_before[6].toString()));
		console.log(chalk.blue("eth_usd_price: ",info_before[7].toString()));
	});

	



});













