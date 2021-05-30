const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');

const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');


// Define UniswapV2Factory & Router
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");

// Define WETH & USDC & USDT & 6DEC USDC
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_6DEC = artifacts.require("FakeCollateral/FakeCollateral_6DEC");

// set constants
console.log(chalk.yellow('===== SET CONSTANTS ====='));
const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);

const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");

// Core Contract
const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");



// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {

	// set the deploy address
	console.log(chalk.yellow('===== SET THE DEPLOY ADDRESSES ====='));
	const ADMIN = accounts[0];
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];

	console.log("ADMIN is: ",ADMIN);
	console.log("COLLATERAL_CERES_AND_CERESHARES_OWNER is: ",COLLATERAL_CERES_AND_CERESHARES_OWNER);

	// Set the Network Settings
	const IS_MAINNET = (process.env.MIGRATION_MODE == 'mainnet');
	const IS_ROPSTEN = (process.env.MIGRATION_MODE == 'ropsten');
	const IS_RINKEBY = (process.env.MIGRATION_MODE == 'rinkeby');
	const IS_DEV = (process.env.MIGRATION_MODE == 'dev');

	console.log("IS_MAINNET: ",IS_MAINNET);
	console.log("IS_ROPSTEN: ",IS_ROPSTEN);
	console.log("IS_RINKEBY: ",IS_RINKEBY);
	console.log("IS_DEV: ",IS_DEV);

	// ======== Deploy WETH & USDC & USDT ========
	console.log(chalk.yellow('===== DEPLOY OR LINK THE ROUTER AND SWAP_TO_PRICE ====='));
	let routerInstance;
	let uniswapFactoryInstance;

	if (IS_MAINNET){
		console.log(chalk.yellow('===== REAL COLLATERAL ====='));
		wethInstance = await WETH.at("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
		col_instance_USDC = await FakeCollateral_USDC.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 
		col_instance_USDT = await FakeCollateral_USDT.at("0xdac17f958d2ee523a2206206994597c13d831ec7"); 

	}
	else {
		console.log(chalk.yellow('===== FAKE COLLATERAL ====='));

		await deployer.deploy(WETH, COLLATERAL_CERES_AND_CERESHARES_OWNER);
		await deployer.deploy(FakeCollateral_USDC, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDC", 6);
		await deployer.deploy(FakeCollateral_USDT, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDT", 6);
		await deployer.deploy(FakeCollateral_6DEC, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDT", 6);
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed(); 

		console.log("wethInstance: ",wethInstance.address);
		console.log("col_instance_USDC: ",col_instance_USDC.address);
		console.log("col_instance_USDT: ",col_instance_USDT.address);
		console.log("col_instance_6DEC: ",col_instance_6DEC.address);

	}

	// Setting the router & uniswap factory in different network
	if (IS_MAINNET){
		// Note UniswapV2Router02 vs UniswapV2Router02_Modified
		routerInstance = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"); 
		uniswapFactoryInstance = await UniswapV2Factory.at("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"); 
	}
	else if (IS_ROPSTEN || IS_RINKEBY){
		// Note UniswapV2Router02 vs UniswapV2Router02_Modified
		routerInstance = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"); 
		uniswapFactoryInstance = await UniswapV2Factory.at("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"); 
	}
	else if (IS_DEV){
		await deployer.deploy(UniswapV2Router02_Modified, UniswapV2Factory.address, wethInstance.address);
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
	}
	console.log(chalk.yellow('===== RouterInstantce & Uniswap Factor address ====='));
	console.log("routerInstance: ",routerInstance.address);
	console.log("uniswapFactoryInstance: ",uniswapFactoryInstance.address);

	// Deploy SwapToPrice contract
	let swapToPriceInstance;
	if (IS_MAINNET){
		swapToPriceInstance = await SwapToPrice.at('0xa61cBe7E326B13A8dbA11D00f42531BE704DF51B'); 
	}
	else {
		await deployer.deploy(SwapToPrice, uniswapFactoryInstance.address, routerInstance.address);
		swapToPriceInstance = await SwapToPrice.deployed();
	}

	console.log(chalk.yellow('===== swapToPriceInstance address ====='));
	console.log("swapToPriceInstance: ",swapToPriceInstance.address);


	// CERES
	const ceresInstance = await CEREStable.deployed();
	console.log("ceresInstance: ",ceresInstance.address);

	// CSS
	const cssInstance = await CEREShares.deployed();
	console.log("cssInstance: ",cssInstance.address);


	// ======== Set the Uniswap pairs ========
	console.log(chalk.yellow('===== SET UNISWAP PAIRS ====='));
	console.log(chalk.blue('=== CERES / XXXX ==='));
	console.log("CERES - WETH");
	console.log("CERES - USDC");
	await Promise.all([
		uniswapFactoryInstance.createPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		uniswapFactoryInstance.createPair(ceresInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	]);

	// ======== Get the addresses of the pairs ========
	// console.log(chalk.yellow('===== GET THE ADDRESSES OF THE PAIRS ====='));
	// const pair_addr_CERES_WETH = await uniswapFactoryInstance.getPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// const pair_addr_CERES_USDC = await uniswapFactoryInstance.getPair(ceresInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

	
}
