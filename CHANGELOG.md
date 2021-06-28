## [0.1.210628-c](https://github.com/Ceres-Coin/SmartContract/compare/0.1.210628-b...0.1.210628-c) (2021-06-28)
1. Finish Test Scripts test_Openzeppelin_Test_Helpers.js
   1. constants.ZERO_ADDRESS & constants.MAX_UINT256
   2. Test for time.increase(3) func
   3. Test for time.increase(1000000) func
   4. Test for time.advanceBlock() 3 times
   5. Test for time.advanceBlock() 100 times
   6. Test for time.advanceBlockTo(latestBlock+3)
   7. Test for time.advanceBlockTo(latestBlock+100)

2. reduce unneccessary code from test/test_Openzeppelin_Test_Helpers.js
3. tuning 3_deploy_contract_phase_2.js deployment scripts

TODO: Continue to Tuning deployment scripts under MIGRATIONS folders


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





