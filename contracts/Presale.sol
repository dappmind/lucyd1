pragma solidity 0.4.15;

import "zeppelin-solidity/contracts/token/ERC20.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/ownership/Contactable.sol";


/**
 * @title Presale
 * @dev Presale is a contract for managing a token crowdsale.
 * Presales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract Presale is Pausable, Contactable {
    using SafeMath for uint;
  
    // The token being sold
    ERC20 public token;
  
    // start and end timestamps where investments are allowed (both inclusive)
    uint public startTime;
    uint public endTime;
  
    // address where funds are collected
    address public wallet;
  
    // how many token units a buyer gets per wei
    uint public rate;
  
    // amount of raised money in wei
    uint public weiRaised;

    // amount of tokens that was sold on the crowdsale
    uint public tokensSold;

    // maximum amount of tokens, that can be sold on this crowdsale
    uint public tokensCap;

    // How many distinct addresses have invested
    uint public investorCount = 0;

    /** How much ETH each address has invested to this crowdsale */
    mapping (address => uint) public investedAmountOf;

    // Addresses that are allowed to invest before ICO offical opens
    mapping (address => bool) public earlyParticipantWhitelist;
  
    /**
     * event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param tokenAmount amount of tokens purchased
     */
    event TokenPurchase(
        address indexed purchaser,
        address indexed beneficiary,
        uint value,
        uint tokenAmount
    );

    function Presale(
        uint _startTime,
        uint _endTime,
        uint _rate,
        uint _tokensCap,
        ERC20 _token,
        address _wallet
    ) {
        require(_startTime >= now);
        require(_endTime >= _startTime);
        require(_rate > 0);
        require(_tokensCap > 0);
        require(address(_token) != 0x0);
        require(_wallet != 0x0);
  
        startTime = _startTime;
        endTime = _endTime;
        rate = _rate;
        tokensCap = _tokensCap;
        token = _token;
        wallet = _wallet;
    }

    // fallback function can be used to buy tokens
    function () external payable {
        buyTokens(msg.sender);
    }

    // low level token purchase function
    function buyTokens(address beneficiary) public whenNotPaused payable returns (bool) {
        require(beneficiary != 0x0);
        require(validPurchase());
    
        uint weiAmount = msg.value;
    
        // calculate token amount to be created
        uint tokenAmount = calculateTokenAmount(weiAmount);
    
        // update state
        if (investedAmountOf[beneficiary] == 0) {
            // A new investor
            investorCount++;
        }
        investedAmountOf[beneficiary] = investedAmountOf[beneficiary].add(weiAmount);
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = tokensSold.add(tokenAmount);
    
        token.transferFrom(owner, beneficiary, tokenAmount);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokenAmount);
    
        wallet.transfer(msg.value);

        return true;
    }

    function calculateTokenAmount(uint value) public constant returns (uint) {
        return value.mul(rate);
    }

    function weiCap() external constant returns (uint) {
        return tokensCap.div(rate);
    }

    // @return true if the transaction can buy tokens
    function validPurchase() internal constant returns (bool) {
        bool withinPeriod = (now >= startTime || earlyParticipantWhitelist[msg.sender]) && now <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        bool withinCap = tokensSold.add(calculateTokenAmount(msg.value)) <= tokensCap;

        return withinPeriod && nonZeroPurchase && withinCap;
    }

    // @return true if crowdsale event has ended
    function hasEnded() external constant returns (bool) {
        bool capReached = tokensSold >= tokensCap;
        bool afterEndTime = now > endTime;
        
        return capReached || afterEndTime;
    }
    
    /**
     * allows to add and exclude addresses from earlyParticipantWhitelist for owner
     * @param isWhitelisted is true for adding address into whitelist, false - to exclude
     */
    function editEarlyParicipantWhitelist(address addr, bool isWhitelisted) external onlyOwner returns (bool) {
        earlyParticipantWhitelist[addr] = isWhitelisted;
        return true;
    }

    // allows to update tokens rate for owner
    function setRate(uint _rate) external onlyOwner returns (bool) {
        rate = _rate;
        return true;
    }
}