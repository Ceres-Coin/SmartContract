## [0.1.210630-a](https://github.com/Ceres-Coin/SmartContract/compare/0.1.210628-b...0.1.210630-a) (2021-06-29)
1. create a new test scripts "test_CERES_USDC_Pool_P3.js"
   1. ADDED Print Parameters func
   2. added test scripts for ASSERTION of CERES_USDC_Pool's PARAMETERS
   3. added assertion for
      1. address public ceres_contract_address; //TEST CASE DONE
      2. address public css_contract_address; //TEST CASE DONE
      3. address public collateral_address; //TEST CASE DONE
      4. address public weth_address; //TEST CASE DONE
   4. ADDED TEST SCRIPTS OF owner_address parameter
   5. added test scripts of timelock_address parameter
   6. add new test scripts for PARAMETERS CONSTANTS
      1. PRICE_PRECISION
      2. COLLATERAL_RATIO_PRECISION
      3. COLLATERAL_RATIO_MAX
   7. added test scripts of CONSTANTS missing_decimals
   8. added test scripts of PARAMETERS
      1. missing_decimals
      2. pausedPrice
      3. redemption_delay
      4. bonus_rate
   9. added test scripts of ACCESS Control STATE
      1.  mintPaused
      2.  redeemPaused
      3.  recollateralizePaused
      4.  buyBackPaused
      5.  collateralPricePaused
   10. add test cases for CERES() & CSS() in CERES_USDC_POOL contract
   11. added test cases for Invoke CERES & CSS from CERES_USDC_POOL
   12. ADDED "Test Cases for CERES Invoke Func in CERES_USDC_POOL" test scripts
   13. ADD TEST SCRIPTS "Test Cases for CSS Invoke Func in CERES_USDC_POOL"
   14. verify the instance's invoke func is equal to pool's public func
   15. ADDED TEST SCRIPTS OF "Test Cases for collatEthOracle_eth_collat_price()"
   16. added test cases for tmpValue & tmpValue2 & collatDollarBalance()
   17. added test cases for availableExcessCollatDV
   18. added test cases for getCollateralPrice() func


## [0.1.210629-b](https://github.com/Ceres-Coin/SmartContract/compare/0.1.210628-b...0.1.210629-b) (2021-06-29)
1. ADDED test scripts in test/test_CERES_USDC_Pool_P2.js
   1. availableExcessCollatDV
   2. toggleRecollateralize
   3. toggleRedeeming
   4. toggleCollateralPrice
   5. setCollatETHOracle
   6. getCollateralPrice
   7. ADD test scripts of pool_instance_USDC.ceres_eth_usd_price()
   8. ADD test scripts of pool_instance_USDC.collatEthOracle_eth_collat_price()
   9. add test scripts of pool_instance_USDC.collateral_token()
   10. add test scripts of pool_instance_USDC.ceres_eth_usd_price()
   11. missing_decimals
2. UPDATE TODO Tasks
3. Refactor CeresPool.sol
4. Remove unused code "BEFORE EACH TEST CASE"
5. Remove unused code "SET CONSTANTS"


## [0.1.210629-a](https://github.com/Ceres-Coin/SmartContract/compare/0.1.210628-b...0.1.210629-a) (2021-06-28)
1. Finish Tuning Deployment Scripts
   1. FINISH migrations/9_deploy_CERES_CSS_Pools.js
   2. FINISH migrations/8_deploy_Uniswap_CERES_Oracle_Contract.js
   3. FINISH migrations/7_deploy_Uniswap_Contract.js
   4. FINISH migrations/6_deploy_ceres_cereshares_contract.js
   5. FINISH migrations/5_link_contract_phrase_1.js
   6. FINISH migrations/4_deploy_contract_phase_3.js

Debug the USDC_POOL contracts & Test Scripts
   1. contracts/ceres/pools/Pool_USDC.sol
   2. contracts/ceres/pools/CeresPool.sol
   3. migrations/9_deploy_CERES_CSS_Pools.js
   4. test/test_CERES_USDC_Pool_P2.js


## [0.1.210628-c](https://github.com/Ceres-Coin/SmartContract/compare/0.1.210628-b...0.1.210628-c) (2021-06-28)
1. Finish Test Scripts test_Openzeppelin_Test_Helpers.js
   1. constants.ZERO_ADDRESS & constants.MAX_UINT256
   2. Test for time.increase(3) func
   3. Test for time.increase(1000000) func
   4. Test for time.advanceBlock() 3 times
   5. Test for time.advanceBlock() 100 times
   6. Test for time.advanceBlockTo(latestBlock+3)
   7. Test for time.advanceBlockTo(latestBlock+100)

2. remove unneccessary code from test/test_Openzeppelin_Test_Helpers.js
3. tuning 3_deploy_contract_phase_2.js deployment scripts
   1. FINISH migrations/1_initial_migration.js
   2. FINISH migrations/2_deploy_contract_phase_1.js
   3. FINISH migrations/3_deploy_contract_phase_2.js

Continue to Tuning deployment scripts under MIGRATIONS folders



## 0.1.210628-b (2021-06-28)
1. add NPM run tasks
   1. migration_clean
   2. migrate_singleFile_1
   3. migrate_singleFile_2
   4. migrate_singleFile_3
   5. migrate_singleFile_4
   6. migrate_singleFile_5
   7. migrate_singleFile_6
   8. migrate_singleFile_7
   9. migrate_singleFile_8
   10. migrate_singleFile_9
   11. clean_build_migrate_all
2. finish 3 deployment scripts tuning
   1. 1_initial_migration
   2. 2_deploy_contract_phase_1
   3. 3_deploy_contract_phase_2
3. ADD Test Scritps for time & constants from @openzeppelin/test-helpers


## 0.1.210628-a (2021-06-28)
1. tuning deployment scripts
   1. to reduce deployment time
   2. Get more information for development
   3. fix deployment bugs
2. add test cases for UniswapPairOracle
   1. getCollateralPrice
   2. toggleBuyBack
   3. getCollateralPrice
3. add truffleTestSingleP1 npm scripts
4. Attach debug process


## 0.1.210627-b (2021-06-27)
add new test script file: test_CERES_USDC_Pool_P2.js


## 0.1.210627 (2021-06-27)
##### add test cases of CeresPool Contract
##### add TODO tasks of CeresPool Contract



# 0.1.0 (2021-06-26)
initialize code





