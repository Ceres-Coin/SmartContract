// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;


import "../../Math/SafeMath.sol";
import "../../CSS/CSS.sol";
import "../../Ceres/Ceres.sol";
import "../../ERC20/ERC20.sol";
import "../../Oracle/UniswapPairOracle.sol";
import "../../Governance/AccessControl.sol";
import "./CeresPoolLibrary.sol";

contract CeresPool is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */
 
    ERC20 public collateral_token; //TEST CASE DONE
    address public collateral_address; //TEST CASE DONE
    address public owner_address; //TEST CASE DONE

    address public ceres_contract_address; //TEST CASE DONE
    address public css_contract_address; //TEST CASE DONE
    address public timelock_address; //TEST CASE DONE
    CEREShares public CSS; //TEST CASE DONE
    CEREStable public CERES; //TEST CASE DONE

    UniswapPairOracle public collatEthOracle; //TEST CASE DONE
    // [PARAMETER][collat_eth_oracle_address]
    address public collat_eth_oracle_address;
    address public weth_address; //TEST CASE DONE

    // added test scripts for below 4 constants
    // TEST CASE DONE
    uint256 public minting_fee; // test scripts done
    uint256 public redemption_fee; // test scripts done
    uint256 public buyback_fee; // test scripts done
    uint256 public recollat_fee; // test scripts done

    // TODO: [LATER][PARAMETER][redeemCSSBalances]
    mapping (address => uint256) public redeemCSSBalances;
    // TODO: [LATER][PARAMETER][redeemCollateralBalances]
    mapping (address => uint256) public redeemCollateralBalances;
    uint256 public unclaimedPoolCollateral; // TEST CASE DONE
    uint256 public unclaimedPoolCSS; // TEST CASE DONE
    // TODO: [LATER][PARAMETER][lastRedeemed]
    mapping (address => uint256) public lastRedeemed;

    // Constants for various precisions
    // TEST CASE DONE
    uint256 public constant PRICE_PRECISION = 1e6; //test scripts done
    uint256 public constant COLLATERAL_RATIO_PRECISION = 1e6; //test scripts done
    uint256 public constant COLLATERAL_RATIO_MAX = 1e6; //test scripts done

    // Number of decimals needed to get to 18
    // TEST CASE DONE
    uint256 public immutable missing_decimals; //test scripts done
    
    // Pool_ceiling is the total units of collateral that a pool contract can hold
    // TEST CASE DONE
    uint256 public pool_ceiling = 0; //test scripts done

    // Stores price of the collateral, if price is paused
    // TEST CASE DONE
    uint256 public pausedPrice = 0;
    uint256 public bonus_rate = 7500;

    // Number of blocks to wait before being able to collectRedemption()
    // TEST CASE DONE
    uint256 public redemption_delay = 1;

    // AccessControl Roles
    bytes32 private constant MINT_PAUSER = keccak256("MINT_PAUSER");
    bytes32 private constant REDEEM_PAUSER = keccak256("REDEEM_PAUSER");
    bytes32 private constant BUYBACK_PAUSER = keccak256("BUYBACK_PAUSER");
    bytes32 private constant RECOLLATERALIZE_PAUSER = keccak256("RECOLLATERALIZE_PAUSER");
    bytes32 private constant COLLATERAL_PRICE_PAUSER = keccak256("COLLATERAL_PRICE_PAUSER");
    
    // AccessControl state variables
    // TEST CASE DONE
    bool public mintPaused = false;
    bool public redeemPaused = false;
    bool public recollateralizePaused = false;
    bool public buyBackPaused = false;
    bool public collateralPricePaused = false;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "You are not the owner or the governance timelock");
        _;
    }

    modifier notRedeemPaused() {
        require(redeemPaused == false, "Redeeming is paused");
        _;
    }

    modifier notMintPaused() {
        require(mintPaused == false, "Minting is paused");
        _;
    }
 
    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _ceres_contract_address,
        address _css_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        uint256 _pool_ceiling
    ) public {
        CERES = CEREStable(_ceres_contract_address);
        CSS = CEREShares(_css_contract_address);

        ceres_contract_address = _ceres_contract_address;
        css_contract_address = _css_contract_address;
        collateral_address = _collateral_address;
        owner_address = _creator_address;
        timelock_address = _timelock_address;
        pool_ceiling = _pool_ceiling;
        
        collateral_token = ERC20(_collateral_address);
        missing_decimals = uint(18).sub(collateral_token.decimals());

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(MINT_PAUSER, timelock_address);
        grantRole(REDEEM_PAUSER, timelock_address);
        grantRole(RECOLLATERALIZE_PAUSER, timelock_address);
        grantRole(BUYBACK_PAUSER, timelock_address);
        grantRole(COLLATERAL_PRICE_PAUSER, timelock_address);
    }

    // [FUNC][ceres_eth_usd_price]
    function ceres_eth_usd_price() public view returns(uint256) {
        uint256 eth_usd_price = CERES.eth_usd_price();
        return eth_usd_price;
    }

    // [FUNC][collatEthOracle_eth_collat_price]
    function collatEthOracle_eth_collat_price() public view returns(uint256) {
        uint256 eth_collat_price = collatEthOracle.consult(weth_address, (PRICE_PRECISION * (10 ** missing_decimals)));
        // uint256 eth_collat_price = collatEthOracle.consult(weth_address, PRICE_PRECISION);
        return eth_collat_price;
    }

    /* ========== VIEWS ========== */
    // TODO: [LATER][FUNC][collatDollarBalance] & Investigate why the value is 0
    function collatDollarBalance() public view returns (uint256) {
        if(collateralPricePaused == true){
            return (collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral)).mul(10 ** missing_decimals).mul(pausedPrice).div(PRICE_PRECISION);
        } else {
            uint256 eth_usd_price = CERES.eth_usd_price();
            uint256 eth_collat_price = collatEthOracle.consult(weth_address, (PRICE_PRECISION * (10 ** missing_decimals)));

            uint256 collat_usd_price = eth_usd_price.mul(PRICE_PRECISION).div(eth_collat_price);
            return (collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral)).mul(10 ** missing_decimals).mul(collat_usd_price).div(PRICE_PRECISION); //.mul(getCollateralPrice()).div(1e6);    
        }
    }

    function tmpValue() public view returns(uint256) {
        return (collateral_token.balanceOf(address(this)));
    }

    function tmpValue2() public view returns(uint256) {
        return unclaimedPoolCollateral;
    }

    // Returns the value of excess collateral held in this CERES pool, compared to what is needed to maintain the global collateral ratio
    // [FUNC][availableExcessCollatDV]
    function availableExcessCollatDV() public view returns (uint256) {
        uint256 total_supply = CERES.totalSupply();
        uint256 global_collateral_ratio = CERES.global_collateral_ratio();
        uint256 global_collat_value = CERES.globalCollateralValue();

        if (global_collateral_ratio > COLLATERAL_RATIO_PRECISION) global_collateral_ratio = COLLATERAL_RATIO_PRECISION; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 = (total_supply.mul(global_collateral_ratio)).div(COLLATERAL_RATIO_PRECISION); // Calculates collateral needed to back each 1 CERES with $1 of collateral at current collat ratio
        if (global_collat_value > required_collat_dollar_value_d18) return global_collat_value.sub(required_collat_dollar_value_d18);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // Returns the price of the pool collateral in USD
    // [FUNC][getCollateralPrice]
    function getCollateralPrice() public view returns (uint256) {
        if(collateralPricePaused == true){
            return pausedPrice;
        } else {
            uint256 eth_usd_price = CERES.eth_usd_price();
            return eth_usd_price.mul(PRICE_PRECISION).div(collatEthOracle.consult(weth_address, PRICE_PRECISION * (10 ** missing_decimals)));
        }
    }

    // [FUNC][setCollatETHOracle]
    function setCollatETHOracle(address _collateral_weth_oracle_address, address _weth_address) external onlyByOwnerOrGovernance {
        collat_eth_oracle_address = _collateral_weth_oracle_address;
        collatEthOracle = UniswapPairOracle(_collateral_weth_oracle_address);
        weth_address = _weth_address;
    }

    // We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency 
    // [LATER][FUNC][mint1t1CERES]
    function mint1t1CERES(uint256 collateral_amount, uint256 CERES_out_min) external notMintPaused {
        uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals);

        require(CERES.global_collateral_ratio() >= COLLATERAL_RATIO_MAX, "Collateral ratio must be >= 1");
        require((collateral_token.balanceOf(address(this))).sub(unclaimedPoolCollateral).add(collateral_amount) <= pool_ceiling, "[Pool's Closed]: Ceiling reached");
        
        (uint256 ceres_amount_d18) = CERESPoolLibrary.calcMint1t1CERES(
            getCollateralPrice(),
            collateral_amount_d18
        ); //1 CERES for each $1 worth of collateral

        ceres_amount_d18 = (ceres_amount_d18.mul(uint(1e6).sub(minting_fee))).div(1e6); //remove precision at the end
        require(CERES_out_min <= ceres_amount_d18, "Slippage limit reached");

        collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
        CERES.pool_mint(msg.sender, ceres_amount_d18);
    }

    // 0% collateral-backed
    // TODO: [LATER][FUNC][mintAlgorithmicCERES]
    function mintAlgorithmicCERES(uint256 css_amount_d18, uint256 CERES_out_min) external notMintPaused {
        uint256 css_price = CERES.css_price();
        require(CERES.global_collateral_ratio() == 0, "Collateral ratio must be 0");
        
        (uint256 ceres_amount_d18) = CERESPoolLibrary.calcMintAlgorithmicCERES(
            css_price, // X CSS / 1 USD
            css_amount_d18
        );

        ceres_amount_d18 = (ceres_amount_d18.mul(uint(1e6).sub(minting_fee))).div(1e6);
        require(CERES_out_min <= ceres_amount_d18, "Slippage limit reached");

        CSS.pool_burn_from(msg.sender, css_amount_d18);
        CERES.pool_mint(msg.sender, ceres_amount_d18);
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    // [LATER][FUNC][mintFractionalCERES]
    function mintFractionalCERES(uint256 collateral_amount, uint256 css_amount, uint256 CERES_out_min) external notMintPaused {
        uint256 css_price = CERES.css_price();
        uint256 global_collateral_ratio = CERES.global_collateral_ratio();

        require(global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        require(collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral).add(collateral_amount) <= pool_ceiling, "Pool ceiling reached, no more CERES can be minted with this collateral");

        uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals);
        CERESPoolLibrary.MintCSS_Params memory input_params = CERESPoolLibrary.MintCSS_Params(
            css_price,
            getCollateralPrice(),
            css_amount,
            collateral_amount_d18,
            global_collateral_ratio
        );

        (uint256 mint_amount, uint256 css_needed) = CERESPoolLibrary.calcMintFractionalCERES(input_params);

        mint_amount = (mint_amount.mul(uint(1e6).sub(minting_fee))).div(1e6);
        require(CERES_out_min <= mint_amount, "Slippage limit reached");
        require(css_needed <= css_amount, "Not enough CSS inputted");

        CSS.pool_burn_from(msg.sender, css_needed);
        collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
        CERES.pool_mint(msg.sender, mint_amount);
    }

    // Redeem collateral. 100% collateral-backed
    // TODO: [LATER][FUNC][redeem1t1CERES]
    function redeem1t1CERES(uint256 CERES_amount, uint256 COLLATERAL_out_min) external notRedeemPaused {
        require(CERES.global_collateral_ratio() == COLLATERAL_RATIO_MAX, "Collateral ratio must be == 1");

        // Need to adjust for decimals of collateral
        uint256 CERES_amount_precision = CERES_amount.div(10 ** missing_decimals);
        (uint256 collateral_needed) = CERESPoolLibrary.calcRedeem1t1CERES(
            getCollateralPrice(),
            CERES_amount_precision
        );

        collateral_needed = (collateral_needed.mul(uint(1e6).sub(redemption_fee))).div(1e6);
        require(collateral_needed <= collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral), "Not enough collateral in pool");
        require(COLLATERAL_out_min <= collateral_needed, "Slippage limit reached");

        redeemCollateralBalances[msg.sender] = redeemCollateralBalances[msg.sender].add(collateral_needed);
        unclaimedPoolCollateral = unclaimedPoolCollateral.add(collateral_needed);
        lastRedeemed[msg.sender] = block.number;
        
        // Move all external functions to the end
        CERES.pool_burn_from(msg.sender, CERES_amount);
    }

    // Will fail if fully collateralized or algorithmic
    // Redeem CERES for collateral and CSS. > 0% and < 100% collateral-backed
    // [LATER][FUNC][redeemFractionalCERES]
    function redeemFractionalCERES(uint256 CERES_amount, uint256 CSS_out_min, uint256 COLLATERAL_out_min) external notRedeemPaused {
        uint256 css_price = CERES.css_price();
        uint256 global_collateral_ratio = CERES.global_collateral_ratio();

        require(global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        uint256 col_price_usd = getCollateralPrice();

        uint256 CERES_amount_post_fee = (CERES_amount.mul(uint(1e6).sub(redemption_fee))).div(PRICE_PRECISION);

        uint256 css_dollar_value_d18 = CERES_amount_post_fee.sub(CERES_amount_post_fee.mul(global_collateral_ratio).div(PRICE_PRECISION));
        uint256 css_amount = css_dollar_value_d18.mul(PRICE_PRECISION).div(css_price);

        // Need to adjust for decimals of collateral
        uint256 CERES_amount_precision = CERES_amount_post_fee.div(10 ** missing_decimals);
        uint256 collateral_dollar_value = CERES_amount_precision.mul(global_collateral_ratio).div(PRICE_PRECISION);
        uint256 collateral_amount = collateral_dollar_value.mul(PRICE_PRECISION).div(col_price_usd);


        require(collateral_amount <= collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral), "Not enough collateral in pool");
        require(COLLATERAL_out_min <= collateral_amount, "Slippage limit reached [collateral]");
        require(CSS_out_min <= css_amount, "Slippage limit reached [CSS]");

        redeemCollateralBalances[msg.sender] = redeemCollateralBalances[msg.sender].add(collateral_amount);
        unclaimedPoolCollateral = unclaimedPoolCollateral.add(collateral_amount);

        redeemCSSBalances[msg.sender] = redeemCSSBalances[msg.sender].add(css_amount);
        unclaimedPoolCSS = unclaimedPoolCSS.add(css_amount);

        lastRedeemed[msg.sender] = block.number;
        
        // Move all external functions to the end
        // CERES.pool_burn_from(msg.sender, CERES_amount);
        collateral_token.transferFrom(address(this), msg.sender, collateral_amount);
        CSS.pool_mint(address(this), css_amount);
    }

    // TODO: [LATER][FUNC][redeemAlgorithmicCERES]
    function redeemAlgorithmicCERES(uint256 CERES_amount, uint256 CSS_out_min) external notRedeemPaused {
        uint256 css_price = CERES.css_price();
        uint256 global_collateral_ratio = CERES.global_collateral_ratio();

        require(global_collateral_ratio == 0, "Collateral ratio must be 0"); 
        uint256 css_dollar_value_d18 = CERES_amount;

        css_dollar_value_d18 = (css_dollar_value_d18.mul(uint(1e6).sub(redemption_fee))).div(PRICE_PRECISION); //apply fees

        uint256 css_amount = css_dollar_value_d18.mul(PRICE_PRECISION).div(css_price);
        
        redeemCSSBalances[msg.sender] = redeemCSSBalances[msg.sender].add(css_amount);
        unclaimedPoolCSS = unclaimedPoolCSS.add(css_amount);
        
        lastRedeemed[msg.sender] = block.number;
        
        require(CSS_out_min <= css_amount, "Slippage limit reached");
        // Move all external functions to the end
        CERES.pool_burn_from(msg.sender, CERES_amount);
        CSS.pool_mint(address(this), css_amount);
    }

    // TODO: [LATER][FUNC][collectRedemption]
    function collectRedemption() external {
        require((lastRedeemed[msg.sender].add(redemption_delay)) <= block.number, "Must wait for redemption_delay blocks before collecting redemption");
        bool sendCSS = false;
        bool sendCollateral = false;
        uint CSSAmount;
        uint CollateralAmount;

        // Use Checks-Effects-Interactions pattern
        if(redeemCSSBalances[msg.sender] > 0){
            CSSAmount = redeemCSSBalances[msg.sender];
            redeemCSSBalances[msg.sender] = 0;
            unclaimedPoolCSS = unclaimedPoolCSS.sub(CSSAmount);

            sendCSS = true;
        }
        
        if(redeemCollateralBalances[msg.sender] > 0){
            CollateralAmount = redeemCollateralBalances[msg.sender];
            redeemCollateralBalances[msg.sender] = 0;
            unclaimedPoolCollateral = unclaimedPoolCollateral.sub(CollateralAmount);

            sendCollateral = true;
        }

        if(sendCSS == true){
            CSS.transfer(msg.sender, CSSAmount);
        }
        if(sendCollateral == true){
            collateral_token.transfer(msg.sender, CollateralAmount);
        }
    }

    // TODO: [LATER][FUNC][recollateralizeCERES]
    function recollateralizeCERES(uint256 collateral_amount, uint256 CSS_out_min) external {
        require(recollateralizePaused == false, "Recollateralize is paused");
        uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals);
        uint256 css_price = CERES.css_price();
        uint256 ceres_total_supply = CERES.totalSupply();
        uint256 global_collateral_ratio = CERES.global_collateral_ratio();
        uint256 global_collat_value = CERES.globalCollateralValue();

        (uint256 collateral_units, uint256 amount_to_recollat) = CERESPoolLibrary.calcRecollateralizeCERESInner(
            collateral_amount_d18,
            getCollateralPrice(),
            global_collat_value,
            ceres_total_supply,
            global_collateral_ratio
        ); 

        uint256 collateral_units_precision = collateral_units.div(10 ** missing_decimals);

        uint256 css_paid_back = amount_to_recollat.mul(uint(1e6).add(bonus_rate).sub(recollat_fee)).div(css_price);

        require(CSS_out_min <= css_paid_back, "Slippage limit reached");
        collateral_token.transferFrom(msg.sender, address(this), collateral_units_precision);
        CSS.pool_mint(msg.sender, css_paid_back);
        
    }

    // TODO: [LATER][FUNC][buyBackCSS]
    function buyBackCSS(uint256 CSS_amount, uint256 COLLATERAL_out_min) external {
        require(buyBackPaused == false, "Buyback is paused");
        uint256 css_price = CERES.css_price();
    
        CERESPoolLibrary.BuybackCSS_Params memory input_params = CERESPoolLibrary.BuybackCSS_Params(
            availableExcessCollatDV(),
            css_price,
            getCollateralPrice(),
            CSS_amount
        );

        (uint256 collateral_equivalent_d18) = (CERESPoolLibrary.calcBuyBackCSS(input_params)).mul(uint(1e6).sub(buyback_fee)).div(1e6);
        uint256 collateral_precision = collateral_equivalent_d18.div(10 ** missing_decimals);

        require(COLLATERAL_out_min <= collateral_precision, "Slippage limit reached");
        
        CSS.pool_burn_from(msg.sender, CSS_amount);
        collateral_token.transfer(msg.sender, collateral_precision);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // [FUNC][toggleMinting] test scripts
    function toggleMinting() external onlyByOwnerOrGovernance {
        // require(hasRole(MINT_PAUSER, msg.sender));
        mintPaused = !mintPaused;
    }

    // [FUNC][toggleRedeeming] add test scritps
    function toggleRedeeming() external onlyByOwnerOrGovernance {
        // require(hasRole(REDEEM_PAUSER, msg.sender));
        redeemPaused = !redeemPaused;
    }

    // [FUNC][toggleRecollateralize]
    function toggleRecollateralize() external onlyByOwnerOrGovernance {
        // require(hasRole(RECOLLATERALIZE_PAUSER, msg.sender));
        recollateralizePaused = !recollateralizePaused;
    }
    
    // [FUNC][toggleBuyBack]
    function toggleBuyBack() external onlyByOwnerOrGovernance{
        // require(hasRole(BUYBACK_PAUSER, msg.sender));
        buyBackPaused = !buyBackPaused;
    }

    // [FUNC][toggleCollateralPrice]
    function toggleCollateralPrice(uint256 _new_price) external onlyByOwnerOrGovernance{
        // require(hasRole(COLLATERAL_PRICE_PAUSER, msg.sender));
        // If pausing, set paused price; else if unpausing, clear pausedPrice
        if(collateralPricePaused == false){
            pausedPrice = _new_price;
        } else {
            pausedPrice = 0;
        }
        collateralPricePaused = !collateralPricePaused;
    }

    // Combined into one function due to 24KiB contract memory limit
    // [FUNC][setPoolParameters]
    function setPoolParameters(uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee) external onlyByOwnerOrGovernance {
        pool_ceiling = new_ceiling;
        bonus_rate = new_bonus_rate;
        redemption_delay = new_redemption_delay;
        minting_fee = new_mint_fee;
        redemption_fee = new_redeem_fee;
        buyback_fee = new_buyback_fee;
        recollat_fee = new_recollat_fee;
    }

    // [FUNC][setTimelock] test scripts
    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = new_timelock;
    }

    // [FUNC][setOwner]
    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    /* ========== EVENTS ========== */

}