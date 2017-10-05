const LcdToken = artifacts.require("./LcdToken.sol")

module.exports = function (deployer) {
    deployer.deploy(LcdToken)
};
