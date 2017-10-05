pragma solidity 0.4.15;

import "./Presale.sol";


contract Sale is Presale {

    Presale public presale;

    bool public presaleEnded = false;

    function Sale(
        uint _startTime,
        uint _endTime,
        uint _rate,
        uint _tokensCap,
        ERC20 _token,
        address _wallet,
        Presale _presale
    ) Presale (
        _startTime,
        _endTime,
        _rate,
        _tokensCap,
        _token,
        _wallet
    ) {
        address presaleToken = address(_presale.token());
        require(address(_token) == presaleToken);

        presale = _presale;
    }

    // @return true if the transaction can buy tokens
    function validPurchase() internal constant returns (bool) {
        if (!presaleEnded) {
            presaleEnded = presale.hasEnded();
        }

        bool started = presaleEnded || earlyParticipantWhitelist[msg.sender];
        bool hasntEnded = now <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        bool withinCap = tokensSold.add(calculateTokenAmount(msg.value)) <= tokensCap;

        return started && hasntEnded && nonZeroPurchase && withinCap;
    }
}