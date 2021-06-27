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

// constants for addLiquidility
const SIX_HUNDRED_DEC18 = new BigNumber(600e18);
const SIX_HUNDRED_DEC6 = new BigNumber(600e6);
const ONE_DEC18 = new BigNumber(1e18);
const ONE_HUNDRED_DEC18 = new BigNumber(100e18);
const ONE_HUNDRED_DEC6 = new BigNumber(100e6);
const MISSING_DECIMALS_DEC12 = new BigNumber(1e12);

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

contract('CERES_USDC_Pool_D6', async (accounts) => {
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
		


		

    });

    // // Always Passed
	// // No Assertion
	it("pool_instance_USDC Initialize", async () => {
		console.log(chalk.red("============ pool_instance_USDC Initialize ============"));
		console.log(chalk.green.bold("NO ASSERTION"));

		console.log(chalk.yellow("pool_instance_USDC: ",pool_instance_USDC.address));
    });
    
    it("pool_instance_USDC owner_address", async () => {
		console.log(chalk.red("============ pool_instance_USDC owner_address ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_owner_address = COLLATERAL_CERES_AND_CERESHARES_OWNER;
		
		// Action
		const ar_owner_address = await pool_instance_USDC.owner_address.call();

		// Assert
		assert.equal(er_owner_address,ar_owner_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.blue("er_owner_address: ",er_owner_address));
		console.log(chalk.yellow("ar_owner_address: ",ar_owner_address.toString()));
    });

    it("pool_instance_USDC ceres_contract_address", async () => {
		console.log(chalk.red("============ pool_instance_USDC ceres_contract_address ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_ceres_contract_address = ceresInstance.address;
		
		// Action
		const ar_ceres_contract_address = await pool_instance_USDC.ceres_contract_address.call();

		// Assert
		assert.equal(er_ceres_contract_address,ar_ceres_contract_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.blue("er_ceres_contract_address: ",er_ceres_contract_address.toString()));
		console.log(chalk.yellow("ar_ceres_contract_address: ",ar_ceres_contract_address.toString()));
    });

    it("pool_instance_USDC css_contract_address", async () => {
		console.log(chalk.red("============ pool_instance_USDC css_contract_address ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_css_contract_address = cssInstance.address;
		
		// Action
		const ar_css_contract_address = await pool_instance_USDC.css_contract_address.call();

		// Assert
		assert.equal(er_css_contract_address,ar_css_contract_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.blue("er_css_contract_address: ",er_css_contract_address.toString()));
		console.log(chalk.yellow("ar_css_contract_address: ",ar_css_contract_address.toString()));
    });

    it("pool_instance_USDC timelock_address", async () => {
		console.log(chalk.red("============ pool_instance_USDC timelock_address ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_timelock_address = timelockInstance.address;
		
		// Action
		const ar_timelock_address = await pool_instance_USDC.timelock_address.call();

		// Assert
		assert.equal(er_timelock_address,ar_timelock_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.blue("er_timelock_address: ",er_timelock_address.toString()));
		console.log(chalk.yellow("ar_timelock_address: ",ar_timelock_address.toString()));
    });

    it("pool_instance_USDC weth_address", async () => {
		console.log(chalk.red("============ pool_instance_USDC weth_address ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_weth_address = wethInstance.address;
		
		// Action
		const ar_weth_address = await pool_instance_USDC.weth_address.call();

		// Assert
		assert.equal(er_weth_address,ar_weth_address,chalk.red.bold("ASSERTION FAILED"));

		// Print
		console.log(chalk.blue("er_weth_address: ",er_weth_address.toString()));
		console.log(chalk.yellow("ar_weth_address: ",ar_weth_address.toString()));
    });

    it("pool_instance_USDC minting_fee & other 3 constants", async () => {
		console.log(chalk.red("============ pool_instance_USDC minting_fee & other 3 constants ============"));
        console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));

		// Before
        const er_minting_fee = MINTING_FEE;
        const er_redemption_fee = REDEMPTION_FEE;
        const er_buyback_fee = BUYBACK_FEE;
        const er_recollat_fee = RECOLLAT_FEE;
		
		// Action
        const ar_minting_fee = await pool_instance_USDC.minting_fee.call();
        const ar_redemption_fee = await pool_instance_USDC.redemption_fee.call();
        const ar_buyback_fee = await pool_instance_USDC.buyback_fee.call();
        const ar_recollat_fee = await pool_instance_USDC.recollat_fee.call();

        // Assert
        assert.equal(ar_minting_fee,er_minting_fee);
        assert.equal(ar_redemption_fee,er_redemption_fee);
        assert.equal(ar_buyback_fee,er_buyback_fee);
        assert.equal(ar_recollat_fee,er_recollat_fee);

        // Print ER
        console.log(chalk.blue("er_minting_fee: ",er_minting_fee));
        console.log(chalk.blue("er_redemption_fee: ",er_redemption_fee));
        console.log(chalk.blue("er_buyback_fee: ",er_buyback_fee));
        console.log(chalk.blue("er_recollat_fee: ",er_recollat_fee));

		// Print AR
        console.log(chalk.yellow("ar_minting_fee: ",ar_minting_fee.toString()));
        console.log(chalk.yellow("ar_redemption_fee: ",ar_redemption_fee.toString()));
        console.log(chalk.yellow("ar_buyback_fee: ",ar_buyback_fee.toString()));
        console.log(chalk.yellow("ar_recollat_fee: ",ar_recollat_fee.toString()));
    });

    it("pool_instance_USDC CERES", async () => {
		console.log(chalk.red("============ pool_instance_USDC CERES ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Action
        const ar_ceres_contract_address = await pool_instance_USDC.ceres_contract_address.call();
        const instance_pool_instance_USDC_CERES = await CEREStable.at(ar_ceres_contract_address);

        const symbol = await instance_pool_instance_USDC_CERES.symbol.call();
        const name = await instance_pool_instance_USDC_CERES.name.call();
        const decimals = await instance_pool_instance_USDC_CERES.decimals.call();


        // Print AR
        console.log(chalk.yellow("ar_ceres_contract_address: ",ar_ceres_contract_address.toString()));
        console.log(chalk.yellow("symbol: ",symbol.toString()));
        console.log(chalk.yellow("name: ",name.toString()));
        console.log(chalk.yellow("decimals: ",decimals.toString()));
    });

    it("pool_instance_USDC CSS", async () => {
		console.log(chalk.red("============ pool_instance_USDC CSS ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Action
        const ar_css_contract_address = await pool_instance_USDC.css_contract_address.call();
        const instance_pool_instance_USDC_CSS = await CEREStable.at(ar_css_contract_address);

        const symbol = await instance_pool_instance_USDC_CSS.symbol.call();
        const name = await instance_pool_instance_USDC_CSS.name.call();
        const decimals = await instance_pool_instance_USDC_CSS.decimals.call();


        // Print AR
        console.log(chalk.yellow("ar_css_contract_address: ",ar_css_contract_address.toString()));
        console.log(chalk.yellow("symbol: ",symbol.toString()));
        console.log(chalk.yellow("name: ",name.toString()));
        console.log(chalk.yellow("decimals: ",decimals.toString()));
    });

    it("pool_instance_USDC unclaimedPoolCollateral & unclaimedPoolCSS", async () => {
		console.log(chalk.red("============ pool_instance_USDC unclaimedPoolCollateral & unclaimedPoolCSS ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
        
        // Before
        const er_unclaimedPoolCSS = 0;
        const er_unclaimedPoolCollateral = 0;
        
		// Action
        const ar_unclaimedPoolCSS = await pool_instance_USDC.unclaimedPoolCSS.call();
        const ar_unclaimedPoolCollateral = await pool_instance_USDC.unclaimedPoolCollateral.call();

        // Assert
        assert.equal(ar_unclaimedPoolCSS,er_unclaimedPoolCSS)
        assert.equal(ar_unclaimedPoolCollateral,er_unclaimedPoolCollateral)

        // Print ER
        console.log(chalk.blue("er_unclaimedPoolCSS: ",er_unclaimedPoolCSS.toString()));
        console.log(chalk.blue("er_unclaimedPoolCollateral: ",er_unclaimedPoolCollateral.toString()));
        
        // Print AR
        console.log(chalk.yellow("ar_unclaimedPoolCSS: ",ar_unclaimedPoolCSS.toString()));
        console.log(chalk.yellow("ar_unclaimedPoolCollateral: ",ar_unclaimedPoolCollateral.toString()));

    });

    // Constants for various precisions
    it("pool_instance_USDC Constants for various precisions", async () => {
		console.log(chalk.red("============ pool_instance_USDC Constants for various precisions ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
        
        // Before
        const er_PRICE_PRECISION = 1e6; 
        const er_COLLATERAL_RATIO_PRECISION = 1e6; 
        const er_COLLATERAL_RATIO_MAX = 1e6; 
        
		// Action
        const ar_PRICE_PRECISION = await pool_instance_USDC.PRICE_PRECISION.call();
        const ar_COLLATERAL_RATIO_PRECISION = await pool_instance_USDC.COLLATERAL_RATIO_PRECISION.call();
        const ar_COLLATERAL_RATIO_MAX = await pool_instance_USDC.COLLATERAL_RATIO_MAX.call();

        // Assert
        assert.equal(ar_PRICE_PRECISION,er_PRICE_PRECISION);
        assert.equal(ar_COLLATERAL_RATIO_PRECISION,er_COLLATERAL_RATIO_PRECISION);
        assert.equal(ar_COLLATERAL_RATIO_MAX,er_COLLATERAL_RATIO_MAX);
        

        // Print ER
        console.log(chalk.blue("er_PRICE_PRECISION: ",er_PRICE_PRECISION.toString()));
        console.log(chalk.blue("er_COLLATERAL_RATIO_PRECISION: ",er_COLLATERAL_RATIO_PRECISION.toString()));
        console.log(chalk.blue("er_COLLATERAL_RATIO_MAX: ",er_COLLATERAL_RATIO_MAX.toString()));
        
        // Print AR
        console.log(chalk.yellow("ar_PRICE_PRECISION: ",ar_PRICE_PRECISION.toString()));
        console.log(chalk.yellow("ar_COLLATERAL_RATIO_PRECISION: ",ar_COLLATERAL_RATIO_PRECISION.toString()));
        console.log(chalk.yellow("ar_COLLATERAL_RATIO_MAX: ",ar_COLLATERAL_RATIO_MAX.toString()));
    });

    it("pool_instance_USDC missing_decimals", async () => {
		console.log(chalk.red("============ pool_instance_USDC missing_decimals ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_missing_decimals = MISSING_DECIMALS;
		
		// Action
		const ar_missing_decimals = await pool_instance_USDC.missing_decimals.call();

		// Assert
		assert.equal(ar_missing_decimals,er_missing_decimals,chalk.red.bold("ASSERTION FAILED"));

		// Print ER
        console.log(chalk.blue("er_missing_decimals: ",er_missing_decimals.toString()));
        
        // Print AR
		console.log(chalk.yellow("ar_missing_decimals: ",ar_missing_decimals.toString()));
    });

    it("pool_instance_USDC pool_ceiling", async () => {
		console.log(chalk.red("============ pool_instance_USDC pool_ceiling ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_pool_ceiling = POOL_CEILING.toString();
		
		// Action
		const ar_pool_ceiling = await pool_instance_USDC.pool_ceiling.call();

		// Assert
		assert.equal(ar_pool_ceiling.toString(),er_pool_ceiling.toString(),chalk.red.bold("ASSERTION FAILED"));

		// Print ER
        console.log(chalk.blue("er_pool_ceiling: ",er_pool_ceiling.toString()));
        
        // Print AR
		console.log(chalk.yellow("ar_pool_ceiling: ",ar_pool_ceiling.toString()));
    });

    it("pool_instance_USDC pausedPrice", async () => {
		console.log(chalk.red("============ pool_instance_USDC pausedPrice ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_pausedPrice = PAUSEDPRICE.toString();
		
		// Action
		const ar_pausedPrice = await pool_instance_USDC.pausedPrice.call();

		// Assert
		assert.equal(ar_pausedPrice.toString(),er_pausedPrice.toString(),chalk.red.bold("ASSERTION FAILED"));

		// Print ER
        console.log(chalk.blue("er_pausedPrice: ",er_pausedPrice.toString()));
        
        // Print AR
		console.log(chalk.yellow("ar_pausedPrice: ",ar_pausedPrice.toString()));
    });

    it("pool_instance_USDC bonus_rate", async () => {
		console.log(chalk.red("============ pool_instance_USDC bonus_rate ============"));
		console.log(chalk.blue("ER: pool_instance_USDC: ",pool_instance_USDC.address));
		
		// Before
		const er_bonus_rate = BONUS_RATE.toString();
		
		// Action
		const ar_bonus_rate = await pool_instance_USDC.bonus_rate.call();

		// Assert
		assert.equal(ar_bonus_rate.toString(),er_bonus_rate.toString(),chalk.red.bold("ASSERTION FAILED"));

		// Print ER
        console.log(chalk.blue("er_bonus_rate: ",er_bonus_rate.toString()));
        
        // Print AR
		console.log(chalk.yellow("ar_bonus_rate: ",ar_bonus_rate.toString()));
    });



    

    

});













