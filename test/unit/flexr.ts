import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity"
import { readFileSync } from 'fs'

const chai = require('chai')
chai.use(require('chai-string'))
const assert = chai.assert

import { FlexrClient } from "../../src/clients/flexr-client"
import { GeyserClient } from "../../src/clients/geyser-client"
import { OracleClient } from "../../src/clients/oracle-client"
import { SwaprClient } from "../../src/clients/swapr-client"
import { SwaprTokenClient } from "../../src/clients/swapr-token-client"
import { WraprClient } from "../../src/clients/wrapr-client"
import {
  NoLiquidityError,
  NotOKErr,
  NotOwnerError,
  TransferError,
} from '../../src/errors'

// const keys = JSON.parse(readFileSync('./keys.json').toString())

describe("full test suite", () => {
  let provider: Provider

  let src20TraitClient: Client
  let swaprTraitClient: Client

  let flexrClient: Client
  let geyserClient: Client
  let oracleClient: Client
  let swaprClient: Client
  let swaprTokenClient: Client
  let wraprClient: Client

  const prices = [
    1_100_000,
    1_150_000,
    1_050_000,
      950_000,
      900_000,
    1_000_000,
    1_000_000,
    1_000_000,
  ]

  const addresses = [
    "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",  // alice, u20 tokens of each
    "S02J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKPVKG2CE",  // bob, u10 tokens of each
    "SZ2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR",  // zoe, no tokens
    "SP138CBPVKYBQQ480EZXJQK89HCHY32XBQ0T4BCCD",  // ?
    "SP1EHFWKXQEQD7TW9WWRGSGJFJ52XNGN6MTJ7X462",  // flexr treasury
    "SP30JX68J79SMTTN0D2KXQAJBFVYY56BZJEYS3X0B",

  ]
  const alice = addresses[0]
  const bob = addresses[1]
  const zoe = addresses[2]
  const flexr_treasury = `${addresses[4]}`
  const flexr_token = `S1G2081040G2081040G2081040G208105NK8PE5.flexr-token`
  const swapr_token = `S1G2081040G2081040G2081040G208105NK8PE5.swapr-token`
  const wrapr_token = `S1G2081040G2081040G2081040G208105NK8PE5.wrapr-token`

  // const swapr_contract = addresses[3]

  // const token1 = `${addresses[4]}.token1`
  // const token2 = `${addresses[4]}.token2`
  // const token3 = `${addresses[4]}.token3`
  // const pair1 = `${addresses[4]}.pair1`
  // const pair2 = `${addresses[4]}.pair2`


  before(async () => {
    provider = await ProviderRegistry.createProvider()

    src20TraitClient = new Client("S1G2081040G2081040G2081040G208105NK8PE5.src20-trait", "src20-trait", provider)
    swaprTraitClient = new Client("S1G2081040G2081040G2081040G208105NK8PE5.swapr-trait", "swapr-trait", provider)

    flexrClient = new FlexrClient("S1G2081040G2081040G2081040G208105NK8PE5", provider)
    geyserClient = new GeyserClient("S1G2081040G2081040G2081040G208105NK8PE5", provider)
    oracleClient = new OracleClient("S1G2081040G2081040G2081040G208105NK8PE5", provider)
    swaprClient = new SwaprClient("S1G2081040G2081040G2081040G208105NK8PE5", provider)
    swaprTokenClient = new SwaprTokenClient("flexr-wrapr", "S1G2081040G2081040G2081040G208105NK8PE5", provider)
    wraprClient = new WraprClient("S1G2081040G2081040G2081040G208105NK8PE5", provider)
  })

  describe("Check contracts", () => {
    it("should have a valid syntax", async () => {
      await src20TraitClient.checkContract()
      await src20TraitClient.deployContract() // deploy first

      await swaprTraitClient.checkContract()
      await swaprTraitClient.deployContract() // deploy first

      await swaprClient.checkContract()
      await swaprClient.deployContract()

      await wraprClient.checkContract()
      await wraprClient.deployContract()

      await oracleClient.checkContract()
      await oracleClient.deployContract()

      await flexrClient.checkContract()
      await flexrClient.deployContract()

      await swaprTokenClient.checkContract()
      await swaprTokenClient.deployContract() // deploy second

      await geyserClient.checkContract()
      await geyserClient.deployContract()
    })
  })

  describe("Full scenario", () => {
    // let original_balances
    // let alice_balances = {
    //   x: 0,
    //   y: 0,
    // }
    // let original_fees
    // let swap_result
    // const dx = 10000
    // const dy = 4887

    before(async () => {
      // wrap stx into wrapr
      console.log("======>  wrap.treasury")
      assert(await wraprClient.wrap(50_000_000_000_000, {sender: flexr_treasury}))

      // create flerx-swapr pair
      console.log("======>  createPair.treasury")
      assert(await swaprClient.createPair(flexr_token, wrapr_token, swapr_token, "flexr-wrapr", 50_000_000_000_000, 50_000_000_000_000, {sender: flexr_treasury}), "createPair did not return true")


      // Alice wraps STX
      console.log("======>  wrap.alice")
      assert(await wraprClient.wrap(100_000_000_000, {sender: alice}))
      // Alice gets some FLEXR
      console.log("======>  swapExactYforX.alice")
      assert(await swaprClient.swapYforExactX(flexr_token, wrapr_token, 40_000_000_000, {sender: alice}))
      // Alice add a position on swapr's FLEXR-WRAPR pair
      console.log("======>  addToPosition.alice")
      assert(await swaprClient.addToPosition(flexr_token, wrapr_token, swapr_token, 40_000_000_000, 40_000_000_000, {sender: alice}), "addToPosition did not return true")
      // Alice stakes her position on geyser
      console.log("======>  stake.alice")
      assert(await geyserClient.stake(40_000_000_000, {sender: alice}), "stake did not return true")

      // Bob wraps STX
      console.log("======>  wrap.bob")
      assert(await wraprClient.wrap(50_000_000_000, {sender: bob}))

      // Zoe wraps STX
      console.log("======>  wrap.zoe")
      assert(await wraprClient.wrap(50_000_000_000, {sender: zoe}))
      // Zoe gets a lot of FLEXR
      console.log("======>  wrap.zoe")
      assert(await swaprClient.swapExactYforX(flexr_token, wrapr_token, 50_000_000_000, {sender: zoe}))

      for (let i = 0; i < 5; i++) {
        console.log(`======>  swapExactYforX.bob - round ${i}`)

        // Bob exhanges WRAPR for FLEXR (back and forth 5x)
        console.log("======>  swapExactYforX.bob")
        assert(await swaprClient.swapExactYforX(flexr_token, wrapr_token, 2_000_000_000, {sender: bob}))
        // Zoe exhanges FLEXR for WRAPR (back and forth 5x)
        console.log("======>  swapExactXforY.zoe")
        assert(await swaprClient.swapExactXforY(flexr_token, wrapr_token, 2_000_000_000, {sender: zoe}))

        console.log("======>  updatePrice.zoe")
        assert(await oracleClient.updatePrice(prices[i], {sender: zoe}))
        console.log(`======>  rebase.zoe - ${prices[i]}`)
        assert(await flexrClient.rebase({sender: zoe}))
      }

      // Alice collects her reward on geyser
      console.log("======>  unstake.alice")
      assert(await geyserClient.unstake({sender: alice}), "stake did not return true")
    })

    it("check balances after running scenario", async () => {
      // Alice checks the fees she collected
      assert.equal(await flexrClient.balanceOf(alice, {sender: alice}), 960_000)

      // total FLEXR supply
      assert.equal(await flexrClient.totalSupply({sender: alice}), 1_014_873_127_537_500) // starting value: 1_000_000_000_000_000
    })

  })



  // describe.skip("wrapr", () => {
  //   it("total supply should be 0", async () => {
  //     const totalSupply = await wraprClient.totalSupply(alice)
  //     assert.equal(totalSupply, 0)
  //   })

  //   it("contract balances should be 0", async () => {
  //     const x_balance = await x_token_client.balanceOf(swapr_contract)
  //     const y_balance = await y_token_client.balanceOf(swapr_contract)
  //     assert.equal(x_balance, 0)
  //     assert.equal(y_balance, 0)
  //   })

  //   it("Alice wrapr balance should be 0", async () => {
  //     const balance = await wraprClient.balanceOf(alice)
  //     assert.equal(balance, 0)
  //   })

  //   it("with no STX, wrap should fail", async () => {
  //     try {
  //       const result = await wraprClient.wrap(10, {sender: alice})
  //     } catch(e) {
  //       // console.log(e)
  //       if (e instanceof TransferError) {
  //         assert(true)
  //       } else {
  //         assert(false, "did not throw TransferError")
  //       }
  //     }
  //   })

  //   it("with no STX, transfer should fail", async () => {
  //     try {
  //       const result = await wraprClient.transfer(bob, 15, {sender: alice})
  //     } catch(e) {
  //       // console.log(e)
  //       if (e instanceof TransferError) {
  //         assert(true)
  //       } else {
  //         assert(false, "did not throw TransferError")
  //       }
  //     }
  //   })

  //   it("with no STX, unwrap should fail", async () => {
  //     try {
  //       const result = await wraprClient.unwrap(10, {sender: alice})
  //     } catch(e) {
  //       // console.log(e)
  //       if (e instanceof TransferError) {
  //         assert(true)
  //       } else {
  //         assert(false, "did not throw TransferError")
  //       }
  //     }
  //   })

  // })

  // describe.skip("swapr", () => {
  //   describe("after deploying an instance of the contract, with no contributions", () => {
  //     it("should return 0 balance for Alice", async () => {
  //       const positionAlice = await swaprClient.positionOf(alice)
  //       assert.equal(positionAlice, 0)
  //     })
  //   })

  //   describe("after deploying an instance of the contract, with no contributions", () => {
  //     it("should return 0 balance for Alice", async () => {
  //       const positionAlice = await swaprClient.positionOf(alice)
  //       assert.equal(positionAlice, 0)
  //     })

  //     it("should throw NoLiquidityError when calling balances-of", async () => {
  //       try {
  //         await swaprClient.balancesOf(alice)
  //       } catch(e) {
  //         if (e instanceof NoLiquidityError) {
  //           assert(true)
  //         } else {
  //           assert(false, "did not throw NoLiquidityError")
  //         }
  //       }
  //     })

  //     it("should display 0 balances overal", async () => {
  //       const balances = await swaprClient.balances()
  //       assert.equal(balances.x, 0)
  //       assert.equal(balances.y, 0)
  //     })
  //   })


  //   describe("after deploying an instance of the contract, and bob contributes x: 10, y: 5", () => {
  //     before(async () => {
  //       assert(await swaprClient.addToPosition(10, 5, {sender: bob}), "addToPosition did not return true")
  //     })

  //     it("bob's token balances should have changed", async () => {
  //       const balance1 = await x_token_client.balanceOf(bob)
  //       const balance2 = await y_token_client.balanceOf(bob)
  //       assert.equal(balance1, 999990)
  //       assert.equal(balance2, 999995)
  //     })

  //     it("should return a balance of 10 for bob", async () => {
  //       const positionBob = await swaprClient.positionOf(bob)
  //       assert.equal(positionBob, 10)
  //     })

  //     it("should get the proper balances when calling balances-of", async () => {
  //       try {
  //         const balances = await swaprClient.balancesOf(bob)
  //         assert.equal(balances.x, 10)
  //         assert.equal(balances.y, 5)
  //       } catch(e) {
  //         // console.log(e)
  //         assert(false, "should not throw")
  //       }
  //     })

  //     it("should display the proper balances overall", async () => {
  //       const balances = await swaprClient.balances()
  //       assert.equal(balances.x, 10)
  //       assert.equal(balances.y, 5)
  //     })

  //     it("should display the proper positions overall", async () => {
  //       const positions = await swaprClient.positions()
  //       assert.equal(positions, 10)
  //     })

  //     it("contract balances should be updated", async () => {
  //       const x_balance = await x_token_client.balanceOf(swapr_contract)
  //       const y_balance = await y_token_client.balanceOf(swapr_contract)
  //       assert.equal(x_balance, 10)
  //       assert.equal(y_balance, 5)
  //     })

  //   })

  //   describe("alice contributes x: 20, y: 10", () => {
  //     before(async () => {
  //       assert(await swaprClient.addToPosition(20, 10, {sender: alice}), "addToPosition did not return true")
  //     })

  //     it("alice's token balances should have changed", async () => {
  //       const balance1 = await x_token_client.balanceOf(alice)
  //       const balance2 = await y_token_client.balanceOf(alice)
  //       assert.equal(balance1, 1999980)
  //       assert.equal(balance2, 1999990)
  //     })

  //     it("should return a balance of 20 for Alice", async () => {
  //       const positionAlice = await swaprClient.positionOf(alice)
  //       assert.equal(positionAlice, 20)
  //     })

  //     it("should get the proper balances when calling balances-of", async () => {
  //       try {
  //         const balances = await swaprClient.balancesOf(alice)
  //         assert.equal(balances.x, 20)
  //         assert.equal(balances.y, 10)
  //       } catch(e) {
  //         // console.log(e)
  //         assert(false, "should not throw")
  //       }
  //     })

  //     it("should display the proper balances overall", async () => {
  //       const balances = await swaprClient.balances()
  //       assert.equal(balances.x, 30)
  //       assert.equal(balances.y, 15)
  //     })

  //     it("should display the proper positions overall", async () => {
  //       const positions = await swaprClient.positions()
  //       assert.equal(positions, 30)
  //     })

  //     it("contract balances should be updated", async () => {
  //       const x_balance = await x_token_client.balanceOf(swapr_contract)
  //       const y_balance = await y_token_client.balanceOf(swapr_contract)
  //       assert.equal(x_balance, 30)
  //       assert.equal(y_balance, 15)
  //     })

  //   })

  //   describe("alice reduces by 50%", () => {
  //     before(async () => {
  //       const result = await swaprClient.reducePosition(50, {sender: alice})
  //       assert.equal(result.x, 10)
  //       assert.equal(result.y, 5)
  //     })

  //     it("alice's token balances should have changed", async () => {
  //       const balance1 = await x_token_client.balanceOf(alice)
  //       const balance2 = await y_token_client.balanceOf(alice)
  //       assert.equal(balance1, 1999990)
  //       assert.equal(balance2, 1999995)
  //     })

  //     it("should return a balance of 20 for Alice", async () => {
  //       const positionAlice = await swaprClient.positionOf(alice)
  //       assert.equal(positionAlice, 10)
  //     })

  //     it("should get the proper balances when calling balances-of", async () => {
  //       try {
  //         const balances = await swaprClient.balancesOf(alice)
  //         assert.equal(balances.x, 10)
  //         assert.equal(balances.y, 5)
  //       } catch(e) {
  //         // console.log(e)
  //         assert(false, "should not throw")
  //       }
  //     })

  //     it("should display the proper balances overall", async () => {
  //       const balances = await swaprClient.balances()
  //       assert.equal(balances.x, 20)
  //       assert.equal(balances.y, 10)
  //     })

  //     it("should display the proper positions overall", async () => {
  //       const positions = await swaprClient.positions()
  //       assert.equal(positions, 20)
  //     })

  //     it("contract balances should be updated", async () => {
  //       const x_balance = await x_token_client.balanceOf(swapr_contract)
  //       const y_balance = await y_token_client.balanceOf(swapr_contract)
  //       assert.equal(x_balance, 20)
  //       assert.equal(y_balance, 10)
  //     })

  //   })

  //   // TODO(psq): test that reducePosition does not accept a value > u100

  //   describe("Setting the fee", () => {
  //     before(async () => {
  //     })

  //     it("before setting, should return null", async () => {
  //       const address = await swaprClient.getFeeTo()
  //       assert.equal(address, null)
  //     })

  //     it("non owner can not set the address", async () => {
  //       try {
  //         const result = await swaprClient.setFeeTo(bob, {sender: bob})
  //         assert(false, "should not return")
  //       } catch(e) {
  //         // console.log(e)
  //         if (e instanceof NotOwnerError) {
  //           assert(true)
  //         } else {
  //           assert(false, "did not throw NotOwnerError")
  //         }
  //       }
  //     })

  //     it("owner can set the address", async () => {
  //       try {
  //         const result = await swaprClient.setFeeTo(zoe, {sender: zoe})
  //         assert(result, "should return true")
  //       } catch(e) {
  //         // console.log(e)
  //         assert(false, "should not throw")
  //       }
  //     })

  //     // assumes tests are run sequentially, which chai should be doing
  //     // running tests in parallel would require a reorg
  //     it("should now return zoe", async () => {
  //       const address = await swaprClient.getFeeTo()
  //       assert.equal(address, zoe)
  //     })
  //   })

  //   describe("Clients exchanging tokens", () => {
  //     before(async () => {
  //       // add lots of liquidity
  //       assert(await swaprClient.addToPosition(500000, 250000, {sender: bob}), "addToPosition did not return true")
  //     })

  //     it("should display the proper balances overall", async () => {
  //       const balances = await swaprClient.balances()
  //       assert.equal(balances.x, 500020)
  //       assert.equal(balances.y, 250010)
  //     })

  //     describe("Alice exchanges 10000 of X for Y", () => {
  //       let original_balances
  //       let alice_balances = {
  //         x: 0,
  //         y: 0,
  //       }
  //       let original_fees
  //       let swap_result
  //       const dx = 10000
  //       const dy = 4887

  //       before(async () => {
  //         // add lots of liquidity
  //         original_balances = await swaprClient.balances()
  //         original_fees = await swaprClient.fees()
  //         alice_balances.x = await x_token_client.balanceOf(alice)
  //         alice_balances.y = await y_token_client.balanceOf(alice)
  //         swap_result = await swaprClient.swapExactXforY(dx, {sender: alice})
  //       })

  //       it("Amount swapped should be correct", async () => {
  //         assert.equal(swap_result.x, dx)
  //         assert.equal(swap_result.y, dy)
  //       })

  //       it("Contract balances have been updated", async () => {
  //         const balances = await swaprClient.balances()
  //         assert.equal(balances.x, original_balances.x + dx - 5)
  //         assert.equal(balances.y, original_balances.y - dy)
  //       })

  //       it("Contract fees have been updated", async () => {
  //         const balance = await swaprClient.fees()
  //         assert.equal(balance.x, 5)
  //         assert.equal(balance.y, 0)
  //       })

  //       it("Alice token balances have been updated", async () => {
  //         const balance1 = await x_token_client.balanceOf(alice)
  //         const balance2 = await y_token_client.balanceOf(alice)
  //         assert.equal(balance1, alice_balances.x - dx)
  //         assert.equal(balance2, alice_balances.y + dy)
  //       })

  //       it("contract balances should be updated", async () => {
  //         const x_balance = await x_token_client.balanceOf(swapr_contract)
  //         const y_balance = await y_token_client.balanceOf(swapr_contract)
  //         assert.equal(x_balance, 500020 + dx)
  //         assert.equal(y_balance, 250010 - dy)
  //       })

  //     })

  //     describe("Bob exchanges 20000 of Y for X", () => {
  //       let original_balances
  //       let bob_balances = {
  //         x: 0,
  //         y: 0,
  //       }
  //       let original_fees
  //       let swap_result
  //       const dx = 38367
  //       const dy = 20000

  //       before(async () => {
  //         // add lots of liquidity
  //         original_balances = await swaprClient.balances()
  //         original_fees = await swaprClient.fees()
  //         bob_balances.x = await x_token_client.balanceOf(bob)
  //         bob_balances.y = await y_token_client.balanceOf(bob)
  //         swap_result = await swaprClient.swapExactYforX(dy, {sender: bob})
  //       })

  //       it("Amount swapped should be correct", async () => {
  //         assert.equal(swap_result.x, dx)
  //         assert.equal(swap_result.y, dy)
  //       })

  //       it("Contract balances have been updated", async () => {
  //         const balances = await swaprClient.balances()
  //         assert.equal(balances.x, original_balances.x - dx)
  //         assert.equal(balances.y, original_balances.y + dy - 10)
  //       })

  //       it("Contract fees have been updated", async () => {
  //         const balance = await swaprClient.fees()
  //         assert.equal(balance.x, 5)  // leftover from Alice
  //         assert.equal(balance.y, 10)
  //       })

  //       it("Bob token balances have been updated", async () => {
  //         const balance1 = await x_token_client.balanceOf(bob)
  //         const balance2 = await y_token_client.balanceOf(bob)
  //         assert.equal(balance1, bob_balances.x + dx)
  //         assert.equal(balance2, bob_balances.y - dy)
  //       })

  //       it("contract balances should be updated", async () => {
  //         const x_balance = await x_token_client.balanceOf(swapr_contract)
  //         const y_balance = await y_token_client.balanceOf(swapr_contract)
  //         assert.equal(x_balance, 500020 + 10000 - dx)
  //         assert.equal(y_balance, 250010 - 4887 + dy)
  //       })

  //     })

  //     describe("Alice exchanges some X for 25000 of Y", () => {
  //       let original_balances
  //       let alice_balances = {
  //         x: 0,
  //         y: 0,
  //       }
  //       let original_fees
  //       let swap_result
  //       const dx = 49254
  //       const dy = 25000

  //       before(async () => {
  //         // add lots of liquidity
  //         original_balances = await swaprClient.balances()
  //         original_fees = await swaprClient.fees()
  //         alice_balances.x = await x_token_client.balanceOf(alice)
  //         alice_balances.y = await y_token_client.balanceOf(alice)
  //         swap_result = await swaprClient.swapXforExactY(dy, {sender: alice})
  //       })

  //       it("Amount swapped should be correct", async () => {
  //         assert.equal(swap_result.x, dx)
  //         assert.equal(swap_result.y, dy)
  //       })

  //       it("Contract balances have been updated", async () => {
  //         const balances = await swaprClient.balances()
  //         assert.equal(balances.x, original_balances.x + dx - 24)
  //         assert.equal(balances.y, original_balances.y - dy)
  //       })

  //       it("Contract fees have been updated", async () => {
  //         const balance = await swaprClient.fees()
  //         assert.equal(balance.x, 5 + 24)
  //         assert.equal(balance.y, 10)
  //       })

  //       it("Alice token balances have been updated", async () => {
  //         const balance1 = await x_token_client.balanceOf(alice)
  //         const balance2 = await y_token_client.balanceOf(alice)
  //         assert.equal(balance1, alice_balances.x - dx)
  //         assert.equal(balance2, alice_balances.y + dy)
  //       })

  //       it("contract balances should be updated", async () => {
  //         const x_balance = await x_token_client.balanceOf(swapr_contract)
  //         const y_balance = await y_token_client.balanceOf(swapr_contract)
  //         assert.equal(x_balance, 471653 + dx)
  //         assert.equal(y_balance, 265123 - dy)
  //       })

  //     })

  //     describe("Bob exchanges some Y for 75000 of X", () => {
  //       let original_balances
  //       let bob_balances = {
  //         x: 0,
  //         y: 0,
  //       }
  //       let original_fees
  //       let swap_result
  //       const dx = 75000
  //       const dy = 40510

  //       before(async () => {
  //         // add lots of liquidity
  //         original_balances = await swaprClient.balances()
  //         original_fees = await swaprClient.fees()
  //         bob_balances.x = await x_token_client.balanceOf(bob)
  //         bob_balances.y = await y_token_client.balanceOf(bob)
  //         swap_result = await swaprClient.swapYforExactX(dx, {sender: bob})
  //       })

  //       it("Amount swapped should be correct", async () => {
  //         assert.equal(swap_result.x, dx)
  //         assert.equal(swap_result.y, dy)
  //       })

  //       it("Contract balances have been updated", async () => {
  //         const balances = await swaprClient.balances()
  //         assert.equal(balances.x, original_balances.x - dx)
  //         assert.equal(balances.y, original_balances.y + dy - 20)
  //       })

  //       it("Contract fees have been updated", async () => {
  //         const balance = await swaprClient.fees()
  //         assert.equal(balance.x, 29)  // leftover from Alice
  //         assert.equal(balance.y, 30)
  //       })

  //       it("Bob token balances have been updated", async () => {
  //         const balance1 = await x_token_client.balanceOf(bob)
  //         const balance2 = await y_token_client.balanceOf(bob)
  //         assert.equal(balance1, bob_balances.x + dx)
  //         assert.equal(balance2, bob_balances.y - dy)
  //       })

  //       it("contract balances should be updated", async () => {
  //         const x_balance = await x_token_client.balanceOf(swapr_contract)
  //         const y_balance = await y_token_client.balanceOf(swapr_contract)
  //         assert.equal(x_balance, 471653 + 49254 - dx)
  //         assert.equal(y_balance, 265123 - 25000 + dy)
  //       })

  //     })

  //   })


  //   describe.skip("Collecting the fee", () => {
  //     let original_fees
  //     before(async () => {
  //       original_fees = await swaprClient.fees()
  //     })

  //     it("should send fees to contract owner", async () => {
  //       const fees = await swaprClient.collectFees({sender: alice}) // anyone can pay for sending the fees :)
  //       assert.equal(fees.x, 29)
  //       assert.equal(fees.y, 30)
  //     })

  //     it("contract owner should have received the fees", async () => {
  //       const balance1 = await x_token_client.balanceOf(zoe)
  //       const balance2 = await y_token_client.balanceOf(zoe)
  //       assert.equal(balance1, original_fees.x)
  //       assert.equal(balance2, original_fees.y)
  //     })

  //     it("fees are now 0", async () => {
  //       const fees = await swaprClient.fees()
  //       assert.equal(fees.x, 0)
  //       assert.equal(fees.y, 0)
  //     })

  //     it("contract balances should be updated", async () => {
  //       const x_balance = await x_token_client.balanceOf(swapr_contract)
  //       const y_balance = await y_token_client.balanceOf(swapr_contract)
  //       assert.equal(x_balance, 500020 + 10000 - 38367 + 49254 - 75000 - 5 - 24)
  //       assert.equal(y_balance, 250010 - 4887 + 20000 - 25000 + 40510 - 10 - 20)
  //     })

  //   })

  //   describe.skip("Resetting the feeTo address", () => {
  //     it("non owner can not reset the address", async () => {
  //       try {
  //         const result = await swaprClient.resetFeeTo({sender: bob})
  //         assert(false, "should not return")
  //       } catch(e) {
  //         // console.log(e)
  //         if (e instanceof NotOwnerError) {
  //           assert(true)
  //         } else {
  //           assert(false, "did not throw NotOwnerError")
  //         }
  //       }
  //     })

  //     it("owner can reset the address", async () => {
  //       try {
  //         const result = await swaprClient.resetFeeTo({sender: zoe})
  //         assert(result, "should return true")
  //       } catch(e) {
  //         // console.log(e)
  //         assert(false, "should not throw")
  //       }
  //     })

  //     // assumes tests are run sequentially, which chai should be doing
  //     // running tests in parallel would require a reorg
  //     it("should now return null", async () => {
  //       const address = await swaprClient.getFeeTo()
  //       assert.equal(address, null)
  //     })
  //   })
  // })

  // describe("Token Registry Tests", () => {
  //   it("has no tokens", async () => {
  //     try {
  //       const result = await registryClient.getTokens({sender: bob})
  //       assert.equal(result.length, 0)
  //     } catch(e) {
  //       console.log(e)
  //       assert(false, "should not throw")
  //     }
  //   })

  //   it("adds a token", async () => {
  //     const result1 = await registryClient.addToken('token1', token1, {sender: bob})
  //     console.log("result1.add a token", result1)
  //     assert.equal(result1, true)

  //     const result2 = await registryClient.getTokens({sender: bob})
  //     console.log("result2.add a token", result2)
  //     assert.equal(result2.length, 1)
  //     assert.equal((Buffer.from(result2[0][1][1].substring(2), 'hex')).toString(), 'token1')

  //     // const result3 = await registryClient.renameToken(token1, 'token1a', {sender: bob})
  //     // console.log("result3.add a token", result3)
  //     // assert.equal(result3, true)
  //     const result3 = await registryClient.renameToken(token1, 'token1a', {sender: bob})
  //     console.log("result3.add a token", result3)
  //     assert.equal(result3, true)

  //     const result4 = await registryClient.getTokens({sender: bob})
  //     console.log("result4.add a token", result4)
  //     assert.equal(result4.length, 1)
  //     assert.equal((Buffer.from(result4[0][1][1].substring(2), 'hex')).toString(), 'token1a')

  //     const result5 = await registryClient.addToken('token2', token2, {sender: bob})
  //     console.log("result5.add a token", result5)
  //     assert.equal(result5, true)

  //     const result6 = await registryClient.getTokens({sender: bob})
  //     console.log("result6.add a token", result6)
  //     assert.equal(result6.length, 2)
  //     assert.equal((Buffer.from(result6[0][1][1].substring(2), 'hex')).toString(), 'token1a')
  //     assert.equal((Buffer.from(result6[1][1][1].substring(2), 'hex')).toString(), 'token2')
  //   })

  // })

  // describe("Pairs Registry Tests", () => {
  //   // TODO(psq): now that swapr registers itself, this is no longer, split into a different file?
  //   // TODO(psq): or deploy swapr later after these tests are done?
  //   it("has no pairs", async () => {
  //     const result = await registryClient.getPairs({sender: bob})
  //     assert.equal(result.length, 1)
  //   })

  //   it("adds a pair", async () => {
  //     const result1 = await registryClient.addPair(pair1, 'token3', token3, 'token2', token2, {sender: bob})
  //     console.log("result1.add a pair", result1)
  //     assert.equal(result1, true)

  //     const result2 = await registryClient.getPairs({sender: bob})
  //     console.log("result2.add a pair", JSON.stringify(result2, null, 2))
  //     assert.equal(result2.length, 2)
  //     assert.equal((Buffer.from(result2[0][1][1].substring(2), 'hex')).toString(), '{{token1}}')

  //     const result3 = await registryClient.addPair(pair2, 'token1', token1, 'token3', token3, {sender: bob})
  //     console.log("result3.add a pair", result3)
  //     assert.equal(result3, true)

  //     const result4 = await registryClient.getPairs({sender: bob})
  //     console.log("result4.add a pair", JSON.stringify(result4, null, 2))
  //     assert.equal(result4.length, 3)
  //     assert.equal((Buffer.from(result4[0][1][1].substring(2), 'hex')).toString(), '{{token1}}')
  //   })

  //   it("can't add the same pair again", async () => {
  //     try {
  //       const result1 = await registryClient.addPair(pair1, 'token3', token3, 'token2', token2, {sender: bob})
  //       console.log("result1.add a pair", result1)
  //       assert.equal(result1, true)
  //     } catch (e) {
  //       console.log(e)
  //       if (e instanceof NotOKErr) {
  //         assert(true)
  //       } else {
  //         assert(false, "did not throw NotOKErr")
  //       }
  //     }
  //   })

  //   it.skip("adds too many pairs", async () => {
  //     // TODO(psq): the test works, and fails when trying to create #2198 (zero based, and 2 created earlier), so check the failure happens at that index
  //     // disabled for now
  //     try {
  //       for (let i = 0; i < 10000; i++) {
  //         console.log("adding", i)
  //         const result1 = await registryClient.addPair(pair1, `token${i}`, keys[i], `token${i + 1}`, keys[i + 1], {sender: bob})
  //         assert.equal(result1, true)
  //         const result2 = await registryClient.getPairs({sender: bob})
  //         assert.equal(result2.length, i + 3)
  //       }
  //     } catch (e) {
  //       console.log(e)
  //       if (e instanceof NotOKErr) {
  //         assert(true)
  //       } else {
  //         assert(false, "did not throw NotOKErr")
  //       }
  //     }
  //   })


  // })

  after(async () => {
    await provider.close()
  })
})
