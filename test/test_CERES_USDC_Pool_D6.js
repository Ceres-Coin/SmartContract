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


	// it("test scripts for Ceres_USDC_Pool Parameters P1", async () => {
	// 	console.log(chalk.red("============ Ceres_USDC_Pool ============"));
	// 	console.log(chalk.red("============ Ceres_USDC_Pool ============"));
	// 	console.log(chalk.red("============ Ceres_USDC_Pool ============"));
	// 	console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));

	// 	// Action
	// 	collateral_token = await pool_instance_USDC.collateral_token.call();
	// 	collateral_address = await pool_instance_USDC.collateral_address.call();
	// 	owner_address = await pool_instance_USDC.owner_address.call();
	// 	ceres_contract_address = await pool_instance_USDC.ceres_contract_address.call();
	// 	css_contract_address = await pool_instance_USDC.css_contract_address.call();
	// 	timelock_address = await pool_instance_USDC.timelock_address.call();

	// 	// Print Result
	// 	console.log(chalk.blue("collateral_token: ",collateral_token.toString()));
	// 	console.log(chalk.blue("collateral_address: ",collateral_address.toString()));
	// 	console.log(chalk.blue("owner_address: ",owner_address.toString()));
	// 	console.log(chalk.blue("ceres_contract_address: ",ceres_contract_address.toString()));
	// 	console.log(chalk.blue("css_contract_address: ",css_contract_address.toString()));
	// 	console.log(chalk.blue("timelock_address: ",timelock_address.toString()));
	// });

	// it("test scripts for Ceres_USDC_Pool Parameters P2", async () => {
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool Parameters P2 ============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool Parameters P2 ============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool Parameters P2 ============"));
	// 	// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));

	// 	// console.log(chalk.blue("ER: MINTING_FEE",MINTING_FEE));
	// 	// console.log(chalk.blue("ER: REDEMPTION_FEE",REDEMPTION_FEE));
	// 	// console.log(chalk.blue("ER: BUYBACK_FEE",BUYBACK_FEE));
	// 	// console.log(chalk.blue("ER: RECOLLAT_FEE",RECOLLAT_FEE));

	// 	// // Action
	// 	// minting_fee = await pool_instance_USDC.minting_fee.call();
	// 	// redemption_fee = await pool_instance_USDC.redemption_fee.call();
	// 	// buyback_fee = await pool_instance_USDC.buyback_fee.call();
	// 	// recollat_fee = await pool_instance_USDC.recollat_fee.call();

	// 	// // ASSERT
	// 	// assert.equal(minting_fee,MINTING_FEE);
	// 	// assert.equal(redemption_fee,REDEMPTION_FEE);
	// 	// assert.equal(buyback_fee,BUYBACK_FEE);
	// 	// assert.equal(recollat_fee,RECOLLAT_FEE);

	// 	// // Print Result
	// 	// console.log(chalk.yellow("AR: minting_fee: ",minting_fee.toString()));
	// 	// console.log(chalk.yellow("AR: redemption_fee: ",redemption_fee.toString()));
	// 	// console.log(chalk.yellow("AR: buyback_fee: ",buyback_fee.toString()));
	// 	// console.log(chalk.yellow("AR: recollat_fee: ",recollat_fee.toString()));

	// });

	// it("test scripts for Ceres_USDC_Pool Constant", async () => {
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool Constant============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool Constant============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool Constant============"));
	// 	// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));

	// 	// console.log(chalk.blue("ER: PRICE_PRECISION",PRICE_PRECISION.toString()));
	// 	// console.log(chalk.blue("ER: COLLATERAL_RATIO_PRECISION",COLLATERAL_RATIO_PRECISION.toString()));
	// 	// console.log(chalk.blue("ER: COLLATERAL_RATIO_MAX",COLLATERAL_RATIO_MAX.toString()));
		

	// 	// // Action
	// 	// price_precision = await pool_instance_USDC.PRICE_PRECISION.call();
	// 	// collateral_ratio_precision = await pool_instance_USDC.COLLATERAL_RATIO_PRECISION.call();
	// 	// collateral_ratio_max = await pool_instance_USDC.COLLATERAL_RATIO_MAX.call();
	

	// 	// // ASSERT
	// 	// assert.equal(price_precision.toString(),PRICE_PRECISION.toString());
	// 	// assert.equal(collateral_ratio_precision.toString(),COLLATERAL_RATIO_PRECISION.toString());
	// 	// assert.equal(collateral_ratio_max.toString(),COLLATERAL_RATIO_MAX.toString());
		

	// 	// // Print Result
	// 	// console.log(chalk.yellow("AR: price_precision: ",price_precision.toString()));
	// 	// console.log(chalk.yellow("AR: collateral_ratio_precision: ",collateral_ratio_precision.toString()));
	// 	// console.log(chalk.yellow("AR: collateral_ratio_max: ",collateral_ratio_max.toString()));
		

	// });

	// it("test scripts for Ceres_USDC_Pool missing_decimals", async () => {
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool missing_decimals============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool missing_decimals============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool missing_decimals============"));
	// 	// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
	// 	// console.log(chalk.blue("ER: MISSING_DECIMALS",MISSING_DECIMALS.toString()));
		
	// 	// // Action
	// 	// missing_decimals = await pool_instance_USDC.missing_decimals.call();
		
	// 	// // ASSERT
	// 	// assert.equal(missing_decimals.toString(),MISSING_DECIMALS.toString());

	// 	// // Print Result
	// 	// console.log(chalk.yellow("AR: missing_decimals: ",missing_decimals.toString()));
	// });

	// it("test scripts for Ceres_USDC_Pool pool_ceiling", async () => {
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool pool_ceiling============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool pool_ceiling============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool pool_ceiling============"));
	// 	// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
	// 	// console.log(chalk.blue("ER: POOL_CEILING",POOL_CEILING.toString()));
		
	// 	// // Action
	// 	// pool_ceiling = await pool_instance_USDC.pool_ceiling.call();
		
	// 	// // ASSERT
	// 	// assert.equal(pool_ceiling.toString(),POOL_CEILING.toString());

	// 	// // Print Result
	// 	// console.log(chalk.yellow("AR: pool_ceiling: ",pool_ceiling.toString()));
	// });

	// it("test scripts for Ceres_USDC_Pool pausedPrice", async () => {
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool pausedPrice============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool pausedPrice============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool pausedPrice============"));
	// 	// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
	// 	// console.log(chalk.blue("ER: PAUSEDPRICE",PAUSEDPRICE.toString()));
		
	// 	// // Action
	// 	// pausedPrice = await pool_instance_USDC.pausedPrice.call();
		
	// 	// // ASSERT
	// 	// assert.equal(pausedPrice.toString(),PAUSEDPRICE.toString());

	// 	// // Print Result
	// 	// console.log(chalk.yellow("AR: pausedPrice: ",pausedPrice.toString()));
	// });

	// it("test scripts for Ceres_USDC_Pool bonus_rate", async () => {
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool bonus_rate============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool bonus_rate============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool bonus_rate============"));
	// 	// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
	// 	// console.log(chalk.blue("ER: BONUS_RATE",BONUS_RATE.toString()));
		
	// 	// // Action
	// 	// bonus_rate = await pool_instance_USDC.bonus_rate.call();
		
	// 	// // ASSERT
	// 	// assert.equal(bonus_rate.toString(),BONUS_RATE.toString());

	// 	// // Print
	// 	// console.log(chalk.yellow("AR: bonus_rate: ",bonus_rate.toString()));
	// });

	// it("test scripts for Ceres_USDC_Pool redemption_delay", async () => {
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool redemption_delay============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool redemption_delay============"));
	// 	// console.log(chalk.red("============ Ceres_USDC_Pool redemption_delay============"));
	// 	// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
	// 	// console.log(chalk.blue("ER: REDEMPTION_DELAY",REDEMPTION_DELAY.toString()));
		
	// 	// // Action
	// 	// redemption_delay = await pool_instance_USDC.redemption_delay.call();
		
	// 	// // ASSERT
	// 	// assert.equal(redemption_delay.toString(),REDEMPTION_DELAY.toString());

	// 	// // Print
	// 	// console.log(chalk.yellow("AR: redemption_delay: ",redemption_delay.toString()));
	// });

	// it("test scripts for Ceres_USDC_Pool er_mintPaused & ", async () => {
		// console.log(chalk.red("============ Ceres_USDC_Pool redemption_delay============"));
		// console.log(chalk.red("============ Ceres_USDC_Pool redemption_delay============"));
		// console.log(chalk.red("============ Ceres_USDC_Pool redemption_delay============"));
		// console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
		// console.log(chalk.blue("ER: er_mintPaused",er_mintPaused.toString()));
		// console.log(chalk.blue("ER: er_redeemPaused",er_redeemPaused.toString()));
		// console.log(chalk.blue("ER: er_recollateralizePaused",er_recollateralizePaused.toString()));
		// console.log(chalk.blue("ER: er_buyBackPaused",er_buyBackPaused.toString()));
		// console.log(chalk.blue("ER: er_collateralPricePaused",er_collateralPricePaused.toString()));

		// // Action
		// ar_mintPaused = await pool_instance_USDC.mintPaused.call();
		// ar_redeemPaused = await pool_instance_USDC.redeemPaused.call();
		// ar_recollateralizePaused = await pool_instance_USDC.recollateralizePaused.call();
		// ar_buyBackPaused = await pool_instance_USDC.buyBackPaused.call();
		// ar_collateralPricePaused = await pool_instance_USDC.collateralPricePaused.call();
		
		// // ASSERT
		// assert.equal(er_mintPaused.toString(),ar_mintPaused.toString());
		// assert.equal(er_redeemPaused.toString(),ar_redeemPaused.toString());
		// assert.equal(er_recollateralizePaused.toString(),ar_recollateralizePaused.toString());
		// assert.equal(er_buyBackPaused.toString(),ar_buyBackPaused.toString());
		// assert.equal(er_collateralPricePaused.toString(),ar_collateralPricePaused.toString());

		// // Print
		// console.log(chalk.yellow("AR: ar_mintPaused: ",ar_mintPaused.toString()));
		// console.log(chalk.yellow("AR: ar_redeemPaused: ",ar_redeemPaused.toString()));
		// console.log(chalk.yellow("AR: ar_recollateralizePaused: ",ar_recollateralizePaused.toString()));
		// console.log(chalk.yellow("AR: ar_buyBackPaused: ",ar_buyBackPaused.toString()));
		// console.log(chalk.yellow("AR: ar_collateralPricePaused: ",ar_collateralPricePaused.toString()));
	// });

	// it("test scripts for Ceres_USDC_Pool CERES", async () => {
	// 	console.log(chalk.red("============ Ceres_USDC_Pool CERES============"));
	// 	console.log(chalk.red("============ Ceres_USDC_Pool CERES============"));
	// 	console.log(chalk.red("============ Ceres_USDC_Pool CERES============"));
	// 	console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
		
	// 	// First Check the CeresInstance address = pool_instance_usdc.ceres_contract_address

	// 	// BEFORE
	// 	const er_ceresInstance_address = ceresInstance.address;
	// 	const er_cssInstance_address = cssInstance.address;
	// 	console.log(chalk.blue("ER: er_ceresInstance_address: ",er_ceresInstance_address.toString()));
	// 	console.log(chalk.blue("ER: er_cssInstance_address: ",er_cssInstance_address.toString()));

	// 	// ACTION
	// 	const ar_pool_instance_USDC_ceresContractAddress = await pool_instance_USDC.ceres_contract_address.call();
	// 	const ar_pool_instance_USDC_cssContractAddress = await pool_instance_USDC.css_contract_address.call();

	// 	// ASSERT
	// 	assert.equal(er_ceresInstance_address,ar_pool_instance_USDC_ceresContractAddress);
	// 	assert.equal(er_cssInstance_address,ar_pool_instance_USDC_cssContractAddress);

	// 	// Print
	// 	console.log("AR: ar_pool_instance_USDC_ceresContractAddress: ",ar_pool_instance_USDC_ceresContractAddress.toString());
	// 	console.log("AR: ar_pool_instance_USDC_cssContractAddress: ",ar_pool_instance_USDC_cssContractAddress.toString());
	// });


	// it("test scripts for Ceres_USDC_Pool CERES.ceres_eth_usd_price", async () => {
	// 	console.log(chalk.red("============ Ceres_USDC_Pool CERES.ceres_eth_usd_price============"));
	// 	console.log(chalk.red("============ Ceres_USDC_Pool CERES.ceres_eth_usd_price============"));
	// 	console.log(chalk.red("============ Ceres_USDC_Pool CERES.ceres_eth_usd_price============"));
	// 	console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
		
	// 	const ceres_eth_usd_price = await pool_instance_USDC.ceres_eth_usd_price();
	// 	console.log(chalk.yellow("ceres_eth_usd_price: ",ceres_eth_usd_price.toString()));
	// });

	it("test scripts for Ceres_USDC_Pool collatEthOracle_eth_collat_price", async () => {
		console.log(chalk.red("============ Ceres_USDC_Pool collatEthOracle_eth_collat_price ============"));
		console.log(chalk.red("============ Ceres_USDC_Pool collatEthOracle_eth_collat_price ============"));
		console.log(chalk.red("============ Ceres_USDC_Pool collatEthOracle_eth_collat_price ============"));
		console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
		
		// There are some error as below:
		const collatEthOracle_eth_collat_price = await pool_instance_USDC.collatEthOracle_eth_collat_price();
		console.log(chalk.yellow("collatEthOracle_eth_collat_price: ",collatEthOracle_eth_collat_price.toString()));
	});
});













