const BigNumber = require('bignumber.js');
const BN = BigNumber.clone({ DECIMAL_PLACES: 9 })
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { assert, expect } = require('chai');
const { expectEvent, send, shouldFail, time, constants, balance} = require('@openzeppelin/test-helpers');

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:8545');

global.artifacts = artifacts;
global.web3 = web3;

// TODO: ADD TEST Scripts for @openzeppelin/test-helpers
contract('test_Openzeppelin_Test_Helpers', async (accounts) => {
	const account0 = accounts[0];
	const account1 = accounts[1];

	it ("Test for constants.ZERO_ADDRESS & constants.MAX_UINT256", async() => {
		console.log(chalk.yellow(constants.ZERO_ADDRESS));
		console.log(chalk.yellow(constants.MAX_UINT256));
	});

	it ("Test for time.increase(3) func", async() => {
		const THREE = 3;
		const timestamp_before = (new BigNumber(await time.latest())).toNumber();
		await time.increase(THREE);
		// const timestamp_after = (new BigNumber(await time.latest())).toNumber();

		// ASSERTION
		// expect(timestamp_after-timestamp_before).to.equal(THREE);
	});

	// Test for increase 1million seconds(1000000) to verify that it works for future timestamp
	it ("Test for time.increase(1000000) func", async() => {
		const ONE_MILLION = 1000000;
		const timestamp_before = (new BigNumber(await time.latest())).toNumber();
		await time.increase(ONE_MILLION);
		// const timestamp_after = (new BigNumber(await time.latest())).toNumber();

		// ASSERTION
		// expect(timestamp_after-timestamp_before).to.equal(ONE_MILLION);
	});

	it ("Test for time.advanceBlock() 3 times", async() => {
		const THREE = 3;
		const latestBlock_before = (new BigNumber(await time.latestBlock())).toNumber();
		for (var i=0;i<THREE; i++) { await time.advanceBlock()};
		const latestBlock_after = (new BigNumber(await time.latestBlock())).toNumber();

		// ASSERTION
		expect(latestBlock_after-latestBlock_before).to.equal(THREE);
	});

	it ("Test for time.advanceBlock() 100 times", async() => {
		const ONE_HUNDRED = 100;
		const latestBlock_before = (new BigNumber(await time.latestBlock())).toNumber();
		for (var i=0;i<ONE_HUNDRED; i++) { await time.advanceBlock()};
		const latestBlock_after = (new BigNumber(await time.latestBlock())).toNumber();

		// ASSERTION
		expect(latestBlock_after-latestBlock_before).to.equal(ONE_HUNDRED);
	});

	it ("Test for time.advanceBlockTo(latestBlock+3)", async() => {
		const NUMBER = 3;
		const latestBlock_before = (new BigNumber(await time.latestBlock())).toNumber();
		const advanceBlockTo = latestBlock_before + NUMBER;
		await time.advanceBlockTo(advanceBlockTo);
		const latestBlock_after = (new BigNumber(await time.latestBlock())).toNumber();

		// ASSERTION
		expect(latestBlock_after-latestBlock_before).to.equal(NUMBER);
	});

	it ("Test for time.advanceBlockTo(latestBlock+100)", async() => {
		const NUMBER = 100;
		const latestBlock_before = (new BigNumber(await time.latestBlock())).toNumber();
		const advanceBlockTo = latestBlock_before + NUMBER;
		await time.advanceBlockTo(advanceBlockTo);
		const latestBlock_after = (new BigNumber(await time.latestBlock())).toNumber();

		// ASSERTION
		expect(latestBlock_after-latestBlock_before).to.equal(NUMBER);
	});
	
});













