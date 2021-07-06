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
const ONE_MILLION_DEC18 = new BigNumber("1000000e18").toNumber();
const FIVE_MILLION_DEC18 = new BigNumber("5000000e18").toNumber();
const TEN_MILLION_DEC18 = new BigNumber("10000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18").toNumber();
const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6").toNumber();
const ONE_BILLION_DEC18 = new BigNumber("1000000000e18").toNumber();
const COLLATERAL_SEED_DEC18 = new BigNumber("508500e18").toNumber();
const SIX_HUNDRED_DEC18 = new BigNumber("600e18").toNumber();
const SIX_HUNDRED_DEC6 = new BigNumber("600e6").toNumber();
const ONE_DEC18 = new BigNumber("1e18").toNumber();
const ONE_HUNDRED_DEC18 = new BigNumber("100e18").toNumber();
const ONE_HUNDRED_DEC6 = new BigNumber("100e6").toNumber();
const Number133_DEC18 = new BigNumber("133e18").toNumber();
const EIGHT_HUNDRED_DEC18 = new BigNumber("800e18").toNumber();

// Core Contract
const CEREStable = artifacts.require("Ceres/CEREStable");
const CEREShares = artifacts.require("CSS/CEREShares");

// UniswapPairOracle
const UniswapPairOracle_CERES_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_WETH");
const UniswapPairOracle_CERES_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CERES_USDC");
const UniswapPairOracle_CSS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_WETH");
const UniswapPairOracle_CSS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_CSS_USDC");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");

// Staking contracts
const StakingRewards_CERES_WETH = artifacts.require("Staking/Variants/Stake_CERES_WETH.sol");
const StakingRewards_CERES_USDC = artifacts.require("Staking/Variants/Stake_CERES_USDC.sol");
const StakingRewards_CERES_CSS = artifacts.require("Staking/Variants/Stake_CERES_CSS.sol");
const StakingRewards_CSS_WETH = artifacts.require("Staking/Variants/Stake_CSS_WETH.sol");

