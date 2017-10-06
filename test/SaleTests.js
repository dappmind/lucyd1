const utils = require('./utils.js')
const BigNumber = require('bignumber.js')
const chai = require('chai')
chai.use(require('chai-bignumber')());
chai.use(require('chai-as-promised'))
chai.should()

const LcdToken = artifacts.require('./LcdToken.sol')
const Presale = artifacts.require('./Presale.sol')
const Sale = artifacts.require('./Sale.sol')

contract('Sale', (accounts) => {

    const OWNER = accounts[0]
    const INVESTOR = accounts[1]
    const INVESTOR2 = accounts[2]
    const WALLET = accounts[3]
    const RATE = 2
    const CAP = 100

    const deployPresale = async (deltaStart, deltaEnd) => {
        const token = await LcdToken.deployed()
        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp

        const presale = await Presale.new(
            now + deltaStart,
            now + deltaEnd,
            RATE,
            CAP,
            token.address,
            WALLET
        )

        await token.approve(presale.address, CAP, { from: OWNER })
        await token.editWhitelist(presale.address, true, { from: OWNER })
        return presale
    }

    const deploySale = async (deltaStart, deltaEnd, presale) => {
        const token = await LcdToken.deployed()
        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp
        const sale = await Sale.new(
            now + deltaStart,
            now + deltaEnd,
            RATE,
            CAP,
            token.address,
            WALLET,
            presale
        )

        await token.approve(sale.address, CAP, { from: OWNER })
        await token.editWhitelist(sale.address, true, { from: OWNER })
        return sale
    }

    let presale, sale

    before(async () => {
        presale = await deployPresale(10000, 50000)
        sale = await deploySale(50000, 100000, Presale.address)
    });

    it('should set owner correctly', async () => {
        const res = await sale.owner()

        res.should.equal(OWNER)
    })

    it('should not allow to invest before start', async () => {
        return sale.sendTransaction({ from: INVESTOR, value: 1 })
            .should.be.rejected
    })

    it('should allow owner edit whitelist', async () => {
        await sale.editEarlyParicipantWhitelist(INVESTOR, true, { from: OWNER })

        const res = await sale.earlyParticipantWhitelist(INVESTOR)

        res.should.be.true
    })

    it('should allow owner set rate', async () => {
        await sale.setRate(RATE, { from: OWNER })

        const res = new BigNumber(await sale.rate())

        res.should.be.bignumber.equals(RATE)
    })

    it('should allow whitelisted investors to invest before start', async () => {
        const value = 1
        await sale.sendTransaction({ from: INVESTOR, value: value })

        const token = await LcdToken.deployed()
        const balance = new BigNumber(await token.balanceOf(INVESTOR))

        balance.should.be.bignumber.equals(value * RATE)
    })

    it('should allow all investors to invest after start = end of presale', async () => {

        //making presale finished
        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp
        const startTime = (await presale.startTime()).toNumber()
        utils.increaseTime(startTime - now + 30)
        const weiCap = await presale.weiCap()
        const weiRaised = await presale.weiRaised()
        await presale.sendTransaction({ from: INVESTOR2, value: weiCap.minus(weiRaised) })

        const presaleHasEnded = await presale.hasEnded()
        
        presaleHasEnded.should.be.true

        const value = 1
        const balance1 = new BigNumber(web3.eth.getBalance(WALLET))

        await sale.sendTransaction({ from: INVESTOR2, value: value })

        const token = await LcdToken.deployed()
        const tokens = new BigNumber(await token.balanceOf(INVESTOR))
        const balance2 = new BigNumber(web3.eth.getBalance(WALLET))

        tokens.should.be.bignumber.equals(value * RATE)
        balance2.should.be.bignumber.equals(balance1.plus(value))
    })

    it('should now allow to invest more then hard cap', async () => {
        const weiCap = await sale.weiCap()
        const weiRaised = await sale.weiRaised()
        await sale.sendTransaction({ from: INVESTOR2, value: weiCap.minus(weiRaised) })

        return sale.sendTransaction({ from: INVESTOR2, value: 1 }).should.be.rejected
    })

    it('should now allow to invest after endTime', async () => {
        sale = await deployPresale(10, 11)
        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp
        const endTime = (await sale.endTime()).toNumber()
        utils.increaseTime(endTime - now + 30)

        return sale.sendTransaction({ from: INVESTOR2, value: 1 }).should.be.rejected
    })

});