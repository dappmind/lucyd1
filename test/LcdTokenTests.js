const BigNumber = require('bignumber.js')
const chai = require('chai')
chai.use(require('chai-bignumber')());
chai.use(require('chai-as-promised'))
chai.should()

let LcdToken = artifacts.require('./LcdToken.sol')

contract('LcdToken', (accounts) => {

  const OWNER = accounts[0]
  const UNKNOWN = accounts[1]
  const UNKNOWN2 = accounts[2]
  const WHITELISTED = accounts[3]
  const TOTAL_SUPPLY = new BigNumber('1e+26')

  let token

  before(async () => {
    token = await LcdToken.new({ from: OWNER });
  });

  it('should return totalSupply', async () => {
    const res = new BigNumber(await token.totalSupply())
    res.should.be.bignumber.equals(TOTAL_SUPPLY)
  })

  it('should assign totalSupply to owner', async () => {
    const balance = new BigNumber(await token.balanceOf(OWNER))
    balance.should.be.bignumber.equals(TOTAL_SUPPLY)
  })

  it('should set owner properly', async () => {
    const res = await token.owner()
    res.should.equal(OWNER)
  })

  it('should add owner into whitelist', async () => {
    const res = await token.whitelistedBeforeActivation(OWNER)
    res.should.be.true
  })

  it('should not add others into whitelist', async () => {
    const res = await token.whitelistedBeforeActivation(UNKNOWN)
    res.should.be.false
  })

  it('should allow owner add accounts into whitelist', async () => {
    await token.editWhitelist(WHITELISTED, true)
    const res = await token.whitelistedBeforeActivation(WHITELISTED)
    res.should.be.true
  })

  it('should allow operations to whitelisted accounts', async () => {
    const amount = 100
    const balance1 = await token.balanceOf(OWNER)

    await token.approve(WHITELISTED, amount, { from: OWNER })
    await token.transferFrom(OWNER, WHITELISTED, amount, { from: WHITELISTED })

    const balance2 = new BigNumber(await token.balanceOf(OWNER))

    balance2.should.be.bignumber.equals(TOTAL_SUPPLY.minus(amount))
  })

  it('should not allow operations to non-whitelisted accounts', async () => {
    const amount = 100

    await token.transfer(UNKNOWN, amount, { from: OWNER })

    const promise = token.transfer(OWNER, amount, { from: UNKNOWN })
    return promise.should.be.rejected
  })

  it('should not allow non-owner to activate token', async () => {
    return token.activate({from : UNKNOWN}).should.be.rejected
  })

  it('should allow owner to activate token', async () => {
    await token.activate({from : OWNER})
    const isActivated = await token.isActivated()
    isActivated.should.be.true
  })

  it('should allow all operations after activation', async () => {
    const allowance = 15
    await token.approve(UNKNOWN2, 10, { from: UNKNOWN })
    await token.increaseApproval(UNKNOWN2, 10, { from: UNKNOWN })
    await token.decreaseApproval(UNKNOWN2, 5, { from: UNKNOWN })

    const res = new BigNumber(await token.allowance(UNKNOWN, UNKNOWN2))
    res.should.be.bignumber.equals(allowance)

    await token.transferFrom(UNKNOWN, UNKNOWN2, allowance, {from : UNKNOWN2})
    
    const balance = new BigNumber(await token.balanceOf(UNKNOWN2))
    balance.should.be.bignumber.equals(allowance)
  })

});