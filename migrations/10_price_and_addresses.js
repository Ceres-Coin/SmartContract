const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const BigNumber = require('bignumber.js');
const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');
const { expect } = require('chai');

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
const ONE_MILLION_DEC18 = new BigNumber("1000000e18").toNumber();
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18").toNumber();
const FIVE_MILLION_DEC6 = new BigNumber("5000000e6").toNumber();
const TEN_MILLION_DEC18 = new BigNumber("10000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6").toNumber();
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18").toNumber();
const COLLATERAL_SEED_DEC18 = new BigNumber("508500e18").toNumber();
const COLLATERAL_SEED_DEC6 = new BigNumber("508500e6").toNumber();
const SIX_HUNDRED_DEC18 = new BigNumber("600e18").toNumber();
const SIX_HUNDRED_DEC6 = new BigNumber("600e6").toNumber();
const ONE_DEC18 = new BigNumber("1e18").toNumber();
const ONE_HUNDRED_DEC18 = new BigNumber("100e18").toNumber();
const ONE_HUNDRED_DEC6 = new BigNumber("100e6").toNumber();
const Number133_DEC18 = new BigNumber("133e18").toNumber();
const EIGHT_HUNDRED_DEC18 = new BigNumber("800e18").toNumber();
const ONE_THOUSAND_DEC18 = new BigNumber("1000e18").toNumber();


const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");

// Core Contract
const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");

// UniswapPairOracle
const UniswapPairOracle_CERES_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_WETH");
const UniswapPairOracle_CERES_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_USDC");
const UniswapPairOracle_CSS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_WETH");
const UniswapPairOracle_CSS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Uniswap Contract
const Timelock = artifacts.require("Governance/Timelock");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

const StringHelpers = artifacts.require("Utils/StringHelpers");
const Pool_USDC = artifacts.require("Ceres/Pools/Pool_USDC");

const MINTING_FEE = 300; // 0.03%
const REDEMPTION_FEE = 400; // 0.04%
const BUYBACK_FEE = 100; //0.01%
const RECOLLAT_FEE = 100; //0.01%

// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	// Uniswap Address
	let uniswapFactoryInstance;
	let ceresInstance;
	let cssInstance;
	let wethInstance;
	let col_instance_USDC;
	let col_instance_USDT;
	let col_instance_6DEC;
	let timelockInstance;
	let routerInstance;

	// Set the Network Settings
	const IS_MAINNET = (network == 'mainnet');
	const IS_ROPSTEN = (network == 'ropsten');
	const IS_DEV = (network == 'development');
	const IS_GANACHE = (network == 'devganache');
	const IS_BSC_TESTNET = (network == 'testnet');
	const IS_RINKEBY = (network == 'rinkeby');

	// set the deploy address
	const ADMIN = accounts[0];
	const METAMASK_ADDRESS = accounts[2];

	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
	const OWNER = accounts[1];
	const account0 = accounts[0];
	const account1 = accounts[1];
	const account2 = accounts[2];
	const account3 = accounts[3];

	if (IS_ROPSTEN || IS_RINKEBY){
		// Note UniswapV2Router02 vs UniswapV2Router02_Modified
		routerInstance = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"); 
		uniswapFactoryInstance = await UniswapV2Factory.at("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"); 
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		timelockInstance = await Timelock.deployed();
	}
	if (IS_DEV || IS_BSC_TESTNET || IS_GANACHE) {
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		timelockInstance = await Timelock.deployed();
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
	}

	const pool_instance_USDC = await Pool_USDC.deployed();
	// console.log(chalk.yellow(`pool_instance_USDC: ${pool_instance_USDC.address}`));

	const pair_addr_CERES_WETH = await uniswapFactoryInstance.getPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	const pair_addr_CERES_USDC = await uniswapFactoryInstance.getPair(ceresInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	const pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	const pair_instance_CERES_WETH = await UniswapV2Pair.at(pair_addr_CERES_WETH);
	const pair_instance_CERES_USDC = await UniswapV2Pair.at(pair_addr_CERES_USDC);
	const pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);

	// Link the FAKE collateral pool to the CERES contract
	if (!await ceresInstance.ceres_pools.call(pool_instance_USDC.address)) {
		await ceresInstance.addPool(pool_instance_USDC.address, { from: OWNER });
	}
	await cssInstance.setCERESAddress(ceresInstance.address, { from: OWNER });

	const oracle_instance_CERES_WETH = await UniswapPairOracle_CERES_WETH.deployed();
	const oracle_instance_CERES_USDC = await UniswapPairOracle_CERES_USDC.deployed(); 
	const oracle_instance_CSS_WETH = await UniswapPairOracle_CSS_WETH.deployed();
	const oracle_instance_CSS_USDC = await UniswapPairOracle_CSS_USDC.deployed();
	const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();

	let ceres_price_from_CERES_WETH = parseFloat((new BigNumber(await oracle_instance_CERES_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6));
	let ceres_price_from_CERES_USDC = parseFloat((new BigNumber(await oracle_instance_CERES_USDC.consult.call(col_instance_USDC.address,BIG6))).div(BIG18));
	
	let css_price_from_CSS_WETH = parseFloat((new BigNumber(await oracle_instance_CSS_WETH.consult.call(wethInstance.address, BIG6))).div(BIG6));
	let css_price_from_CSS_USDC = parseFloat((new BigNumber(await oracle_instance_CSS_USDC.consult.call(col_instance_USDC.address,BIG6))).div(BIG18));

	expect(ceres_price_from_CERES_WETH).to.equal(600);
	expect(ceres_price_from_CERES_USDC).to.equal(1);
	expect(css_price_from_CSS_WETH).to.equal(800);
	expect(css_price_from_CSS_USDC).to.equal(1.33);

	let usdc_price_from_USDC_WETH = parseFloat((new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, BIG18))).div(BIG6));
	expect(usdc_price_from_USDC_WETH).to.gt(599.99);
	expect(usdc_price_from_USDC_WETH).to.lt(600);

	// CERES and CSS
	await Promise.all([
		ceresInstance.transfer(METAMASK_ADDRESS, new BigNumber(ONE_THOUSAND_DEC18), { from: OWNER }),
		cssInstance.transfer(METAMASK_ADDRESS, new BigNumber(ONE_THOUSAND_DEC18), { from: OWNER })
	]);

	// GET CERES INFO
	// await ceresInstance.setRefreshCooldown(1,{from: OWNER});
	// await ceresInstance.refreshCollateralRatio();
	console.log(chalk.yellow(`global_collateral_ratio: ${await ceresInstance.global_collateral_ratio()}`));
	// await ceresInstance.setRefreshCooldown(60,{from: OWNER}); //ROLL BACK
	// expect(parseFloat(await ceresInstance.refresh_cooldown())).to.equal(60);

	// ======== Try ceres_info ========
	await ceresInstance.ceres_info.call();
}
