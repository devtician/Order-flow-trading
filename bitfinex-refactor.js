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
        this.counter = null;
        this.tempCup = [];
        this.tempBids = [];
        this.tempAsks = [];
        this.numsAfterDecimal = {
            cup: cupDecimals,
            trades: tradesDecimals
        }
        this.trades = [];
        this.index = null;
        this.roundedPrice = null;
        this.responseVol = null;
        this.symbol = symbol;
        this.channelId = {
            book: null,
            trades: null
        }
    }
    checkBestBid(price) {
        if (price >= this.best.bid.price) {
            let sortedBids = Array.from(this.bids).sort((a, b) => b.price - a.price)
            this.best.bid.price = sortedBids[0].price
            this.best.bid.volume = sortedBids[0].volume
        }
        return this
    }
    checkBestAsk(price) {
        if (price <= this.best.ask.price) {
            let sortedAsks = Array.from(this.asks).sort((a, b) => a.price - b.price)
            this.best.ask.price = sortedAsks[0].price
            this.best.ask.volume = sortedAsks[0].volume
        }
        return this
    }
    seedCup() {
        this.cup = []
        for (let i = this.upper; i >= this.lower; i -= 1/Math.pow(10, this.numsAfterDecimal.cup)) {
            this.cup.push({ vol: "", price: round(i,-this.numsAfterDecimal.cup), type: "", hit: null, lift: null })
        }
        return this.cup
    }
    updateCupOrderbook() {
        this.cup.forEach((item)=>{
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
    snapshotOrderbook(response) {
        response[1].forEach(snapshot => {
            if (snapshot[2] > 0) {
                this.bids.push({ price: snapshot[0], volume: snapshot[2] })
            } else {
                this.asks.push({ price: snapshot[0], volume: Math.abs(snapshot[2]) })
            }
        })

        let sortedBids = Array.from(this.bids).sort((a, b) => b.price - a.price)
        let sortedAsks = Array.from(this.asks).sort((a, b) => a.price - b.price)

        this.best = {
            bid: {
                price: sortedBids[0].price,
                volume: sortedBids[0].volume
            },
            ask: {
                price: sortedAsks[0].price,
                volume: sortedAsks[0].volume
            }
        } 
    }
    updateOrderbook(response) {
        if(response[1] != 'hb') {
            let price = response[1][0]
            let count = response[1][1]
            let volume = response[1][2]

            if (count == 0) {
                if (volume == 1) {
                    this.bids.splice(this.bids.map(o => o.price).indexOf(price), 1)
                    this.checkBestBid(price)
                } else {
                    this.asks.splice(this.asks.map(o => o.price).indexOf(price), 1)
                    this.checkBestAsk(price)
                }
            } else if (volume > 0) {
                if (!this.bids.map(o => o.price).includes(price)) {
                    this.bids.push({ price: price, volume: volume })
                } else {
                    this.bids[this.bids.map(o => o.price).indexOf(price)].volume = volume
                }
                this.checkBestBid(price)
            } else {
                if (!this.asks.map(o => o.price).includes(price)) {
                    this.asks.push({ price: price, volume: Math.abs(volume) })
                } else {
                    this.asks[this.asks.map(o => o.price).indexOf(price)].volume = Math.abs(volume)
                }
                this.checkBestAsk(price)
            }

            if (this.cup.length == 0 || this.best.ask.price > this.threshUpper || this.best.bid.price < this.threshLower) {
                this.mid = round(((this.best.bid.price + this.best.ask.price) / 2), -this.numsAfterDecimal.cup)
                this.upper = round((this.mid + (24 / Math.pow(10, this.numsAfterDecimal.cup))), -this.numsAfterDecimal.cup)
                this.lower = round((this.mid - (24 / Math.pow(10, this.numsAfterDecimal.cup))), -this.numsAfterDecimal.cup)
                this.threshUpper = round((this.mid + (14 / Math.pow(10, this.numsAfterDecimal.cup))), -this.numsAfterDecimal.cup)
                this.threshUpper = round((this.mid - (14 / Math.pow(10, this.numsAfterDecimal.cup))), -this.numsAfterDecimal.cup)
                this.seedCup()
            }

            this.tempCup = []
            this.counter = 0
            this.tempBids = []
            this.tempAsks = []

            for (let ask of this.asks) {
                this.tempAsks.push({ volume: Number(ask.volume), price: ceil(ask.price, -this.numsAfterDecimal.cup) })
            }

            for (let bid of this.bids) {
                this.tempBids.push({ volume: Number(bid.volume), price: floor(bid.price, -this.numsAfterDecimal.cup) })
            }

            for (let i = this.tempAsks.length - 1; i > 0; i--) {
                if (this.tempAsks[i].price - this.best.ask.price <= (14/Math.pow(10, this.numsAfterDecimal.cup))) {
                    if (this.tempCup.length == 0) {
                        this.tempCup.push({ vol: Math.round(this.tempAsks[i].volume), price: this.tempAsks[i].price, type: "ask", hit: null, lift: null })
                    } else {
                        let index = this.tempCup.map(o => o.price).indexOf(this.tempAsks[i].price)
                        if (index != -1) {
                            this.tempCup[index].vol += this.tempAsks[i].volume
                            this.tempCup[index].vol = Math.round(this.tempCup[index].vol)
                        } else {
                            this.tempCup.push({ vol: Math.round(this.tempAsks[i].volume), price: this.tempAsks[i].price, type: "ask", hit: null, lift: null })
                            this.counter++
                        }
                    }
                }
            }

            let difference = round(ceil(this.best.ask.price, -this.numsAfterDecimal.cup) - floor(this.best.bid.price, -this.numsAfterDecimal.cup), -this.numsAfterDecimal.cup)
            if (difference > (1 / Math.pow(10, this.numsAfterDecimal.cup))) {
                let numTimes = Math.round(difference / (1/Math.pow(10, this.numsAfterDecimal.cup)) - 1)
                for (let i = 1; i <= numTimes; i++) {
                    this.tempCup.push({ vol: "", price: round(ceil(this.best.ask.price, -this.numsAfterDecimal.cup) - i * (1/Math.pow(10, this.numsAfterDecimal.cup)), -this.numsAfterDecimal.cup), type: "mid", hit: null, lift: null })
                }
                this.counter++
            }

            for (let tempBid of this.tempBids) {
                if (this.best.bid.price - tempBid.price <= (14/Math.pow(10, this.numsAfterDecimal.cup))) {
                    // console.log(this.symbol, this.counter, this.tempCup)
                    if (this.tempCup[this.counter].type != 'bid') {
                        this.tempCup.push({ vol: Math.round(tempBid.volume), price: tempBid.price, type: "bid", hit: null, lift: null })
                        this.counter++
                    } else {
                        let index = this.tempCup.map(o => o.price).indexOf(tempBid.price)
                        if (index != -1) {
                            this.tempCup[index].vol += tempBid.volume
                            this.tempCup[index].vol = Math.round(this.tempCup[index].vol)
                        } else {
                            this.tempCup.push({ vol: Math.round(tempBid.volume), price: tempBid.price, type: "bid", hit: null, lift: null })
                            this.counter++
                        }
                    }
                }
            }

            return this.updateCupOrderbook()
        }
    }
    updateTrades(response) {
        if(response[1] == 'te') {
            this.responseVol = round(Number(response[2][2], -this.numsAfterDecimal.trades))

            if (this.responseVol > 0) {
                this.roundedPrice = ceil(response[2][3], -this.numsAfterDecimal.cup)
            } else {
                this.roundedPrice = floor(response[2][3], -this.numsAfterDecimal.cup)
            }

            let k = this.trades.map(o => o.price).indexOf(this.roundedPrice)

            if (k == -1) {
                if (this.responseVol > 0) {
                    this.trades.push({ price: this.roundedPrice, hit: null, lift: round(Math.abs(this.responseVol), -this.numsAfterDecimal.trades) })
                } else {
                    this.trades.push({ price: this.roundedPrice, hit: round(Math.abs(this.responseVol), -this.numsAfterDecimal.trades), lift: null })
                }
            } else {
                if (this.responseVol < 0) {
                    this.trades[k].hit += Math.abs(this.responseVol)
                    this.trades[k].hit = round(this.trades[k].hit, -this.numsAfterDecimal.trades)
                } else {
                    this.trades[k].lift += Math.abs(this.responseVol)
                    this.trades[k].lift = round(this.trades[k].lift, -this.numsAfterDecimal.trades)
                }
            }

            return [this.updateCupTrades(), { price: this.roundedPrice, vol: this.responseVol, time: response[2][1] }]
        }
    }
    subscribeOrderbook() {
        return JSON.stringify({
            event: 'subscribe',
            channel: 'book',
            symbol: this.symbol,
            len: "100"
        });
    }
    subscribeTrades() {
        return JSON.stringify({
            event: "subscribe",
            channel: "trades",
            symbol: this.symbol
        })
    }
}

module.exports = Currency