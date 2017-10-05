const BigNumber = require('bignumber.js')

const LcdToken = artifacts.require("./LcdToken.sol")
const Presale = artifacts.require('./Presale.sol')
const Sale = artifacts.require('./Sale.sol')

module.exports = function (deployer, network, accounts) {
    let startTime, endTime, rate, cap, wallet
    
    if (network == 'live') {
        startTime = 1508198400 //Tuesday, October 17, 2017 00:00:00 UTC
        endTime = 1509408000   //Tuesday, October 31, 2017 00:00:00 UTC
        rate = 2000
        cap = new BigNumber('25e+24')
        wallet = '0x0'
    }
    else {
        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp
        startTime = now + 1000
        endTime = now + 2000
        rate = 2
        cap = new BigNumber(100)
        wallet = accounts[3]
    }
    
    deployer.deploy(Sale,
        startTime,
        endTime,
        rate,
        cap,
        LcdToken.address,
        wallet,
        Presale.address
    )
    .then(() => LcdToken.deployed())
    .then((token) => {
        return token.approve(Sale.address, cap)
        .then(() => token.editWhitelist(Sale.address, true))
    })
    .then(() => console.log('Sale contracts deployed successfully'))
};
