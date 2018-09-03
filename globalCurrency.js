let { round, floor, ceil } = require('./helpers.js');

class GlobalCurrency {
    constructor(cupDecimals, tradesDecimals, symbol) {
        this.bids = [];
        this.asks = [];
        this.best = {};
        this.cup = [];
        this.upper = null;
        this.lower = null;
        this.mid = null;
        this.threshUpper = null;
        this.threshLower = null;
        this.counter = null;
        this.tempCup = [];
        this.numsAfterDecimal = {
            cup: cupDecimals,
            trades: tradesDecimals
        }
        this.trades = [];
        this.index = null;
        this.roundedPrice = null;
        this.symbol = symbol;
    }
    seedCup() {
        this.cup = []
        for (let i = this.upper; i >= this.lower; i -= 1 / Math.pow(10, this.numsAfterDecimal.cup)) {
            this.cup.push({ vol: "", price: round(i, -this.numsAfterDecimal.cup), type: "", hit: null, lift: null })
        }
        return this.cup
    }
    updateCupOrderbook() {
        this.cup.forEach((item) => {
            item.vol = ''
            item.type = ''
        })

        this.index = null

        this.tempCup.forEach((item) => {
            this.index = this.cup.map(o => o.price).indexOf(item.price)
            if (this.index != -1) {
                this.cup[this.index].vol = item.vol
                this.cup[this.index].type = item.type
            }
        })

        for (let item of this.cup) {
            if (item.price >= ceil(this.best.ask.price, -this.numsAfterDecimal.cup)) {
                item.type = 'ask'
            } else if (item.price < ceil(this.best.ask.price, -this.numsAfterDecimal.cup) && item.price > floor(this.best.bid.price, -this.numsAfterDecimal.cup)) {
                item.type = 'mid'
            } else {
                item.type = 'bid'
            }
        }

        return this.updateCupTrades()
    }
    updateCupTrades() {
        this.index = null

        this.trades.forEach((item) => {
            this.index = this.cup.map(o => o.price).indexOf(item.price)
            if (this.index != -1) {
                this.cup[this.index].hit = item.hit
                this.cup[this.index].lift = item.lift
            }
        })

        return this.cup
    }
}

module.exports = GlobalCurrency