// Uniswap Contract
const Timelock = artifacts.require("Governance/Timelock");
const StringHelpers = artifacts.require("Utils/StringHelpers");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

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
	const COLLATERAL_CERES_AND_CERESHARES_OWNER = accounts[1];
	const OWNER = accounts[1];
	const account0 = accounts[0];
	const account1 = accounts[1];
	const account2 = accounts[2];
	const account3 = accounts[3];
	const STAKING_OWNER = accounts[6];
	const STAKING_REWARDS_DISTRIBUTOR = accounts[6];
	console.log(chalk.red.bold('===== Uniswap Pair Oracle Deployment & Add Liquidity ====='));
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
		routerInstance = await UniswapV2Router02_Modified.deployed();
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		ceresInstance = await CEREStable.deployed();
		cssInstance = await CEREShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		timelockInstance = await Timelock.deployed();
	}
	
	// add liquidility
	await Promise.all([
		// CERES / WETH
		routerInstance.addLiquidity(
			ceresInstance.address, 
			wethInstance.address,
			new BigNumber(SIX_HUNDRED_DEC18), 
			new BigNumber(ONE_DEC18), 
			new BigNumber(SIX_HUNDRED_DEC18), 
			new BigNumber(ONE_DEC18), 
			COLLATERAL_CERES_AND_CERESHARES_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_CERES_AND_CERESHARES_OWNER }
		),
		// CERES / USDC
		routerInstance.addLiquidity(
			ceresInstance.address, 
			col_instance_USDC.address,
			new BigNumber(ONE_HUNDRED_DEC18), 
			new BigNumber(ONE_HUNDRED_DEC6), 
			new BigNumber(ONE_HUNDRED_DEC18), 
			new BigNumber(ONE_HUNDRED_DEC6), 
			COLLATERAL_CERES_AND_CERESHARES_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_CERES_AND_CERESHARES_OWNER }
		),
		// CSS / WETH
		routerInstance.addLiquidity(
			cssInstance.address, 
			wethInstance.address,
			new BigNumber(EIGHT_HUNDRED_DEC18), 
			new BigNumber(ONE_DEC18), 
			new BigNumber(EIGHT_HUNDRED_DEC18), 
			new BigNumber(ONE_DEC18), 
			COLLATERAL_CERES_AND_CERESHARES_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_CERES_AND_CERESHARES_OWNER }
		),
		// CSS / USDC
		routerInstance.addLiquidity(
			cssInstance.address, 
			col_instance_USDC.address,
			new BigNumber(Number133_DEC18), 
			new BigNumber(ONE_HUNDRED_DEC6), 
			new BigNumber(Number133_DEC18), 
			new BigNumber(ONE_HUNDRED_DEC6), 
			COLLATERAL_CERES_AND_CERESHARES_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_CERES_AND_CERESHARES_OWNER }
		),
		routerInstance.addLiquidity(
			col_instance_USDC.address, 
			wethInstance.address,
			new BigNumber(SIX_HUNDRED_DEC6), 
			new BigNumber(ONE_DEC18), 
			new BigNumber(SIX_HUNDRED_DEC6), 
			new BigNumber(ONE_DEC18), 
			COLLATERAL_CERES_AND_CERESHARES_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_CERES_AND_CERESHARES_OWNER }
		)
	]);

	await Promise.all([
		deployer.deploy(UniswapPairOracle_USDC_WETH, uniswapFactoryInstance.address, col_instance_USDC.address, wethInstance.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address),
	]);

	// ======== Set the Uniswap oracles ========
	await Promise.all([
		deployer.deploy(UniswapPairOracle_CERES_WETH, uniswapFactoryInstance.address, ceresInstance.address, wethInstance.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_CERES_USDC, uniswapFactoryInstance.address, ceresInstance.address, col_instance_USDC.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address),
	]);

	// ======== Set the Uniswap oracles ========
	// set the uniswap css_weth & css_usdc
	await Promise.all([
		deployer.deploy(UniswapPairOracle_CSS_WETH, uniswapFactoryInstance.address, cssInstance.address, wethInstance.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_CSS_USDC, uniswapFactoryInstance.address, cssInstance.address, col_instance_USDC.address, COLLATERAL_CERES_AND_CERESHARES_OWNER, timelockInstance.address),
	]);

	const oracle_instance_CERES_WETH = await UniswapPairOracle_CERES_WETH.deployed();
	const oracle_instance_CERES_USDC = await UniswapPairOracle_CERES_USDC.deployed(); 
	const oracle_instance_CSS_WETH = await UniswapPairOracle_CSS_WETH.deployed();
	const oracle_instance_CSS_USDC = await UniswapPairOracle_CSS_USDC.deployed();
	const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
	
	await oracle_instance_CERES_WETH.update({from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
	await oracle_instance_CERES_USDC.update({from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
	await oracle_instance_CSS_WETH.update({from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
	await oracle_instance_CSS_USDC.update({from: COLLATERAL_CERES_AND_CERESHARES_OWNER});
	await oracle_instance_USDC_WETH.update({ from: COLLATERAL_CERES_AND_CERESHARES_OWNER });

	// set ceresInstance Price Oracle
	// === LINK CERES_WETH & CSS_WETH Oracle to CeresInstance ===
	await Promise.all([
		ceresInstance.setCeresEthOracle(oracle_instance_CERES_WETH.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),
		ceresInstance.setCSSEthOracle(oracle_instance_CSS_WETH.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER }),		
	]);

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;
	// Add the ETH / USD Chainlink oracle
	if (IS_MAINNET){
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.at("0xBa6C6EaC41a24F9D39032513f66D738B3559f15a");
		await ceresInstance.setETHUSDOracle(oracle_chainlink_ETH_USD.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	}
	else {
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumerTest.deployed();
		await ceresInstance.setETHUSDOracle(oracle_chainlink_ETH_USD.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	}

	// ======== Get the addresses of the pairs CERES_WETH & CERES_USDC & CSS_WETH ========
	const pair_addr_CERES_WETH = await uniswapFactoryInstance.getPair(ceresInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	const pair_addr_CERES_USDC = await uniswapFactoryInstance.getPair(ceresInstance.address, col_instance_USDC.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });
	const pair_addr_CSS_WETH = await uniswapFactoryInstance.getPair(cssInstance.address, wethInstance.address, { from: COLLATERAL_CERES_AND_CERESHARES_OWNER });	

	// ======== Deploy the staking contracts ========
	console.log(chalk.yellow('===== DEPLOY THE STAKING CONTRACTS ====='));
	await deployer.link(CEREStable, [StakingRewards_CERES_WETH, StakingRewards_CERES_USDC, StakingRewards_CERES_CSS, StakingRewards_CSS_WETH]);
	await deployer.link(StringHelpers, [StakingRewards_CERES_WETH, StakingRewards_CERES_USDC, StakingRewards_CERES_CSS, StakingRewards_CSS_WETH]);
	await Promise.all([
		deployer.deploy(StakingRewards_CERES_WETH, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, cssInstance.address, pair_addr_CERES_WETH, ceresInstance, timelockInstance.address, 500000,{from: OWNER}),
		deployer.deploy(StakingRewards_CERES_USDC, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, cssInstance.address, pair_addr_CERES_USDC, ceresInstance, timelockInstance.address, 500000,{from: OWNER}),
		deployer.deploy(StakingRewards_CSS_WETH, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, cssInstance.address, pair_addr_CSS_WETH, ceresInstance, timelockInstance.address, 0,{from: OWNER})
	]);
}
