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






	it("test scripts for ceresInstance.setController()  ", async () => {
		console.log(chalk.red("============ ceresInstance.setController() ============"));
		console.log(chalk.red("============ ceresInstance.setController() ============"));
		console.log(chalk.red("============ ceresInstance.setController() ============"));

		const CONTROLLER_ADDRESS_BEFORE = await ceresInstance.controller_address.call();
		const CONTROLLER_ADDRESS_AFTER = await accounts[3];
		console.log(chalk.blue("Expected Result: CONTROLLER_ADDRESS_BEFORE ",CONTROLLER_ADDRESS_BEFORE));
		console.log(chalk.blue("Expected Result: CONTROLLER_ADDRESS_AFTER ",CONTROLLER_ADDRESS_AFTER));
				
		// Before
		const controller_address_before = await ceresInstance.controller_address.call();
		
		// Action
		await ceresInstance.setController(CONTROLLER_ADDRESS_AFTER, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
		
		// After
		const controller_address_after = await ceresInstance.controller_address.call();
		
		// Assert
		assert.notEqual(controller_address_before.toString(),controller_address_after.toString());

		// Print
		console.log(chalk.yellow("Actual Result: controller_address_before: ",controller_address_before));
		console.log(chalk.yellow("Actual Result: controller_address_after: ",controller_address_after));
	});


	








});