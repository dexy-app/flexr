# flexr
A reimplementation of the Ampleforth token and its geyser

Like Ampleforth (AMPL), flexr adjusts its supply based on current demand.  If the price is lower than the target price, the supply contracts, and in the same fashion, if the price has increased too much, the supply will expand.  For long time holders, the daily planned rebase does not affect the amount they own, i.e. holding 2 token worth $1 or holding 1 token worth $2, or 4 tokens worth $0.5 does not change how much your tokens are worth.  It does provide an opportunity for short term traders to arbitrage the price around the rebase time.

To minimize price movement, the rebase is done with a planned 30 days to reach the target price, but with no memory of what was done before, so each rebase adjusts the supply by 1/30 of what is needed.

By using an elastic supply, it minimizes the possibility of demand/supply shocks, and creates an asset with near zero correlation to other assets.  In other words, this reduces [systematic risk](https://www.ampleforth.org/economics/)

### Economic background on flexible synthetic commodities
See the [paper](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2000118) on Synthetic Commodity Money by George Selgin.

Abstract
> This paper considers reform possibilities posed by a type of base money that has heretofore been overlooked in the literature on monetary economics. I call this sort of money "synthetic" commodity money because it shares features with both commodity money and fiat money, as these are usually defined, without fitting the conventional definition of either; examples of such money are Bitcoin and the "Swiss dinars" that served as the currency of northern Iraq for over a decade. I argue that the attributes of synthetic commodity money are such as might supply the basis for a monetary regime that does not require oversight by any monetary authority, yet is capable of providing for all such changes in the money stock as may be needed to achieve a high degree of macroeconomic stability.


### More on Ampleforth
The Ampleforth [whitepaper](https://www.ampleforth.org/papers/)

Abstract
> Synthetic commodities, such as Bitcoin, have thus far demonstrated low correlation with stocks, currencies, and precious metals. However, today’s synthetics are also highly correlated with each other and with Bitcoin. The natural question to ask is: can a synthetic commodity have low correlation with both Bitcoin and traditional asset groups? In this paper, we 1) introduce Ampleforth: a new synthetic commodity and 2) suggest that the Ampleforth protocol, detailed below, will produce a step-function-like volatility fingerprint that is distinct from existing synthetics.

### Why non correlation is important
Uncorrelated return streams is the holy grail of portfolio construction, both greatly reducing drawdowns (because one asset zigs when other zags), but potentially providing a total return greater than the average of the weighted returns (because your money has to work less hards as you did not lose as much, i.e. if you lose 50%, you need a gain of 100% to break even).

### Example

Supply, price and balances over time:
|  | market cap| total supply    |price | alice adjusted balance | alice adjusted share | bob adjusted balance | bob adjusted share | supply∆     | supply∆ / smoothing |
|--|-----------|-----------|------|------------------|----------------|------------------|----------------|--------------|-------------|
|1 | 1,300,000 | 1,000,000 |1.30  | 100,000      | 10.000%        |                  |                |   300,000 | 10,000 |
|2 | 1,111,000 | 1,010,000 |1.10  | 101,000      | 10.000%        |                  |                |   101,000 | 3,366  |
|3 | 912,030   | 1,013,366 |0.90  | 101,336      | 10.000%        | 50,000.0         | 4.934%         |  -101336  | -3,377 | 
|4 | 1,009,988 | 1,009,988 |1     | 100,998      | 10.000%        | 49,833.3         | 4.934%         |  0        | 0      |
|5 | 1,211,986 | 1,009,988 |1.2   | 100,998      | 10.000%        | 49,833.3         | 4.934%         |  201,997  | 6,733  |  
|6 | 1,118,394 | 1,016,722 |1.1   | 101,672      | 10.000%        | 50,165.6         | 4.934%         | 101,672   | 3,389  | 

Bob gets 100,000 flexr at t=1 with an adjustment factor of 1,000,000 (the supply at t=1), and Alice gets 50,000 flexr with an ajdustment factor of 1,013,366.667 (the supply at t=3 when she gets her tokens).  See below for more on the [adjustement facto](#flexr-rebase-math)

Note: there is no price change at t=4, so no rebase

# The flexr ecosystem

The [flexr token](#the-flexr-token) implements the [SRC20 trait](#the-src20-token-trait) relies on a new version of [swapr](#changes-to-swapr) for trading.  Liquidity providers on [swapr](#changes-to-swapr) can in turn stake their liquidity using a new swapr pair token on the [flexr geyser](#the-flexr-geyser).  The longer you stake your liquidity token, the higher the reward you may get (in [flexr](#the-flexr-token) token), up to 3x after 2 months.  The [flexr token](#the-flexr-token) relies on an [Oracle](#the-flexr-oracle) to learn about the price average over the past 24 hours to know whether, or how much to [rebase](#flexr-rebase-math).

By incentivizing liquidity providers, the Ampleforth token was able to become the pair (AMPL-ETH) with the most liquidity on Uniswap in just a few months.  Having a similar incentive should help the flexr token in a similar way.


## the SRC20 token trait
swapr relied on tokens that implements the [SRC20 trait](./contracts/src20-trait.clar) to allow for:
- transfer
- name of the token
- getting the balance of an owner
- getting the total supply

## Changes to swapr
The original version of [swapr](https://github.com/psq/swapr) was relased for the first Blockstak Hackaton.

In order to support flexr, it was necessary to introduce the following changes:
- balances are no longer hardcoded, allowing for tokens with an elastic supply.  It looks like Uniswap v2 can also support this as it support AMPL.
- the main swaprs contract can be used for multiple pairs by leveraging traits, although it is very likely that the final version will need one contract deployed per pair anyway, but this can be the exact same contract, not a contract with hardcoded pair addresses, so a net benefit
- liquidity providers now get a token for their share of liquidity they provide to a pair, allowing them to exchange it with others, or stake it (used by flexr's geyser!).  Uniswap v2 supports this as well.

## The flexr token

### flexr rebase math
During a rebase, everyone's balances get adjusted.  As this would not scale very well with a high number of holders, rebase calculate an adjustment factor to apply to apply to each balance, which gets finalized when exchanging the flexr token.

```
supply∆ = (current_price - price_target) * current_total_supply / price_target
smoothed_supply∆ = supply∆ / 30
``` 

## The flexr Oracle
see https://docs.pro.coinbase.com/#oracle for details on how to do it, but still missing secp256k1 signature verification (https://github.com/blockstack/stacks-blockchain/issues/1134)

## The flexr Geyser
Liquidity providers on swapr get a token representing their share of the liquity they provide on the flexr-wrapr pair (STX needs to be wrapped )

## Putting it all together
(see more details in the [Scenario descrition](./scenario.md)) or the [tests](./test/unit/flexr.ts)


# Gotchas
To run the tests requires a patched version of the clarity-native-bin module to support setting STX balances from [balances.json](./balances.json)
See https://github.com/blockstack/clarity-js-sdk/issues/77 for more details.  The real fix will need a bit more work than what was used


