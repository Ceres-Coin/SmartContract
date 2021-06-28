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
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");

// Define WETH & USDC & USDT & 6DEC USDC
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_6DEC = artifacts.require("FakeCollateral/FakeCollateral_6DEC");

// set constants
const ONE_MILLION_DEC18 = (new BigNumber("1000000e18")).toNumber();
const FIVE_MILLION_DEC18 = (new BigNumber("5000000e18")).toNumber();
const TEN_MILLION_DEC18 = (new BigNumber("10000000e18")).toNumber();
const TWO_MILLION_DEC18 = (new BigNumber("20000000e18")).toNumber();
const TWO_MILLION_DEC6 = (new BigNumber("20000000e6")).toNumber();
const ONE_HUNDRED_MILLION_DEC18 = (new BigNumber("100000000e18")).toNumber();
const ONE_HUNDRED_MILLION_DEC6 = (new BigNumber("100000000e6")).toNumber();
const ONE_BILLION_DEC18 = (new BigNumber("1000000000e18")).toNumber();
const COLLATERAL_SEED_DEC18 = (new BigNumber("508500e18")).toNumber();

// Core 
const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");

// Other
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const Timelock = artifacts.require("Governance/Timelock");

module.exports = async function(deployer, network, accounts) {
	// Set the Network Settings
	const IS_MAINNET = (network == 'mainnet');
	const IS_ROPSTEN = (network == 'ropsten');
	const IS_DEV = (network == 'development');
	const IS_GANACHE = (network == 'devganache');
	const IS_BSC_TESTNET = (network == 'testnet');
	const IS_RINKEBY = (network == 'rinkeby');

	// set the deploy address
	const ADMIN = accounts[0];
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
	const account0 = accounts[0];
	const account1 = accounts[1];
	const account2 = accounts[2];
	const account3 = accounts[3];
	const timelockInstance = await Timelock.deployed();

	// ======== Deploy WETH & USDC & USDT ========
	let routerInstance;
	let uniswapFactoryInstance;
	if (IS_MAINNET){
		console.log(chalk.yellow('===== REAL COLLATERAL ====='));
		wethInstance = await WETH.at("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
		col_instance_USDC = await FakeCollateral_USDC.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 
		col_instance_USDT = await FakeCollateral_USDT.at("0xdac17f958d2ee523a2206206994597c13d831ec7"); 
	}
	else {
		console.log(chalk.red.bold('===== FAKE COLLATERAL ====='));
		await deployer.deploy(WETH, COLLATERAL_CERES_AND_CERESHARES_OWNER);
		await deployer.deploy(FakeCollateral_USDC, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDC", 6);
		await deployer.deploy(FakeCollateral_USDT, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDT", 6);
		await deployer.deploy(FakeCollateral_6DEC, COLLATERAL_CERES_AND_CERESHARES_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDT", 6);
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed(); 
	}

	console.log(chalk.red.bold('===== Uniswap Factory & Uniswap Router ====='));
	// Setting the router & uniswap factory in different network
	if (IS_MAINNET){
		// Note UniswapV2Router02 vs UniswapV2Router02_Modified
		uniswapFactoryInstance = await UniswapV2Factory.at("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"); 
		routerInstance = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"); 
	}
	else if (IS_ROPSTEN || IS_RINKEBY){
		// Note UniswapV2Router02 vs UniswapV2Router02_Modified
		uniswapFactoryInstance = await UniswapV2Factory.at("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"); 
		routerInstance = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"); 
	}
	else if (IS_DEV || IS_BSC_TESTNET || IS_GANACHE){
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		await deployer.deploy(UniswapV2Router02_Modified, UniswapV2Factory.address, wethInstance.address);
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
	}

	// Deploy SwapToPrice contract
	let swapToPriceInstance;
	if (IS_MAINNET){
		swapToPriceInstance = await SwapToPrice.at('0xa61cBe7E326B13A8dbA11D00f42531BE704DF51B'); 
	}
	else {
		await deployer.deploy(SwapToPrice, uniswapFactoryInstance.address, routerInstance.address);
		swapToPriceInstance = await SwapToPrice.deployed();
	}
	// Core CERES & CSS
	const ceresInstance = await CEREStable.deployed();
	const cssInstance = await CEREShares.deployed();
	
	// ======== Set the Uniswap pairs CERES_WETH & CERES_USDC ========
	await Promise.all([
		uniswapFactoryInstance.createPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		uniswapFactoryInstance.createPair(ceresInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		uniswapFactoryInstance.createPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	]);

	// ======== Get the addresses of the pairs CERES_WETH & CERES_USDC ========
	// const pair_addr_CERES_WETH = await uniswapFactoryInstance.getPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// const pair_addr_CERES_USDC = await uniswapFactoryInstance.getPair(ceresInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// const pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// const pair_instance_CERES_WETH = await UniswapV2Pair.at(pair_addr_CERES_WETH);
	// const pair_instance_CERES_USDC = await UniswapV2Pair.at(pair_addr_CERES_USDC);
	// const pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);

	// ======== Set the Uniswap pairs CSS_WETH & CSS_USDC ========
	await Promise.all([
		uniswapFactoryInstance.createPair(cssInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		uniswapFactoryInstance.createPair(cssInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	]);

	// ======== Get the addresses of the pairs CSS_WETH & CSS_USDC ========
	// const pair_addr_CSS_WETH = await uniswapFactoryInstance.getPair(cssInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// const pair_addr_CSS_USDC = await uniswapFactoryInstance.getPair(cssInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	// const pair_instance_CSS_WETH = await UniswapV2Pair.at(pair_addr_CSS_WETH);
	// const pair_instance_CSS_USDC = await UniswapV2Pair.at(pair_addr_CSS_USDC);

	await Promise.all([
		wethInstance.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC18), { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		col_instance_USDC.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		col_instance_USDT.approve(routerInstance.address, new BigNumber(TWO_MILLION_DEC6), { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		ceresInstance.approve(routerInstance.address, new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		cssInstance.approve(routerInstance.address, new BigNumber(FIVE_MILLION_DEC18), { from: COLLATERAL_CERES_AND_CERESHARES_OWNER })
	]);	
}
