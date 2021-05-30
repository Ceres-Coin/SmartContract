const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');

const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

// Define Contracts P1
const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const Babylonian = artifacts.require("Math/Babylonian");
const UQ112x112 = artifacts.require("Math/UQ112x112");
const StringHelpers = artifacts.require("Utils/StringHelpers");

// Define Contracts P2
const FixedPoint = artifacts.require("Math/FixedPoint");
const Math = artifacts.require("Math/Math");
const SafeMath = artifacts.require("Math/SafeMath");
const TransferHelper = artifacts.require("Uniswap/TransferHelper");

// Define Contracts P3

const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");

const DUMP_ADDRESS = "0x1111111111111111111111111111111111111111";



// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	// Deploy Contracts P3
	console.log(chalk.red('====== Link Contracts P1 ======='));

    console.log("link UQ112x112, [UniswapV2Pair]");
    await deployer.link(UQ112x112, [UniswapV2Pair]);
    console.log("link Babylonian, [FixedPoint, SwapToPrice]");
    await deployer.link(Babylonian, [FixedPoint, SwapToPrice]);


    
	console.log(chalk.red('====== Link Contracts P2 ======='));
    console.log(chalk.red('====== todo: link phrase2 ======='));
	// Link Phrase 2;
    // todo: link phrase2
	// await deployer.link(FixedPoint, [UniswapV2OracleLibrary, UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_FXS, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_USDT, UniswapPairOracle_USDC_WETH, UniswapPairOracle_USDT_WETH]);
	// await deployer.link(Address, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT]);
	// await deployer.link(Math, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, UniswapV2ERC20, UniswapV2Pair]);
	// await deployer.link(SafeMath, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FRAXStablecoin, Pool_USDC, Pool_USDT, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, UniswapV2ERC20, UniswapV2Library, UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice, Timelock]);
	// await deployer.link(TransferHelper, [UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, Pool_USDC, Pool_USDT]);


	console.log(chalk.red('====== Link Contracts P3 ======='));
    console.log(chalk.red('====== todo: link phrase3 ======='));
    // Link Phrase 3
    // todo link phrase3
    console.log("link UniswapV2ERC20, [UniswapV2Pair]");
	await deployer.link(UniswapV2ERC20, [UniswapV2Pair]);

    console.log("link UniswapV2Pair, [UniswapV2Factory]");
    await deployer.link(UniswapV2Pair, [UniswapV2Factory]);
	// await deployer.link(UniswapV2OracleLibrary, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_FXS, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_USDT, UniswapPairOracle_USDC_WETH, UniswapPairOracle_USDT_WETH]);
	// await deployer.link(UniswapV2Library, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_USDC_WETH, UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice]);
	
	// await deployer.link(SafeERC20, [WETH, FakeCollateral_USDC, FakeCollateral_USDT, FRAXStablecoin, Pool_USDC, Pool_USDT, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH]);


}
