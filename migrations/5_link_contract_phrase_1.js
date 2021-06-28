const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');
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

// CeresPool
const CeresPoolLibrary = artifacts.require("Ceres/Pools/CERESPoolLibrary");
const Pool_USDC = artifacts.require("Ceres/Pools/Pool_USDC");

module.exports = async function(deployer, network, accounts) {
	// Deploy Contracts P3
	console.log(chalk.red('====== Link Contracts P1 ======='));
    await deployer.link(UQ112x112, [UniswapV2Pair]);
    await deployer.link(Babylonian, [FixedPoint, SwapToPrice]);
	await deployer.link(UniswapV2ERC20, [UniswapV2Pair]);
    await deployer.link(UniswapV2Pair, [UniswapV2Factory]);
    await deployer.link(SafeMath, [Pool_USDC]);
    await deployer.link(TransferHelper, [Pool_USDC]);
    await deployer.link(SafeERC20, [Pool_USDC]);
    // Deploy CeresPoolLibrary()
    await deployer.deploy(CeresPoolLibrary);
    await deployer.link(CeresPoolLibrary, [Pool_USDC]);
}
