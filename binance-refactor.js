let { round, floor, ceil } = require('./helpers.js')

class Currency {
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
        this.tempCup = [];
        this.trades = [];
        this.counter = null;
        this.roundedPrice = null;
        this.index = null;
        this.numsAfterDecimal = {
            cup: cupDecimals,
            trades: tradesDecimals
        };
        this.bidPrices = [];
        this.askPrices = [];
        this.bidVolumes = [];
        this.askVolumes = [];
        this.symbol = symbol;
    }
    seedCup() {
        this.cup = []
        for (let i = this.upper; i >= this.lower; i -= 1 / Math.pow(10, this.numsAfterDecimal.cup)) {
            this.cup.push({ vol: "", price: round(i, -this.numsAfterDecimal.cup), type: "", hit: null, lift: null })
        }
        return this.cup
    }
    sortBids(data) {
        let object = {}
        let sortedKeys = Object.keys(data).sort((a,b)=>parseFloat(b)-parseFloat(a))
        for (let price of sortedKeys) {
            object[price] = parseFloat(data[price])
        }
        return object
    }
    sortAsks(data) {
        let object = {}
        let sortedKeys = Object.keys(data).sort((a,b)=>parseFloat(a)-parseFloat(b))
        for (let price of sortedKeys) {
            object[price] = data[price]
        }
        return object
    }
    updateCupOrderbook() {
        this.cup.forEach((item) => {
            item.vol = ''
            item.type = ''
        })

        this.index = null

        this.tempCup.forEach((item) => {
            this.index = this.cup.map(o => o.price).indexOf(Number(item.price))
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
    updateOrderbook(symbol, depth) {
        this.bids = this.sortBids(depth.bids)
        this.asks = this.sortAsks(depth.asks)

        this.best = {
            bid: {
                price: round(Number(Object.keys(this.bids).shift()),-this.numsAfterDecimal.cup)
            },
            ask: {
                price: round(Number(Object.keys(this.asks).shift()), -this.numsAfterDecimal.cup)
            }
        }

        this.bidPrices = Object.keys(this.bids)
        this.askPrices = Object.keys(this.asks)
        this.bidVolumes = Object.values(this.bids)
        this.askVolumes = Object.values(this.asks)

        if (this.cup.length == 0 || this.best.ask.price > this.threshUpper || this.best.bid.price < this.threshLower) {
            this.mid = round(((this.best.bid.price + this.best.ask.price)/2), -this.numsAfterDecimal.cup)
            this.upper = round(this.mid + (24 / Math.pow(10,this.numsAfterDecimal.cup)), -this.numsAfterDecimal.cup)
            this.lower = round(this.mid - (24 / Math.pow(10, this.numsAfterDecimal.cup)),-this.numsAfterDecimal.cup)
            this.threshUpper = round(this.mid + (14 / Math.pow(10, this.numsAfterDecimal.cup)), -this.numsAfterDecimal.cup)
            this.threshLower = round(this.mid - (14 / Math.pow(10, this.numsAfterDecimal.cup)), -this.numsAfterDecimal.cup)
            this.seedCup()
        }

        this.tempCup = []
        this.counter = 0

        for (let askPrice of this.askPrices) {
            askPrice = ceil(askPrice, -this.numsAfterDecimal.cup)
        }

        for (let bidPrice of this.bidPrices) {
            bidPrice = floor(bidPrice, -this.numsAfterDecimal.cup)
        }

        for (let i = this.askPrices.length - 1; i > 0; i--) {
            if (this.askPrices[i] - this.askPrices[0] <= (14 / Math.pow(10, this.numsAfterDecimal.cup))) {
                if (this.tempCup.length == 0) {
                    this.tempCup.push({ vol: Math.round(this.askVolumes[i]), price: this.askPrices[i], type: "ask", hit: null, lift: null })
                } else {
                    if (this.askPrices[i] == this.askPrices[i + 1]) {
                        this.tempCup[this.counter].vol += this.askVolumes[i]
                        this.tempCup[this.counter].vol = Math.round(this.tempCup[this.counter].vol)
                    } else {
                        this.tempCup.push({ vol: Math.round(this.askVolumes[i]), price: this.askPrices[i], type: "ask", hit: null, lift: null })
                        this.counter++
                    }
                }
            }
        }

        if (round(this.tempCup[this.counter].price - this.bidPrices[0], -this.numsAfterDecimal.cup) > (1 / Math.pow(10, this.numsAfterDecimal.cup))) {
            var numTimes = Math.round((this.tempCup[this.counter].price - this.bidPrices[0]) / (1 / Math.pow(10, this.numsAfterDecimal.cup)) - 1)
            for (let i = 1; i <= numTimes; i++) {
                this.tempCup.push({ vol: "", price: round((this.tempCup[this.counter].price - i * (1 / Math.pow(10, this.numsAfterDecimal.cup))), -this.numsAfterDecimal.cup), type: "mid", hit: null, lift: null })
                this.counter++
            }
        }

        for (let i = 0; i < this.bidPrices.length; i++) {
            if (this.bidPrices[0] - this.bidPrices[i] <= (14 / Math.pow(10, this.numsAfterDecimal.cup))) {
                if (this.tempCup[this.counter].type != "bid") {
                    this.tempCup.push({ vol: Math.round(this.bidVolumes[i]), price: this.bidPrices[i], type: "bid", hit: null, lift: null })
                    this.counter++
                } else {
                    if (this.bidPrices[i] == this.bidPrices[i - 1]) {
                        this.tempCup[this.counter].vol += this.bidVolumes[i]
                        this.tempCup[this.counter].vol = Math.round(this.tempCup[this.counter].vol)
                    } else {
                        this.tempCup.push({ vol: Math.round(this.bidVolumes[i]), price: this.bidPrices[i], type: "bid", hit: null, lift: null })
                        this.counter++
                    }
                }
            }
        }

        return this.updateCupOrderbook()
    }
    updateTrades(trades) {
        let { E: eventTime, p: price, q: quantity, m: maker} = trades;

        if (maker == true) {
            this.roundedPrice = floor(Number(price), -this.numsAfterDecimal.cup)
        } else {
            this.roundedPrice = ceil(Number(price), -this.numsAfterDecimal.cup)
        }

        let index = this.trades.map(o => o.price).indexOf(this.roundedPrice)

        if (index == -1) {
            if (maker == true) {
                this.trades.push({ price: this.roundedPrice, hit: Math.round(Number(quantity)), lift: null })
            } else {
                this.trades.push({ price: this.roundedPrice, hit: null, lift: Math.round(Number(quantity)) })
            }
        } else {
            if (maker == true) {
                this.trades[index].hit += Number(quantity)
                this.trades[index].hit = Math.round(this.trades[index].hit)
            } else {
                this.trades[index].lift += Number(quantity)
                this.trades[index].lift = Math.round(this.trades[index].lift)
            }
        }

        return [this.updateCupTrades(), { price: this.roundedPrice, vol: quantity, time: eventTime, side: maker }]
    }
}

module.exports = Currency