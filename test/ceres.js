const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

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



contract('FRAX', async (accounts) => {
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
	

    beforeEach(async() => {
		console.log("begin test");

		// set the deploy address
		console.log(chalk.yellow('===== SET THE DEPLOY ADDRESSES ====='));
		ADMIN = accounts[0];
		COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
		console.log("ADMIN: ",ADMIN.address);
		console.log("COLLATERAL_CERES_AND_CERESHARES_OWNER: ",COLLATERAL_CERES_AND_CERESHARES_OWNER.address);

		// CERES Core  Contract instances
		console.log(chalk.red('===== GET THE CORE ADDRESSES ====='));
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		console.log(chalk.yellow("ceresInstance: ",ceresInstance.address));
		console.log(chalk.yellow("cssInstance: ",cssInstance.address));


		console.log(chalk.red('====== Get Fake WETH & USDC & USDT ======='));
		// Fill collateral instances
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();

		console.log("wethInstance: ",wethInstance.address);
		console.log("col_instance_USDC: ",col_instance_USDC.address);
		console.log("col_instance_USDT: ",col_instance_USDT.address);
		console.log("col_instance_6DEC: ",col_instance_6DEC.address);

		// Fill the Uniswap Router Instance
		console.log(chalk.red('====== UniswapV2Router02_Modified ======='));		
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
		console.log("routerInstance: ",routerInstance.address);

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 
		console.log(chalk.red('====== timelockInstance ======='));	
		console.log("timelockInstance: ",timelockInstance.address);

		// Initialize the Uniswap Factory Instance
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		console.log(chalk.red('====== uniswapFactoryInstance ======='));	
		console.log("uniswapFactoryInstance: ",uniswapFactoryInstance.address);

		// Initialize the Uniswap Libraries
		uniswapLibraryInstance = await UniswapV2Library.deployed(); 
		uniswapOracleLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// Initialize the swap to price contract
		swapToPriceInstance = await SwapToPrice.deployed(); 

		console.log(chalk.red('====== uniswap Libraries & swapToPrice ======='));	
		console.log("uniswapLibraryInstance: ",uniswapLibraryInstance.address);
		console.log("uniswapOracleLibraryInstance: ",uniswapOracleLibraryInstance.address);
		console.log("swapToPriceInstance: ",swapToPriceInstance.address);


    });

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {
		console.log("Check up on the oracles and make sure the prices are set");
	});

});