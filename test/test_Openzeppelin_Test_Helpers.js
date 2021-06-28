const BigNumber = require('bignumber.js');
const BN = BigNumber.clone({ DECIMAL_PLACES: 9 })
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { assert, expect } = require('chai');
const { expectEvent, send, shouldFail, time, constants } = require('@openzeppelin/test-helpers');

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:8545');

global.artifacts = artifacts;
global.web3 = web3;

// TODO: ADD TEST Scripts for @openzeppelin/test-helpers
contract('test_Openzeppelin_Test_Helpers', async (accounts) => {
	it ("Test for time from @openzeppelin/test-helpers", async() => {
		console.log(chalk.yellow(constants.ZERO_ADDRESS));
		console.log(chalk.yellow(constants.MAX_UINT256));

		console.log(chalk.red.bold("timestamp_before: ", await time.latest())); //the current timestamp
		console.log(chalk.red.bold("latestBlock_before: ", await time.latestBlock()));
		const NUM_LOOP = 100;
		for (var i=0;i<NUM_LOOP; i++) { await time.advanceBlock()};
		// Test For advance3Block();
		console.log(chalk.red.bold("timestamp_after", await time.latest())); //the current timestamp
		console.log(chalk.red.bold("latestBlock_after", await time.latestBlock()));
	});

	it ("Test for time.increase(10) func", async() => {
		console.log(chalk.red.bold("timestamp_before: ", await time.latest())); //the current timestamp
		await time.increase(10);
		console.log(chalk.red.bold("timestamp_after", await time.latest())); //the current timestamp
	});

	// Test for increase 10 million seconds(10000000) to verify that it works for future timestamp
	it ("Test for time.increase(10 million ) func", async() => {
		const ten_million = 10000000;
		const timestamp_before = (new BigNumber(await time.latest())).toNumber();
		console.log(chalk.red.bold("timestamp_before: ", timestamp_before)); 
		await time.increase(ten_million);
		const timestamp_after = (new BigNumber(await time.latest())).toNumber();
		console.log(chalk.red.bold("timestamp_after", timestamp_after)); 

		// ASSERTION
		// expect(timestamp_after-timestamp_before).to.equal(ten_million);
	});
});













