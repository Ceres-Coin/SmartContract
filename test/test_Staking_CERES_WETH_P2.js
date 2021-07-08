const BigNumber = require('bignumber.js');
const BN = BigNumber.clone({ DECIMAL_PLACES: 9 })
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert, expect } = require('chai');
const constants = require('@openzeppelin/test-helpers/src/constants');
const { parse } = require('path');

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
const ONE_HUNDRED_THOUSAND_DEC18 = new BigNumber("100000e18");
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
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const TokenVesting = artifacts.require("CSS/TokenVesting");
const StakingRewards_CERES_WETH = artifacts.require("Staking/Variants/Stake_CERES_WETH.sol");

contract('TEST SCRIPTS FOR test/test_Staking_CERES_WETH_P2.js', async (accounts) => {
	// deploy address;
	let ADMIN;
	let COLLATERAL_CERES_AND_CERESHARES_OWNER;
	let OWNER;
	let METAMASK_ADDRESS;
	let Beneficiary;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;

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
	let governanceInstance;
	let vestingInstance;
	let stakingInstance_CERES_WETH;

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
		Beneficiary = accounts[5];
		account0 = accounts[0];
		account1 = accounts[1];
		account2 = accounts[2];
		account3 = accounts[3];
		account4 = accounts[4];
		account5 = accounts[5];
		account6 = accounts[6];
		account7 = accounts[7];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];

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
		governanceInstance = await GovernorAlpha.deployed();
		vestingInstance = await TokenVesting.deployed();
		stakingInstance_CERES_WETH = await StakingRewards_CERES_WETH.deployed();
    });

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.periodFinish, its default value is 0", async() => {
		// console.log(chalk.yellow(`periodFinish: ${parseFloat(await stakingInstance_CERES_WETH.periodFinish())}`));
		const DEFAULT_VALUE = 0;
		expect(parseFloat(await stakingInstance_CERES_WETH.periodFinish())).to.equal(DEFAULT_VALUE);
	});

	// TEST CASES FOR CERES_WETH.stakingToken
	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.stakingToken", async() => {
		expect(await stakingInstance_CERES_WETH.stakingToken()).to.equal(await pair_addr_CERES_WETH);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.stakingToken instance's NAME,SYMBOL,DECIMALS func", async() => {
		const pair_instance_CERES_WETH = await UniswapV2Pair.at(await stakingInstance_CERES_WETH.stakingToken());
		const NAME_DEFAULT_VALUE = "Uniswap V2";
		const SYMBOL_DEFAULT_VALUE = "UNI-V2";
		const DECIMALS_DEFAULT_VALUE = 18;

		expect(parseFloat(await pair_instance_CERES_WETH.decimals())).to.equal(DECIMALS_DEFAULT_VALUE);
		expect(await pair_instance_CERES_WETH.name()).to.equal(NAME_DEFAULT_VALUE);
		expect(await pair_instance_CERES_WETH.symbol()).to.equal(SYMBOL_DEFAULT_VALUE);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.stakingToken instance's token0,token1,price0CumulativeLast,price1CumulativeLast func", async() => {
		const pair_instance_CERES_WETH = await UniswapV2Pair.at(await stakingInstance_CERES_WETH.stakingToken());

		console.log(chalk.yellow(`token0: ${await pair_instance_CERES_WETH.token0()}`));
		console.log(chalk.yellow(`token0: ${await pair_instance_CERES_WETH.token1()}`));
		console.log(chalk.blue(`ceres: ${await ceresInstance.address}`));
		console.log(chalk.blue(`weth: ${await wethInstance.address}`));
		console.log(chalk.yellow(`price0CumulativeLast: ${await pair_instance_CERES_WETH.price0CumulativeLast()}`));
		console.log(chalk.yellow(`price1CumulativeLast: ${await pair_instance_CERES_WETH.price1CumulativeLast()}`));
	});

	// TEST FOR CERES_WETH.rewardsToken
	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.rewardsToken, its value should cssInstance", async() => {
		expect(await stakingInstance_CERES_WETH.rewardsToken()).to.equal(await cssInstance.address);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.rewardsToken instance's NAME,SYMBOL,DECIMALS func", async() => {
		const rewardsTokenInstance = await CEREShares.at(await stakingInstance_CERES_WETH.rewardsToken());
		const NAME_DEFAULT_VALUE = "CERES Share";
		const SYMBOL_DEFAULT_VALUE = "CSS";
		const DECIMALS_DEFAULT_VALUE = 18;

		expect(parseFloat(await rewardsTokenInstance.decimals())).to.equal(DECIMALS_DEFAULT_VALUE);
		expect(await rewardsTokenInstance.name()).to.equal(NAME_DEFAULT_VALUE);
		expect(await rewardsTokenInstance.symbol()).to.equal(SYMBOL_DEFAULT_VALUE);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.rewardsToken instance's owner_address & timelock_address", async() => {
		const rewardsTokenInstance = await CEREShares.at(await stakingInstance_CERES_WETH.rewardsToken());

		expect(await rewardsTokenInstance.owner_address()).to.equal(OWNER);
		expect(await rewardsTokenInstance.timelock_address()).to.equal(timelockInstance.address);
	});

	// TEST For CERES_WETH.CERES
	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.CERES, its value should ceresInstance", async() => {
		expect(await stakingInstance_CERES_WETH.CERES()).to.equal(await ceresInstance.address);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.CERES instance's NAME,SYMBOL,DECIMALS func", async() => {
		const CERES_WETH_CeresInstance = await CEREStable.at(await stakingInstance_CERES_WETH.CERES());
		const NAME_DEFAULT_VALUE = "CERES";
		const SYMBOL_DEFAULT_VALUE = "CERES";
		const DECIMALS_DEFAULT_VALUE = 18;

		expect(await CERES_WETH_CeresInstance.name()).to.equal(NAME_DEFAULT_VALUE);
		expect(await CERES_WETH_CeresInstance.symbol()).to.equal(SYMBOL_DEFAULT_VALUE);
		expect(parseFloat(await CERES_WETH_CeresInstance.decimals())).to.equal(DECIMALS_DEFAULT_VALUE);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.CERES instance's owner_address & timelock_address", async() => {
		const CERES_WETH_CeresInstance = await CEREStable.at(await stakingInstance_CERES_WETH.CERES());

		expect(await CERES_WETH_CeresInstance.owner_address()).to.equal(OWNER);
		expect(await CERES_WETH_CeresInstance.timelock_address()).to.equal(timelockInstance.address);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.lastUpdateTime", async() => {
		// console.log(chalk.yellow(`lastUpdateTime: ${parseFloat(await stakingInstance_CERES_WETH.lastUpdateTime())}`));
		const DEFAULT_VALUE = 0;
		expect(parseFloat(await stakingInstance_CERES_WETH.lastUpdateTime())).to.gt(DEFAULT_VALUE);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.totalSupply(), its default value is 0", async() => {
		// console.log(chalk.yellow(`totalSupply: ${parseFloat(await stakingInstance_CERES_WETH.totalSupply())}`));
		const DEFAULT_VALUE = 0;
		expect(parseFloat(await stakingInstance_CERES_WETH.totalSupply())).to.equal(DEFAULT_VALUE);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.totalBoostedSupply(), its default value is 0", async() => {
		// console.log(chalk.yellow(`totalBoostedSupply: ${parseFloat(await stakingInstance_CERES_WETH.totalBoostedSupply())}`));
		const DEFAULT_VALUE = 0;
		expect(parseFloat(await stakingInstance_CERES_WETH.totalBoostedSupply())).to.equal(DEFAULT_VALUE);
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.balanceOf(account0 - account7), check its default value for account0 - account7", async() => {
		const value_account0 = await stakingInstance_CERES_WETH.balanceOf.call(account0);
		console.log(chalk.yellow(`address_account0: ${account0} value: ${value_account0}`));

		console.log(chalk.yellow(`address_account1: ${account1} value: ${await stakingInstance_CERES_WETH.balanceOf.call(account1)}`));
		console.log(chalk.yellow(`address_account2: ${account2} value: ${await stakingInstance_CERES_WETH.balanceOf.call(account2)}`));
		console.log(chalk.yellow(`address_account3: ${account3} value: ${await stakingInstance_CERES_WETH.balanceOf.call(account3)}`));
		console.log(chalk.yellow(`address_account4: ${account4} value: ${await stakingInstance_CERES_WETH.balanceOf.call(account4)}`));
		console.log(chalk.yellow(`address_account5: ${account5} value: ${await stakingInstance_CERES_WETH.balanceOf.call(account5)}`));
		console.log(chalk.yellow(`address_account6: ${account6} value: ${await stakingInstance_CERES_WETH.balanceOf.call(account6)}`));
		console.log(chalk.yellow(`address_account7: ${account7} value: ${await stakingInstance_CERES_WETH.balanceOf.call(account7)}`));
	});

	it ("TEST SCRIPTS FOR stakingInstance_CERES_WETH.unlockedBalanceOf(account0 - account7), check its default value for account0 - account7", async() => {
		const value_account0 = await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account0);
		console.log(chalk.yellow(`address_account0: ${account0} value: ${value_account0}`));

		console.log(chalk.yellow(`address_account1: ${account1} value: ${await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account1)}`));
		console.log(chalk.yellow(`address_account2: ${account2} value: ${await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account2)}`));
		console.log(chalk.yellow(`address_account3: ${account3} value: ${await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account3)}`));
		console.log(chalk.yellow(`address_account4: ${account4} value: ${await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account4)}`));
		console.log(chalk.yellow(`address_account5: ${account5} value: ${await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account5)}`));
		console.log(chalk.yellow(`address_account6: ${account6} value: ${await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account6)}`));
		console.log(chalk.yellow(`address_account7: ${account7} value: ${await stakingInstance_CERES_WETH.unlockedBalanceOf.call(account7)}`));
	});


});













