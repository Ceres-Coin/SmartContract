// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;


import "../Common/Context.sol";
import "../ERC20/IERC20.sol";
import "../ERC20/ERC20Custom.sol";
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";
import "./Pools/CeresPool.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Oracle/ChainlinkETHUSDPriceConsumer.sol";
import "../Governance/AccessControl.sol";

contract CEREStable is ERC20Custom, AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */
    enum PriceChoice { CERES, CSS }
    // ChainLinkETHUSD parameters;
    // [PARAMETERS3]
    // TEST CASE DONE
    address public eth_usd_consumer_address; //TEST CASE DONE
    ChainlinkETHUSDPriceConsumer public eth_usd_pricer; //TEST CASE DONE
    uint8 public eth_usd_pricer_decimals; //TEST CASE DONE
    
    // [PARAMETERS2]
    // TEST CASE DONE
    UniswapPairOracle public CeresEthOracle; //test case done
    UniswapPairOracle public CSSEthOracle; //test case done
    string public symbol; //test case done
    string public name; //test case done
    uint8 public constant decimals = 18; //test case done
    // [PARAMETERS][ADDRESSES]
    // TEST CASE DONE
    address public owner_address; //test case done
    address public creator_address; //test case done
    address public timelock_address; //test case done
    address public controller_address; //test case done
    address public css_address; //test case done
    address public ceres_eth_oracle_address; //test case done
    address public css_eth_oracle_address; //test case done
    address public weth_address; //test case done
    uint256 public constant genesis_supply = 1000000e18; //test case done

    // ceres_pools_array
    address[] public ceres_pools_array; //test case done

    
    mapping(address => bool) public ceres_pools; //test case done

    // [PARAMETER]
    uint256 public constant PRICE_PRECISION = 1e6; //TEST CASE DONE
    
    uint256 public global_collateral_ratio; //test case done
    uint256 public redemption_fee; //test cases done
    uint256 public minting_fee; //test cases done
    uint256 public ceres_step; //test cases done
    uint256 public refresh_cooldown; //TEST CASES DONE
    uint256 public price_target; //TEST CASES DONE
    uint256 public price_band; //TEST CASES DONE

    address public DEFAULT_ADMIN_ADDRESS; //TEST CASE DONE
    bytes32 public constant COLLATERAL_RATIO_PAUSER = keccak256("COLLATERAL_RATIO_PAUSER"); //test cases done
    bool public collateral_ratio_paused = false; //TEST CASE DONE

    /* ========== MODIFIERS ========== */

    modifier onlyCollateralRatioPauser() {
        require(hasRole(COLLATERAL_RATIO_PAUSER, msg.sender));
        _;
    }

    modifier onlyPools() {
       require(ceres_pools[msg.sender] == true, "Only ceres pools can call this function");
        _;
    } 
    
    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == owner_address || msg.sender == timelock_address || msg.sender == controller_address, "You are not the owner, controller, or the governance timelock");
        _;
    }

    modifier onlyByOwnerGovernanceOrPool() {
        require(
            msg.sender == owner_address 
            || msg.sender == timelock_address 
            || ceres_pools[msg.sender] == true, 
            "You are not the owner, the governance timelock, or a pool");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _name,
        string memory _symbol,
        address _creator_address,
        address _timelock_address
    ) public {
        name = _name;
        symbol = _symbol;
        creator_address = _creator_address;
        timelock_address = _timelock_address;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DEFAULT_ADMIN_ADDRESS = _msgSender();
        owner_address = _creator_address;
        _mint(creator_address, genesis_supply);
        grantRole(COLLATERAL_RATIO_PAUSER, creator_address);
        grantRole(COLLATERAL_RATIO_PAUSER, timelock_address);
        ceres_step = 2500; 
        global_collateral_ratio = 1000000; 
        refresh_cooldown = 60; 
        price_target = 1000000; 
        price_band = 5000; 
    }

    /* ========== VIEWS ========== */
    // [FUNC][PRIVATE]
    function oracle_price(PriceChoice choice) internal view returns (uint256) {
        // Get the ETH / USD price first, and cut it down to 1e6 precision
        uint256 eth_usd_price = uint256(eth_usd_pricer.getLatestPrice()).mul(PRICE_PRECISION).div(uint256(10) ** eth_usd_pricer_decimals);
        uint256 price_vs_eth;

        if (choice == PriceChoice.CERES) {
            price_vs_eth = uint256(CeresEthOracle.consult(weth_address, PRICE_PRECISION)); 
        }
        else if (choice == PriceChoice.CSS) {
            price_vs_eth = uint256(CSSEthOracle.consult(weth_address, PRICE_PRECISION)); 
        }
        else revert("INVALID PRICE CHOICE. ");

        // Will be in 1e6 format
        return eth_usd_price.mul(PRICE_PRECISION).div(price_vs_eth);
    }

    // [FUNC][ceres_pools_array_lenth]
    function ceres_pools_array_lenth() public view returns(uint256) {
        return ceres_pools_array.length;
    }

    // [FUNC][ceres_price]
    function ceres_price() public view returns (uint256) {
        return oracle_price(PriceChoice.CERES);
    }

    // [FUNC][css_price]
    function css_price()  public view returns (uint256) {
        return oracle_price(PriceChoice.CSS);
    }
    // [FUNC][eth_usd_price]
    function eth_usd_price() public view returns (uint256) {
        return uint256(eth_usd_pricer.getLatestPrice()).mul(PRICE_PRECISION).div(uint256(10) ** eth_usd_pricer_decimals);
    }

    // [FUNC][ceres_info]
    function ceres_info() public view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256) {
        return (
            oracle_price(PriceChoice.CERES), 
            oracle_price(PriceChoice.CSS), 
            totalSupply(), 
            global_collateral_ratio, 
            globalCollateralValue(), 
            minting_fee, 
            redemption_fee, 
            uint256(eth_usd_pricer.getLatestPrice()).mul(PRICE_PRECISION).div(uint256(10) ** eth_usd_pricer_decimals) 
        );
    }
    // [FUNC][globalCollateralValue]
    function globalCollateralValue() public view returns (uint256) {
        uint256 total_collateral_value_d18 = 0; 

        for (uint i = 0; i < ceres_pools_array.length; i++){ 
            if (ceres_pools_array[i] != address(0)){
                total_collateral_value_d18 = total_collateral_value_d18.add(CeresPool(ceres_pools_array[i]).collatDollarBalance());
            }

        }
        return total_collateral_value_d18;
    }


    // public function
    // TEST CASE DONE
    uint256 public last_call_time; 
    // TEST CASE DONE
    function refreshCollateralRatio() public {
        require(collateral_ratio_paused == false, "Collateral Ratio has been paused");
        uint256 ceres_price_cur = ceres_price();
        require(block.timestamp - last_call_time >= refresh_cooldown, "Must wait for the refresh cooldown since last refresh");

    
        
        if (ceres_price_cur > price_target.add(price_band)) { //decrease collateral ratio
            if(global_collateral_ratio <= ceres_step){ //if within a step of 0, go to 0
                global_collateral_ratio = 0;
            } else {
                global_collateral_ratio = global_collateral_ratio.sub(ceres_step);
            }
        } else if (ceres_price_cur < price_target.sub(price_band)) { //increase collateral ratio
            if(global_collateral_ratio.add(ceres_step) >= 1000000){
                global_collateral_ratio = 1000000; // cap collateral ratio at 1.000000
            } else {
                global_collateral_ratio = global_collateral_ratio.add(ceres_step);
            }
        }

        last_call_time = block.timestamp; // Set the time of the last expansion
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Used by pools when user redeems
    // [LATER][FUNC][pool_burn_from]: because it is a little complicated, we could test this case in USDC_POOL
    function pool_burn_from(address b_address, uint256 b_amount) public onlyPools {
        super._burnFrom(b_address, b_amount);
        emit CERESBurned(b_address, msg.sender, b_amount);
    }

    // [FUNC][pool_mint], it must be finished using USDC_POOL.mint1t1CERES/mintAlgorithmicCERES/mintFractionalCERES
    function pool_mint(address m_address, uint256 m_amount) public onlyPools {
        super._mint(m_address, m_amount);
        emit CERESMinted(msg.sender, m_address, m_amount);
    }

    // [FUNC][addPool]
    // Adds collateral addresses supported, such as tether and busd, must be ERC20 
    function addPool(address pool_address) public onlyByOwnerOrGovernance {
        require(ceres_pools[pool_address] == false, "address already exists");
        ceres_pools[pool_address] = true; 
        ceres_pools_array.push(pool_address);
    }

    // Remove a pool 
    // [FUNC][removePool]
    function removePool(address pool_address) public onlyByOwnerOrGovernance {
        require(ceres_pools[pool_address] == true, "address doesn't exist already");
        
        // Delete from the mapping
        delete ceres_pools[pool_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < ceres_pools_array.length; i++){ 
            if (ceres_pools_array[i] == pool_address) {
                ceres_pools_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    function set_global_collateral_ratio(uint256 _global_collateral_ratio) external onlyByOwnerOrGovernance {
        global_collateral_ratio = _global_collateral_ratio;
    }

    // [FUNC][setOwner]
    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    // [FUNC][setRedemptionFee]
    function setRedemptionFee(uint256 red_fee) public onlyByOwnerOrGovernance {
        redemption_fee = red_fee;
    }

    // [FUNC][setMintingFee]
    function setMintingFee(uint256 min_fee) public onlyByOwnerOrGovernance {
        minting_fee = min_fee;
    }  

    // [FUNC][setMintingFee]
    function setCeresStep(uint256 _new_step) public onlyByOwnerOrGovernance {
        ceres_step = _new_step;
    }  

    // [FUNC][setPriceTarget]
    function setPriceTarget (uint256 _new_price_target) public onlyByOwnerOrGovernance {
        price_target = _new_price_target;
    }

    // [FUNC][setPriceBand]
    function setPriceBand(uint256 _price_band) external onlyByOwnerOrGovernance {
        price_band = _price_band;
    }

    // [FUNC][setRefreshCooldown]
    function setRefreshCooldown(uint256 _new_cooldown) public onlyByOwnerOrGovernance {
    	refresh_cooldown = _new_cooldown;
    }

    // [FUNC][setCSSAddress]
    function setCSSAddress(address _css_address) public onlyByOwnerOrGovernance {
        css_address = _css_address;
    }

    // [FUNC][setETHUSDOracle]
    function setETHUSDOracle(address _eth_usd_consumer_address) public onlyByOwnerOrGovernance {
        eth_usd_consumer_address = _eth_usd_consumer_address;
        eth_usd_pricer = ChainlinkETHUSDPriceConsumer(eth_usd_consumer_address);
        eth_usd_pricer_decimals = eth_usd_pricer.getDecimals();
    }
    // [FUNC][setTimelock]
    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = new_timelock;
    }

    // [FUNC][setController]
    function setController(address _controller_address) external onlyByOwnerOrGovernance {
        controller_address = _controller_address;
    }



    //  [FUNC][setCeresEthOracle]
    function setCeresEthOracle(address _ceres_oracle_addr, address _weth_address) public onlyByOwnerOrGovernance {
        ceres_eth_oracle_address = _ceres_oracle_addr;
        CeresEthOracle = UniswapPairOracle(_ceres_oracle_addr); 
        weth_address = _weth_address;
    }

    // [FUNC][setCSSEthOracle]
    function setCSSEthOracle(address _css_oracle_addr, address _weth_address) public onlyByOwnerOrGovernance {
        css_eth_oracle_address = _css_oracle_addr;
        CSSEthOracle = UniswapPairOracle(_css_oracle_addr);
        weth_address = _weth_address;
    }

    // [FUNC][toggleCollateralRatio]
    function toggleCollateralRatio() public onlyCollateralRatioPauser {
        collateral_ratio_paused = !collateral_ratio_paused;
    }

    /* ========== EVENTS ========== */

    // Track Ceres burned
    event CERESBurned(address indexed from, address indexed to, uint256 amount);

    // Track Ceres minted
    event CERESMinted(address indexed from, address indexed to, uint256 amount);
}
