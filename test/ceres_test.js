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







contract('CERES', async (accounts) => {
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

	// CERES Constants
	let totalSupplyCERES;
	let totalSupplyCSS;
	let globalCollateralRatio;
	let globalCollateralValue;
	// CERES public constants
	let global_collateral_ratio;
	let redemption_fee;
	let minting_fee;
	let ceres_step;
	let refresh_cooldown;
	let price_target;
	let price_band;
	let DEFAULT_ADMIN_ADDRESS;
	let COLLATERAL_RATIO_PAUSER;
	let collateral_ratio_paused;

	// CERES ERC20 info
	let symbol;
	let name;
	let decimals;
	let owner_address;
	let creator_address;
	let timelock_address;
	let controller_address;
	let css_address;
	let ceres_eth_oracle_address;
	let css_eth_oracle_address;
	let weth_address;
	let eth_usd_consumer_address;
	let genesis_supply;

	// CERES Other Info
	let ceres_pools_array_length;
	let ceres_pools_length;
	let PRICE_PRECISION;

	// CERES Price Functions
	let ceres_price;
	let css_price;
	let eth_usd_price;

	let last_call_time;

	// ceres Minting Parameters
	const REDEMPTION_FEE = 400; // 0.04%
	const MINTING_FEE = 300; // 0.03%
	const BUYBACK_FEE = 100; //0.01%
	const RECOLLAT_FEE = 100; //0.01%
	const CERES_STEP = 7890; //0.789%
	const PRICE_TARGET_AFTER = 1500000;
	const PRICE_TARGET_BEFORE = 1000000;

	const REFRESH_COOLDOWN_BEFORE = 60;
	const REFRESH_COOLDOWN_AFTER = 300;

	let CSS_ADDRESS_BEFORE = 0;
	let CSS_ADDRESS_AFTER = "0x1111111111111111111111111111111111111111"

	// price_band
	PRICE_BAND_BEFORE = 5000;
	PRICE_BAND_AFTER = 10000;


	

    beforeEach(async() => {
		console.log(chalk.white.bgRed.bold("====================== BEFORE EACH TEST CASE ======================"));

		// set the deploy address
		
		ADMIN = accounts[0];
		COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
		// console.log(chalk.yellow('===== SET THE DEPLOY ADDRESSES ====='));
		// console.log("ADMIN: ",ADMIN.address);
		// console.log("COLLATERAL_CERES_AND_CERESHARES_OWNER: ",COLLATERAL_CERES_AND_CERESHARES_OWNER.address);

		// CERES Core  Contract instances
		
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		// console.log(chalk.red('===== GET THE CORE ADDRESSES ====='));
		// console.log(chalk.yellow("ceresInstance: ",ceresInstance.address));
		// console.log(chalk.yellow("cssInstance: ",cssInstance.address));


		// Fill collateral instances
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		// console.log(chalk.red('====== Get Fake WETH & USDC & USDT ======='));
		// console.log("wethInstance: ",wethInstance.address);
		// console.log("col_instance_USDC: ",col_instance_USDC.address);
		// console.log("col_instance_USDT: ",col_instance_USDT.address);
		// console.log("col_instance_6DEC: ",col_instance_6DEC.address);

		// Fill the Uniswap Router Instance		
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
		// console.log(chalk.red('====== UniswapV2Router02_Modified ======='));		
		// console.log("routerInstance: ",routerInstance.address);

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 
		// console.log(chalk.red('====== timelockInstance ======='));	
		// console.log("timelockInstance: ",timelockInstance.address);

		// Initialize the Uniswap Factory Instance
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		// console.log(chalk.red('====== uniswapFactoryInstance ======='));	
		// console.log("uniswapFactoryInstance: ",uniswapFactoryInstance.address);

		// Initialize the Uniswap Libraries
		uniswapLibraryInstance = await UniswapV2Library.deployed(); 
		uniswapOracleLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// Initialize the swap to price contract
		swapToPriceInstance = await SwapToPrice.deployed(); 

		// console.log(chalk.red('====== uniswap Libraries & swapToPrice ======='));	
		// console.log("uniswapLibraryInstance: ",uniswapLibraryInstance.address);
		// console.log("uniswapOracleLibraryInstance: ",uniswapOracleLibraryInstance.address);
		// console.log("swapToPriceInstance: ",swapToPriceInstance.address);


		// Get the addresses of the pairs
		
		// ceres_weth
		pair_addr_CERES_WETH = await uniswapFactoryInstance.getPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		// ceres_usdc
		pair_addr_CERES_USDC = await uniswapFactoryInstance.getPair(ceresInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

		// console.log(chalk.red('======= get uniswap pair ceres_xxxx addresses ====='));
		// console.log("pair_addr_CERES_WETH: ",pair_addr_CERES_WETH);
		// console.log("pair_addr_CERES_USDC: ",pair_addr_CERES_USDC);


		// Get the addresses of the pairs
		
		// css_weth
		pair_addr_CSS_WETH = await uniswapFactoryInstance.getPair(cssInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		// ceres_usdc
		pair_addr_CSS_USDC = await uniswapFactoryInstance.getPair(cssInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		// console.log(chalk.red('======= get uniswap pair css_xxxx addresses ====='));
		// console.log("pair_addr_CSS_WETH: ",pair_addr_CSS_WETH);
		// console.log("pair_addr_CSS_USDC: ",pair_addr_CSS_USDC);

		// Fill oracle instances
		oracle_instance_CERES_WETH = await UniswapPairOracle_CERES_WETH.deployed();
		oracle_instance_CERES_USDC = await UniswapPairOracle_CERES_USDC.deployed();
		// console.log("oracle_instance_CERES_WETH",oracle_instance_CERES_WETH.address);
		// console.log("oracle_instance_CERES_USDC",oracle_instance_CERES_USDC.address);

		// Fill oracle instances
		oracle_instance_CSS_WETH = await UniswapPairOracle_CSS_WETH.deployed();
		oracle_instance_CSS_USDC = await UniswapPairOracle_CSS_USDC.deployed();
		// console.log("oracle_instance_CSS_WETH",oracle_instance_CSS_WETH.address);
		// console.log("oracle_instance_CSS_USDC",oracle_instance_CSS_USDC.address);

		// Get the pair order results
		first_CERES_WETH = await oracle_instance_CERES_WETH.token0();
		first_CERES_USDC = await oracle_instance_CERES_USDC.token0();


		first_CSS_WETH = await oracle_instance_CSS_WETH.token0();
		first_CSS_USDC = await oracle_instance_CSS_USDC.token0();


		first_CERES_WETH = ceresInstance.address == first_CERES_WETH;
		first_CERES_USDC = ceresInstance.address == first_CERES_USDC;
		first_CSS_WETH = cssInstance.address == first_CSS_WETH;
		first_CSS_USDC = cssInstance.address == first_CSS_USDC;

		// console.log("first_CERES_WETH: ",first_CERES_WETH);
		// console.log("first_CERES_USDC: ",first_CERES_USDC);
		// console.log("first_CSS_WETH: ",first_CSS_WETH);
		// console.log("first_CSS_USDC: ",first_CSS_USDC);


		

    });


	// // // ============================= test scripts for oracle price===================================
	// it('test for oracles prices', async () => {
		
	// 	console.log(chalk.red("============ test for oracles prices ============"));
	// 	console.log(chalk.red("============ test for oracles prices ============"));
	// 	console.log(chalk.red("============ test for oracles prices ============"));

	// 	// time.increase 1 day
	// 	console.log(chalk.yellow("Time.increase 1 day"));
	// 	await time.increase(86400 + 1);
	// 	await time.advanceBlock();

	// 	// ceres_weth & ceres_usdc update
	// 	console.log(chalk.yellow("oracle_instance_ceres_xxxx & css_xxxx update()"));
	// 	await oracle_instance_CERES_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// 	await oracle_instance_CERES_USDC.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// 	await oracle_instance_CSS_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// 	await oracle_instance_CSS_USDC.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

	// 	// test for the price of ceres for 1 eth;
	// 	console.log(chalk.blue("==== old price ===="));
	// 	let ceres_price_from_CERES_WETH;
	// 	let ceres_price_from_CERES_USDC;
	// 	ceres_price_from_CERES_WETH = (new BigNumber(await oracle_instance_CERES_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	// 	console.log("ceres_price_from_CERES_WETH: ", ceres_price_from_CERES_WETH.toString(), " CERES = 1 WETH");
	// 	ceres_price_from_CERES_USDC = (new BigNumber(await oracle_instance_CERES_USDC.consult.call(col_instance_USDC.address, 1e6))).div(BIG18).toNumber();
	// 	console.log("ceres_price_from_CERES_USDC: ", ceres_price_from_CERES_USDC.toString(), " CERES = 1 USDC");

	// 	let css_price_from_CSS_WETH;
	// 	let css_price_from_CSS_USDC;
	// 	css_price_from_CSS_WETH = (new BigNumber(await oracle_instance_CSS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	// 	console.log("css_price_from_CSS_WETH: ", css_price_from_CSS_WETH.toString(), " CSS = 1 WETH");
	// 	css_price_from_CSS_USDC = (new BigNumber(await oracle_instance_CSS_USDC.consult.call(col_instance_USDC.address, 1e6))).div(BIG18).toNumber();
	// 	console.log("css_price_from_CSS_USDC: ", css_price_from_CSS_USDC.toString(), " CSS = 1 USDC");
	// });

	// it("test scripts for ceresInstance.ceres_info", async () => {
	// 	console.log(chalk.red("============ ceresInstance.ceres_info============"));
	// 	console.log(chalk.red("============ ceresInstance.ceres_info============"));
	// 	console.log(chalk.red("============ ceresInstance.ceres_info============"));
				
	// 	let info;
	// 	info = await ceresInstance.ceres_info();
	// 	console.log(chalk.blue("oracle_price CERES: ",info[0].toString()));
	// 	console.log(chalk.blue("oracle_price CSS : ",info[1].toString()));
	// 	console.log(chalk.blue("totalSupply: ",info[2].toString()));
	// 	console.log(chalk.blue("global_collateral_ratio: ",info[3].toString()));
	// 	console.log(chalk.blue("globalCollateralValue: ",info[4].toString()));
	// 	console.log(chalk.blue("minting_fee: ",info[5].toString()));
	// 	console.log(chalk.blue("redemption_fee: ",info[6].toString()));
	// 	console.log(chalk.blue("eth_usd_price: ",info[7].toString()));

	// });

	// it("test scripts for ceresInstance public variants ", async () => {
	// 	console.log(chalk.red("============ ceresInstance public info ============"));
	// 	console.log(chalk.red("============ ceresInstance public info ============"));
	// 	console.log(chalk.red("============ ceresInstance public info ============"));
		
	// 	global_collateral_ratio = await ceresInstance.global_collateral_ratio.call();
	// 	redemption_fee = await ceresInstance.redemption_fee.call();
	// 	minting_fee = await ceresInstance.minting_fee.call();
	// 	ceres_step = await ceresInstance.ceres_step.call();
	// 	refresh_cooldown = await ceresInstance.refresh_cooldown.call();
	// 	price_target = await ceresInstance.price_target.call();
	// 	price_band = await ceresInstance.price_band.call();

	// 	console.log(chalk.blue("global_collateral_ratio: ",global_collateral_ratio.toString()));
	// 	console.log(chalk.blue("redemption_fee: ",redemption_fee.toString()));
	// 	console.log(chalk.blue("minting_fee: ",minting_fee.toString()));
	// 	console.log(chalk.blue("ceres_step: ",ceres_step.toString()));
	// 	console.log(chalk.blue("refresh_cooldown: ",refresh_cooldown.toString()));
	// 	console.log(chalk.blue("price_target: ",price_target.toString()));
	// 	console.log(chalk.blue("price_band: ",price_band.toString()));

	// 	console.log(chalk.blue("========================= ceresInstantce public admin addresses ==========================="));

	// 	DEFAULT_ADMIN_ADDRESS = await ceresInstance.DEFAULT_ADMIN_ADDRESS.call();
	// 	COLLATERAL_RATIO_PAUSER = await ceresInstance.COLLATERAL_RATIO_PAUSER.call();
	// 	collateral_ratio_paused = await ceresInstance.collateral_ratio_paused.call();

	// 	console.log(chalk.blue("DEFAULT_ADMIN_ADDRESS: ",DEFAULT_ADMIN_ADDRESS.toString()));
	// 	console.log(chalk.blue("COLLATERAL_RATIO_PAUSER: ",COLLATERAL_RATIO_PAUSER.toString()));
	// 	console.log(chalk.blue("collateral_ratio_paused: ",collateral_ratio_paused.toString()));


	// });

	// it("test scripts for ceresInstance ERC20 info ", async () => {
	// 	console.log(chalk.red("============ ceresInstance ERC20 info ============"));
	// 	console.log(chalk.red("============ ceresInstance ERC20 info ============"));
	// 	console.log(chalk.red("============ ceresInstance ERC20 info ============"));
		
	// 	symbol = await ceresInstance.symbol.call();
	// 	name = await ceresInstance.name.call();
	// 	decimals = await ceresInstance.decimals.call();
	// 	owner_address = await ceresInstance.owner_address.call();
	// 	creator_address = await ceresInstance.creator_address.call();
	// 	timelock_address = await ceresInstance.timelock_address.call();
	// 	controller_address = await ceresInstance.controller_address.call();

	// 	css_address = await ceresInstance.css_address.call();
	// 	ceres_eth_oracle_address = await ceresInstance.ceres_eth_oracle_address.call();
	// 	css_eth_oracle_address = await ceresInstance.css_eth_oracle_address.call();
	// 	weth_address = await ceresInstance.weth_address.call();
	// 	eth_usd_consumer_address = await ceresInstance.eth_usd_consumer_address.call();
	// 	genesis_supply = await ceresInstance.genesis_supply.call();

	// 	console.log(chalk.blue("symbol: ",symbol.toString()));
	// 	console.log(chalk.blue("name: ",name.toString()));
	// 	console.log(chalk.blue("decimals: ",decimals.toString()));
	// 	console.log(chalk.blue("owner_address: ",owner_address.toString()));
	// 	console.log(chalk.blue("creator_address: ",creator_address.toString()));
	// 	console.log(chalk.blue("timelock_address: ",timelock_address.toString()));
	// 	console.log(chalk.blue("controller_address: ",controller_address.toString()));
	// 	console.log(chalk.blue("css_address: ",css_address.toString()));

	// 	console.log(chalk.blue("ceres_eth_oracle_address: ",ceres_eth_oracle_address.toString()));
	// 	console.log(chalk.blue("css_eth_oracle_address: ",css_eth_oracle_address.toString()));
	// 	console.log(chalk.blue("weth_address: ",weth_address.toString()));
	// 	console.log(chalk.blue("eth_usd_consumer_address: ",eth_usd_consumer_address.toString()));
	// 	console.log(chalk.blue("genesis_supply: ",genesis_supply.toString()));
		


	// });

	// it("Mints 1 USDC to 1 CERES test scripts", async () => {
	// 	console.log(chalk.red("============ mint 1 USDC 1CERES()============"));
	// 	console.log(chalk.red("============ mint 1 USDC 1CERES()============"));
	// 	console.log(chalk.red("============ mint 1 USDC 1CERES()============"));
		

	// 	totalSupplyCERES = new BigNumber(await ceresInstance.totalSupply.call()).div(BIG18).toNumber();
	// 	totalSupplyCSS = new BigNumber(await cssInstance.totalSupply.call()).div(BIG18).toNumber();
	// 	console.log("totalSupplyCERES: ",totalSupplyCERES);
	// 	console.log("totalSupplyCSS: ",totalSupplyCSS);

	// 	globalCollateralRatio = new BigNumber(await ceresInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
	// 	globalCollateralValue = new BigNumber(await ceresInstance.globalCollateralValue.call()).div(BIG18).toNumber();
	// 	console.log("globalCollateralRatio: ",globalCollateralRatio);
	// 	console.log("globalCollateralValue: ",globalCollateralValue);

	// 	// todo get some ceresInstance information

	// 	const eth_usd_pricer = await ceresInstance.eth_usd_pricer.call();
	// 	console.log("eth_usd_pricer: ",eth_usd_pricer);
	// 	const eth_usd_pricer_decimals = await ceresInstance.eth_usd_pricer_decimals.call();
	// 	console.log("eth_usd_pricer_decimals: ",eth_usd_pricer_decimals.toString());

	// 	const eth_usd_price = await ceresInstance.eth_usd_price.call();
	// 	console.log("eth_usd_price: ",eth_usd_price.toString());


	// 	console.log("CERES price (USD): ", (new BigNumber(await ceresInstance.ceres_price.call()).div(BIG6)).toNumber());
	// 	console.log("CSS price (USD): ", (new BigNumber(await ceresInstance.css_price.call()).div(BIG6)).toNumber());

	// });

	// it("test scripts for ceresInstance Other info ", async () => {
	// 	console.log(chalk.red("============ ceresInstance Other info ============"));
	// 	console.log(chalk.red("============ ceresInstance Other info ============"));
	// 	console.log(chalk.red("============ ceresInstance Other info ============"));
		
	// 	ceres_pools_array_length = await ceresInstance.ceres_pools_array.length;
	// 	console.log(chalk.blue("ceres_pools_array_length: ",ceres_pools_array_length));

	// 	ceres_pools_length = await ceresInstance.ceres_pools.length;
	// 	console.log(chalk.blue("ceres_pools_length: ",ceres_pools_length));

	// 	PRICE_PRECISION = await ceresInstance.PRICE_PRECISION.call();
	// 	console.log(chalk.blue("PRICE_PRECISION: ",PRICE_PRECISION.toString()));
	// });

	// it("test scripts for ceresInstance Price Function ", async () => {
	// 	console.log(chalk.red("============ ceresInstance Price Function ============"));
	// 	console.log(chalk.red("============ ceresInstance Price Function ============"));
	// 	console.log(chalk.red("============ ceresInstance Price Function ============"));
		

	// 	ceres_price = await ceresInstance.ceres_price.call();
	// 	console.log(chalk.blue("ceres_price: ",ceres_price.toString()));

	// 	css_price = await ceresInstance.css_price.call();
	// 	console.log(chalk.blue("css_price: ",css_price.toString()));

	// 	eth_usd_price = await ceresInstance.eth_usd_price.call();
	// 	console.log(chalk.blue("eth_usd_price: ",eth_usd_price.toString()));


	// });

	// it("test scripts for ceresInstance Public View Function ", async () => {
	// 	console.log(chalk.red("============ ceresInstance Public View Function ============"));
	// 	console.log(chalk.red("============ ceresInstance Public View Function ============"));
	// 	console.log(chalk.red("============ ceresInstance Public View Function ============"));
		
	// 	globalCollateralValue = await ceresInstance.globalCollateralValue.call();
	// 	console.log(chalk.blue("globalCollateralValue: ",globalCollateralValue.toString()));

	// 	last_call_time = await ceresInstance.last_call_time.call();
	// 	console.log(chalk.blue("last_call_time: ",last_call_time.toString()));

	// });

	// it("test scripts for ceresInstance.refreshCollateralRatio() ", async () => {
	// 	console.log(chalk.red("============ ceresInstance Public Invoke Function ============"));
	// 	console.log(chalk.red("============ ceresInstance Public Invoke Function ============"));
	// 	console.log(chalk.red("============ ceresInstance Public Invoke Function ============"));
		

		
	// 	let info_before;
	// 	console.log(chalk.blue("=========== get ceres_info before refresh collateral ratio ========== "));
	// 	info_before = await ceresInstance.ceres_info();
	// 	console.log(chalk.blue("oracle_price CERES: ",info_before[0].toString()));
	// 	console.log(chalk.blue("oracle_price CSS : ",info_before[1].toString()));
	// 	console.log(chalk.blue("totalSupply: ",info_before[2].toString()));
	// 	console.log(chalk.blue("global_collateral_ratio: ",info_before[3].toString()));
	// 	console.log(chalk.blue("globalCollateralValue: ",info_before[4].toString()));
	// 	console.log(chalk.blue("minting_fee: ",info_before[5].toString()));
	// 	console.log(chalk.blue("redemption_fee: ",info_before[6].toString()));
	// 	console.log(chalk.blue("eth_usd_price: ",info_before[7].toString()));

	// 	console.log(chalk.blue('Refreshing collateral ratio'))
	// 	await ceresInstance.refreshCollateralRatio();

	// 	let info_after;
	// 	console.log(chalk.blue("=========== get ceres_info after refresh collateral ratio ========== "));
	// 	info_after = await ceresInstance.ceres_info();
	// 	console.log(chalk.blue("oracle_price CERES: ",info_after[0].toString()));
	// 	console.log(chalk.blue("oracle_price CSS : ",info_after[1].toString()));
	// 	console.log(chalk.blue("totalSupply: ",info_after[2].toString()));
	// 	console.log(chalk.blue("global_collateral_ratio: ",info_after[3].toString()));
	// 	console.log(chalk.blue("globalCollateralValue: ",info_after[4].toString()));
	// 	console.log(chalk.blue("minting_fee: ",info_after[5].toString()));
	// 	console.log(chalk.blue("redemption_fee: ",info_after[6].toString()));
	// 	console.log(chalk.blue("eth_usd_price: ",info_after[7].toString()));
	// });

	// it("test scripts for ceresInstance.setRedemptionFee() & setMintingFee() ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setRedemptionFee() & setMintingFee()  ============"));
	// 	console.log(chalk.red("============ ceresInstance.setRedemptionFee() & setMintingFee()  ============"));
	// 	console.log(chalk.red("============ ceresInstance.setRedemptionFee() & setMintingFee()  ============"));
		

		
	// 	let info_before;
	// 	console.log(chalk.blue("=========== get ceres_info before setRedemptionFee() & setMintingFee()  ========== "));
	// 	info_before = await ceresInstance.ceres_info();
	// 	console.log(chalk.blue("oracle_price CERES: ",info_before[0].toString()));
	// 	console.log(chalk.blue("oracle_price CSS : ",info_before[1].toString()));
	// 	console.log(chalk.blue("totalSupply: ",info_before[2].toString()));
	// 	console.log(chalk.blue("global_collateral_ratio: ",info_before[3].toString()));
	// 	console.log(chalk.blue("globalCollateralValue: ",info_before[4].toString()));
	// 	console.log(chalk.blue("minting_fee: ",info_before[5].toString()));
	// 	console.log(chalk.blue("redemption_fee: ",info_before[6].toString()));
	// 	console.log(chalk.blue("eth_usd_price: ",info_before[7].toString()));

	// 	console.log(chalk.blue('setRedemptionFee() & setMintingFee()'))
	// 	// Set the redemption fee to 0.04%
	// 	// Set the minting fee to 0.03%
	// 	await Promise.all([
	// 		ceresInstance.setRedemptionFee(REDEMPTION_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
	// 		ceresInstance.setMintingFee(MINTING_FEE, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	// 	])

	// 	let info_after;
	// 	console.log(chalk.blue("=========== get ceres_info after setRedemptionFee() & setMintingFee()  ========== "));
	// 	info_after = await ceresInstance.ceres_info();
	// 	console.log(chalk.blue("oracle_price CERES: ",info_after[0].toString()));
	// 	console.log(chalk.blue("oracle_price CSS : ",info_after[1].toString()));
	// 	console.log(chalk.blue("totalSupply: ",info_after[2].toString()));
	// 	console.log(chalk.blue("global_collateral_ratio: ",info_after[3].toString()));
	// 	console.log(chalk.blue("globalCollateralValue: ",info_after[4].toString()));
	// 	console.log(chalk.blue("minting_fee: ",info_after[5].toString()));
	// 	console.log(chalk.blue("redemption_fee: ",info_after[6].toString()));
	// 	console.log(chalk.blue("eth_usd_price: ",info_after[7].toString()));
	// });

	// it("test scripts for ceresInstance.setCeresStep()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setCeresStep() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setCeresStep() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setCeresStep() ============"));
		
	// 	let ceres_step_before;
	// 	console.log(chalk.blue("=========== get ceres_step_before before setCeresStep() ========== "));
	// 	ceres_step_before = await ceresInstance.ceres_step.call();
	// 	console.log(chalk.blue("ceres_step_before: ",ceres_step_before.toString()));

	// 	console.log(chalk.blue('setCeresStep() & setPriceTarget()'))
	// 	// Set the ceresStep from 2500 to 7890 
	// 	await Promise.all([
	// 		ceresInstance.setCeresStep(CERES_STEP, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
	// 	]);

	// 	let ceres_step_after;
	// 	console.log(chalk.blue("=========== get ceres_step_after before setCeresStep() ========== "));
	// 	ceres_step_after = new BigNumber(await ceresInstance.ceres_step.call());
	// 	console.log(chalk.blue("ceres_step_after: ",ceres_step_after.toString()));

	// 	assert.equal(ceres_step_after, CERES_STEP);
	// 	assert.equal(ceres_step_after, 7890);
	// 	// assert.equal(ceres_step_after, 7889); test for assert fail scenario. 
		
		

	// });

	// it("test scripts for ceresInstance.setPriceTarget()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setPriceTarget() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setPriceTarget() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setPriceTarget() ============"));
	// 	console.log(chalk.blue("scenario: PRICE_TARGET_BEFORE: ",PRICE_TARGET_BEFORE));
	// 	console.log(chalk.blue("scenario: PRICE_TARGET_AFTER: ",PRICE_TARGET_AFTER));
		
	// 	// Before
	// 	const price_target_before = new BN(await ceresInstance.price_target.call());
	// 	assert.equal(price_target_before,PRICE_TARGET_BEFORE);

	// 	// Action
	// 	await Promise.all([
	// 		ceresInstance.setPriceTarget(PRICE_TARGET_AFTER, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
	// 	]);

	// 	// After
	// 	const price_target_after = new BN(await ceresInstance.price_target.call());
	// 	assert.equal(price_target_after,PRICE_TARGET_AFTER);

	// 	// Optional Code: Print
	// 	console.log(chalk.blue("===== console.log [Optional] ===="))
	// 	console.log(chalk.yellow("price_target_before: ",price_target_before));
	// 	console.log(chalk.yellow("price_target_after: ",price_target_after));
	// });

	// it("test scripts for ceresInstance.setRefreshCooldown()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setRefreshCooldown() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setRefreshCooldown() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setRefreshCooldown() ============"));
	// 	// Initial refresh_cooldown = 60 means 1 minutes
	// 	console.log(chalk.blue("scenario: REFRESH_COOLDOWN_BEFORE: ",REFRESH_COOLDOWN_BEFORE));
	// 	console.log(chalk.blue("scenario: REFRESH_COOLDOWN_AFTER: ",REFRESH_COOLDOWN_AFTER));
		
	// 	// Before
	// 	const refresh_cooldown_before = new BN(await ceresInstance.refresh_cooldown.call());
	// 	assert.equal(refresh_cooldown_before,REFRESH_COOLDOWN_BEFORE);

	// 	// Action
	// 	await Promise.all([
	// 		ceresInstance.setRefreshCooldown(REFRESH_COOLDOWN_AFTER, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
	// 	]);

	// 	// After
	// 	const refresh_cooldown_after = new BN(await ceresInstance.refresh_cooldown.call());
	// 	assert.equal(refresh_cooldown_after,REFRESH_COOLDOWN_AFTER);

	// 	// Optional Code: Print
	// 	console.log(chalk.blue("===== console.log [Optional] ===="))
	// 	console.log(chalk.yellow("refresh_cooldown_before: ",refresh_cooldown_before));
	// 	console.log(chalk.yellow("refresh_cooldown_after: ",refresh_cooldown_after));
	// });

	// it("test scripts for ceresInstance.setPriceBand()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setPriceBand() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setPriceBand() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setPriceBand() ============"));
		
	// 	console.log(chalk.blue("EXPECTED RESULT: PRICE_BAND_BEFORE: ",PRICE_BAND_BEFORE));
	// 	console.log(chalk.blue("EXPECTED RESULT: PRICE_BAND_AFTER: ", PRICE_BAND_AFTER));
		
	// 	// Before
	// 	const price_band_before = new BN(await ceresInstance.price_band.call());
	// 	assert.equal(price_band_before,PRICE_BAND_BEFORE);
		

	// 	// Action
	// 	await Promise.all([
	// 		ceresInstance.setPriceBand(PRICE_BAND_AFTER, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
	// 	]);

	// 	// After
	// 	const price_band_after = await ceresInstance.price_band.call();
	// 	assert.equal(price_band_after,PRICE_BAND_AFTER);

	// 	// Optional Print
	// 	console.log(chalk.yellow("actual result price_band_before: ",price_band_before));
	// 	console.log(chalk.yellow("actual result price_band_after: ",price_band_after));

	// });

	// it("test scripts for ceresInstance.setCSSAddress()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setCSSAddress() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setCSSAddress() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setCSSAddress() ============"));
		
	// 	console.log(chalk.blue("scenario: CSS_ADDRESS_BEFORE: ",CSS_ADDRESS_BEFORE));
	// 	console.log(chalk.blue("scenario: CSS_ADDRESS_AFTER: ", CSS_ADDRESS_AFTER));
		
	// 	// Before
	// 	const css_address_before = new BN(await ceresInstance.css_address.call());
	// 	assert.equal(css_address_before,CSS_ADDRESS_BEFORE);
		

	// 	// Action
	// 	await Promise.all([
	// 		ceresInstance.setCSSAddress(CSS_ADDRESS_AFTER, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
	// 	]);

	// 	// After
	// 	const css_address_after = await ceresInstance.css_address.call();
	// 	assert.equal(css_address_after,CSS_ADDRESS_AFTER);

	// });

	// it("test scripts for ceresInstance.setETHUSDOracle()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setETHUSDOracle() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setETHUSDOracle() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setETHUSDOracle() ============"));		
		
	// 	// Before
	// 	const eth_usd_consumer_address_before = await ceresInstance.eth_usd_consumer_address.call();
	// 	const eth_usd_pricer_before = await ceresInstance.eth_usd_pricer.call();
	// 	const eth_usd_pricer_decimals_before = new BN(await ceresInstance.eth_usd_pricer_decimals.call());
		
	// 	console.log(chalk.blue("eth_usd_consumer_address_before: ",eth_usd_consumer_address_before));
	// 	console.log(chalk.blue("eth_usd_pricer_before: ",eth_usd_pricer_before));
	// 	console.log(chalk.blue("eth_usd_pricer_decimals_before: ",eth_usd_pricer_decimals_before));

	// 	// Action
	// 	let oracle_chainlink_ETH_USD_after = await ChainlinkETHUSDPriceConsumerTest2.deployed();
	// 	await ceresInstance.setETHUSDOracle(oracle_chainlink_ETH_USD_after.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		
	// 	// After
	// 	const eth_usd_consumer_address_after = await ceresInstance.eth_usd_consumer_address.call();
	// 	const eth_usd_pricer_after = await ceresInstance.eth_usd_pricer.call();
	// 	const eth_usd_pricer_decimals_after = new BN(await ceresInstance.eth_usd_pricer_decimals.call());
		
	// 	console.log(chalk.blue("eth_usd_consumer_address_after: ",eth_usd_consumer_address_after));
	// 	console.log(chalk.blue("eth_usd_pricer_after: ",eth_usd_pricer_after));
	// 	console.log(chalk.blue("eth_usd_pricer_decimals_after: ",eth_usd_pricer_decimals_after));

	// 	// Assert
	// 	assert.notEqual(eth_usd_consumer_address_before.toString(),eth_usd_consumer_address_after.toString());
	// 	assert.notEqual(eth_usd_pricer_before.toString(),eth_usd_pricer_after.toString());
	// 	assert.equal(eth_usd_pricer_decimals_before.toString(),eth_usd_pricer_decimals_after.toString());
	// });

	// it("test scripts for ceresInstance.setTimelock()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setTimelock() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setTimelock() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setTimelock() ============"));
	// 	const TIMELOCK = await Timelock.deployed();
	// 	const TIMELOCK_TEST = await TimelockTest.deployed();
	// 	console.log(chalk.blue("Expected Result: TIMELOCK ",TIMELOCK.address));
	// 	console.log(chalk.blue("Expected Result: TIMELOCK_TEST ",TIMELOCK_TEST.address));
				
	// 	// Before
	// 	const timelock_address_before = await ceresInstance.timelock_address.call();
		
	// 	// Action
	// 	await ceresInstance.setTimelock(TIMELOCK_TEST.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		
	// 	// After
	// 	const timelock_address_after = await ceresInstance.timelock_address.call();
		
	// 	// Assert
	// 	assert.notEqual(timelock_address_before.toString(),timelock_address_after.toString());

	// 	// Print
	// 	console.log(chalk.yellow("Actual Result: timelock_address_before: ",timelock_address_before));
	// 	console.log(chalk.yellow("Actual Result: timelock_address_after: ",timelock_address_after));
	// });

	// it("test scripts for ceresInstance.setController()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.setController() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setController() ============"));
	// 	console.log(chalk.red("============ ceresInstance.setController() ============"));

	// 	const CONTROLLER_ADDRESS_BEFORE = await ceresInstance.controller_address.call();
	// 	const CONTROLLER_ADDRESS_AFTER = await accounts[3];
	// 	console.log(chalk.blue("Expected Result: CONTROLLER_ADDRESS_BEFORE ",CONTROLLER_ADDRESS_BEFORE));
	// 	console.log(chalk.blue("Expected Result: CONTROLLER_ADDRESS_AFTER ",CONTROLLER_ADDRESS_AFTER));
				
	// 	// Before
	// 	const controller_address_before = await ceresInstance.controller_address.call();
		
	// 	// Action
	// 	await ceresInstance.setController(CONTROLLER_ADDRESS_AFTER, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		
	// 	// After
	// 	const controller_address_after = await ceresInstance.controller_address.call();
		
	// 	// Assert
	// 	assert.notEqual(controller_address_before.toString(),controller_address_after.toString());

	// 	// Print
	// 	console.log(chalk.yellow("Actual Result: controller_address_before: ",controller_address_before));
	// 	console.log(chalk.yellow("Actual Result: controller_address_after: ",controller_address_after));
	// });


	// it("test scripts for ceresInstance.toggleCollateralRatio()  ", async () => {
	// 	console.log(chalk.red("============ ceresInstance.toggleCollateralRatio() ============"));
	// 	console.log(chalk.red("============ ceresInstance.toggleCollateralRatio() ============"));
	// 	console.log(chalk.red("============ ceresInstance.toggleCollateralRatio() ============"));

	// 	const COLLATERAL_RATIO_PAUSED_BEFORE = await ceresInstance.collateral_ratio_paused.call();
	// 	const COLLATERAL_RATIO_PAUSED_AFTER = !COLLATERAL_RATIO_PAUSED_BEFORE;
	// 	console.log(chalk.blue("Expected Result: COLLATERAL_RATIO_PAUSED_BEFORE ",COLLATERAL_RATIO_PAUSED_BEFORE));
	// 	console.log(chalk.blue("Expected Result: COLLATERAL_RATIO_PAUSED_AFTER ",COLLATERAL_RATIO_PAUSED_AFTER));
				
	// 	// Before
	// 	const collateral_ratio_paused_before = await ceresInstance.collateral_ratio_paused.call();
		
	// 	// Action
	// 	await ceresInstance.toggleCollateralRatio({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		
	// 	// After
	// 	const collateral_ratio_paused_after = await ceresInstance.collateral_ratio_paused.call();
		
	// 	// Assert
	// 	assert.notEqual(collateral_ratio_paused_before.toString(),collateral_ratio_paused_after.toString());

	// 	// Print
	// 	console.log(chalk.yellow("Actual Result: collateral_ratio_paused_before: ",collateral_ratio_paused_before));
	// 	console.log(chalk.yellow("Actual Result: collateral_ratio_paused_after: ",collateral_ratio_paused_after));
	// });

});







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


	it("test scripts for Ceres_USDC_Pool CERES.ceres_eth_usd_price", async () => {
		console.log(chalk.red("============ Ceres_USDC_Pool CERES.ceres_eth_usd_price============"));
		console.log(chalk.red("============ Ceres_USDC_Pool CERES.ceres_eth_usd_price============"));
		console.log(chalk.red("============ Ceres_USDC_Pool CERES.ceres_eth_usd_price============"));
		console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
		
		const ceres_eth_usd_price = await pool_instance_USDC.ceres_eth_usd_price();
		console.log(chalk.yellow("ceres_eth_usd_price: ",ceres_eth_usd_price.toString()));
	});

	it("test scripts for Ceres_USDC_Pool collatEthOracle_eth_collat_price", async () => {
		console.log(chalk.red("============ Ceres_USDC_Pool collatEthOracle_eth_collat_price ============"));
		console.log(chalk.red("============ Ceres_USDC_Pool collatEthOracle_eth_collat_price ============"));
		console.log(chalk.red("============ Ceres_USDC_Pool collatEthOracle_eth_collat_price ============"));
		console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
		
		// There are some error as below:
		const collatEthOracle_eth_collat_price = await pool_instance_USDC.collatEthOracle_eth_collat_price();
		console.log(chalk.yellow("collatEthOracle_eth_collat_price: ",collatEthOracle_eth_collat_price.toString()));
	});

	it("test scripts for Ceres_USDC_Pool collatDollarBalance", async () => {
		console.log(chalk.red("============ Ceres_USDC_Pool collatDollarBalance ============"));
		console.log(chalk.red("============ Ceres_USDC_Pool collatDollarBalance ============"));
		console.log(chalk.red("============ Ceres_USDC_Pool collatDollarBalance ============"));
		console.log(chalk.blue("pool_instance_USDC: ",pool_instance_USDC.address));
		
		// There are some error as below:
		const collatDollarBalance = await pool_instance_USDC.collatDollarBalance();
		console.log(chalk.yellow("collatDollarBalance: ",collatDollarBalance.toString()));
	});

});













