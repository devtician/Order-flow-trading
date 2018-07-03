let bidseos = []
let askseos = [] 
let bidsNeweos = []
let asksNeweos = []
let besteos = {}

var arrBitfinexeos = []
var btfxUppereos = null
var btfxLowereos = null
var btfxMideos = null
var btfxThreshUppereos = null
var btfxThreshLowereos = null

var arrbtfxeos = []
var arrTradesbtfxeos = []
var jeos = null
var roundedPricebtfxeos = null
var respVoleos = null
var indexeos = null
// var eosupdate = true


let bidsbtc = []
let asksbtc = [] 
let bidsNewbtc = []
let asksNewbtc = []
let bestbtc = {}

var arrBitfinexbtc = []
var btfxUpperbtc = null
var btfxLowerbtc = null
var btfxMidbtc = null
var btfxThreshUpperbtc = null
var btfxThreshLowerbtc = null

var arrbtfxbtc = []
var arrTradesbtfxbtc = []
var jbtc = null
var roundedPricebtfxbtc = null
var respVolbtc = null
var indexbtc = null
// var btcupdate = true

module.exports = function(){
    return {
        snapshotOrderbook: function(response, cur){
            if(cur == "eos"){
                response[1].forEach(function(snapshot){
                    if(snapshot[2] > 0){
                        let bid = {}
                        bid.price = snapshot[0]
                        bid.volume = snapshot[2] 
                        bidseos.push(bid)
                    } else {
                        let ask = {}
                        ask.price = snapshot[0]
                        ask.volume = Math.abs(snapshot[2])
                        askseos.push(ask)
                    }
                })
                besteos.bidPrice = Math.max(...bidseos.map(o => o.price))
                besteos.askPrice = Math.min(...askseos.map(o => o.price))
                let bidIndex = bidseos.map(o => o.price).indexOf(besteos.bidPrice)
                let askIndex = askseos.map(o => o.price).indexOf(besteos.askPrice)
                besteos.bidVolume = bidseos[bidIndex].volume
                besteos.askVolume = askseos[askIndex].volume
                // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
            } else if(cur == "btc"){
                response[1].forEach(function(snapshot){
                    if(snapshot[2] > 0){
                        let bid = {}
                        bid.price = snapshot[0]
                        bid.volume = snapshot[2] 
                        bidsbtc.push(bid)
                    } else {
                        let ask = {}
                        ask.price = snapshot[0]
                        ask.volume = Math.abs(snapshot[2])
                        asksbtc.push(ask)
                    }
                })
                bestbtc.bidPrice = Math.max(...bidsbtc.map(o => o.price))
                bestbtc.askPrice = Math.min(...asksbtc.map(o => o.price))
                let bidIndex = bidsbtc.map(o => o.price).indexOf(bestbtc.bidPrice)
                let askIndex = asksbtc.map(o => o.price).indexOf(bestbtc.askPrice)
                bestbtc.bidVolume = bidsbtc[bidIndex].volume
                bestbtc.askVolume = asksbtc[askIndex].volume
            }
        },

        updateOrderbook: function(response, cur){
            if(cur == "btc"){
                if(response[1] != "hb"){
                    let price = response[1][0]
                    let count = response[1][1]
                    let volume = response[1][2]
                    if(count == 0){
                        if(volume == 1){
                            let index = bidsbtc.map(o => o.price).indexOf(price)
                            bidsbtc.splice(index, 1)
                            bestBidbtc(price)
                        } else {
                            let index = asksbtc.map(o => o.price).indexOf(price)
                            asksbtc.splice(index, 1)
                            bestAskbtc(price)
                        }
                    } else if(volume > 0){
                        let index = bidsbtc.map(o => o.price).indexOf(price)
                        if(index == -1){
                            let bid = {}
                            bid.price = price
                            bid.volume = volume
                            bidsbtc.push(bid)
                        } else {
                            bidsbtc[index].volume = volume
                        }
                        bestBidbtc(price)
                    } else {
                        let index = asksbtc.map(o => o.price).indexOf(price)
                        if(index == -1){
                            let ask = {}
                            ask.price = price
                            ask.volume = Math.abs(volume)
                            asksbtc.push(ask)
                        } else {
                            asksbtc[index].volume = Math.abs(volume)
                        }
                        bestAskbtc(price)
                    }
                    
                    
                    if(arrBitfinexbtc.length == 0 || bestbtc.askPrice > btfxThreshUpperbtc || bestbtc.bidPrice < btfxThreshLowerbtc){
                        btfxMidbtc = Math.round((bestbtc.bidPrice + bestbtc.askPrice)/2)
                        btfxUpperbtc = Math.round(btfxMidbtc + 24)
                        btfxLowerbtc = Math.round(btfxMidbtc - 24)
                        btfxThreshUpperbtc = Math.round(btfxMidbtc + 14)
                        btfxThreshLowerbtc = Math.round(btfxMidbtc - 14)
                        seedArrFinalbtc()
                    }
                    
                    arrbtfxbtc = []
                    jbtc = 0
                    bidsNewbtc = []
                    asksNewbtc = []
                    
                    for( i = 0; i < asksbtc.length; i++){
                        asksNewbtc.push({volume: Number(asksbtc[i].volume), price: Math.round(asksbtc[i].price)})
                    }
                    
                    for( i = 0; i < bidsbtc.length; i++){
                        bidsNewbtc.push({volume: Number(bidsbtc[i].volume), price: Math.round(bidsbtc[i].price)})
                    }
                    
                    // console.log("asksNew\n", asksNew)
                    // console.log("bidsNew\n", bidsNew)
    
                    for(i = asksNewbtc.length - 1; i > 0; i--) {
                        if(asksNewbtc[i].price - bestbtc.askPrice <= 14){
                            if(arrbtfxbtc.length == 0){
                                arrbtfxbtc.push({vol: Math.round(asksNewbtc[i].volume), price: asksNewbtc[i].price, type: "ask", hit: null, lift: null})
                            } else {
                                let index = arrbtfxbtc.map(o => o.price).indexOf(asksNewbtc[i].price) 
                                if(index != -1){
                                    arrbtfxbtc[index].vol += asksNewbtc[i].volume
                                    arrbtfxbtc[index].vol = Math.round(arrbtfxbtc[index].vol) 
                                } else {
                                    arrbtfxbtc.push({vol: Math.round(asksNewbtc[i].volume), price: asksNewbtc[i].price, type: "ask", hit: null, lift: null})
                                    jbtc++
                                }
                            }
                        }
                    }
    
                    if (Math.round(bestbtc.askPrice - bestbtc.bidPrice) > 1){
                        var numTimes = Math.round((bestbtc.askPrice - bestbtc.bidPrice) - 1)
                        for(i = 1; i <= numTimes; i++){
                            arrbtfxbtc.push({vol: "", price: Math.round(bestbtc.askPrice - i), type: "mid", hit: null, lift: null})
                        }
                        jbtc++
                    }
    
                    for(i = 0; i < bidsNewbtc.length; i++ ){
                        if(bestbtc.bidPrice - bidsNewbtc[i].price <= 14){
                            if(arrbtfxbtc[jbtc].type != "bid"){
                                arrbtfxbtc.push({vol: Math.round(bidsNewbtc[i].volume), price: bidsNewbtc[i].price, type: "bid", hit: null, lift: null})
                                jbtc++
                            } else {
                                let ind = arrbtfxbtc.map(o => o.price).indexOf(bidsNewbtc[i].price)
                                if(ind != -1){
                                    arrbtfxbtc[ind].vol += bidsNewbtc[i].volume
                                    arrbtfxbtc[ind].vol = Math.round(arrbtfxbtc[ind].vol)
                                } else {
                                    arrbtfxbtc.push({vol: Math.round(bidsNewbtc[i].volume), price: bidsNewbtc[i].price, type: "bid", hit: null, lift: null})
                                    jbtc++
                                }
                            }
                        }
                    }
                    
                    // console.log("***********************")
                    // console.log(arrbtfx)
                    // console.log("***********************")
                    let arraybtc = updateArrBitfinexbtc("orderbook")
    
                    return arraybtc
                }
            } else if(cur == "eos"){
                if(response[1] != "hb"){
                    let price = response[1][0]
                    let count = response[1][1]
                    let volume = response[1][2]
                    if(count == 0){
                        if(volume == 1){
                            let index = bidseos.map(o => o.price).indexOf(price)
                            bidseos.splice(index, 1)
                            bestBid(price)
                        } else {
                            let index = askseos.map(o => o.price).indexOf(price)
                            askseos.splice(index, 1)
                            bestAsk(price)
                        }
                    } else if(volume > 0){
                        let index = bidseos.map(o => o.price).indexOf(price)
                        if(index == -1){
                            let bid = {}
                            bid.price = price
                            bid.volume = volume
                            bidseos.push(bid)
                        } else {
                            bidseos[index].volume = volume
                        }
                        bestBid(price)
                    } else {
                        let index = askseos.map(o => o.price).indexOf(price)
                        if(index == -1){
                            let ask = {}
                            ask.price = price
                            ask.volume = Math.abs(volume)
                            askseos.push(ask)
                        } else {
                            askseos[index].volume = Math.abs(volume)
                        }
                        bestAsk(price)
                    }
                    
                    
                    if(arrBitfinexeos.length == 0 || besteos.askPrice > btfxThreshUppereos || besteos.bidPrice < btfxThreshLowereos){
                        btfxMideos = precisionRound(((besteos.bidPrice + besteos.askPrice)/2), 2)
                        btfxUppereos = precisionRound((btfxMideos + 0.24), 2)
                        btfxLowereos = precisionRound((btfxMideos - 0.24), 2)
                        btfxThreshUppereos = precisionRound((btfxMideos + 0.14), 2)
                        btfxThreshLowereos = precisionRound((btfxMideos - 0.14), 2)
                        seedArrFinal()
                    }
                    
                    arrbtfxeos = []
                    jeos = 0
                    bidsNeweos = []
                    asksNeweos = []
                    
                    for( i = 0; i < askseos.length; i++){
                        asksNeweos.push({volume: Number(askseos[i].volume), price: precisionRound(askseos[i].price, 2)})
                    }
                    
                    for( i = 0; i < bidseos.length; i++){
                        bidsNeweos.push({volume: Number(bidseos[i].volume), price: precisionRound(bidseos[i].price, 2)})
                    }
                    
                    // console.log("asksNew\n", asksNew)
                    // console.log("bidsNew\n", bidsNew)
    
                    for(i = asksNeweos.length - 1; i > 0; i--) {
                        if(asksNeweos[i].price - besteos.askPrice <= 0.14){
                            if(arrbtfxeos.length == 0){
                                arrbtfxeos.push({vol: Math.round(asksNeweos[i].volume), price: asksNeweos[i].price, type: "ask", hit: null, lift: null})
                            } else {
                                let index = arrbtfxeos.map(o => o.price).indexOf(asksNeweos[i].price) 
                                if(index != -1){
                                    arrbtfxeos[index].vol += asksNeweos[i].volume
                                    arrbtfxeos[index].vol = Math.round(arrbtfxeos[index].vol) 
                                } else {
                                    arrbtfxeos.push({vol: Math.round(asksNeweos[i].volume), price: asksNeweos[i].price, type: "ask", hit: null, lift: null})
                                    jeos++
                                }
                            }
                        }
                    }
    
                    if (precisionRound(besteos.askPrice - besteos.bidPrice, 2) > 0.01){
                        var numTimes = Math.round((besteos.askPrice - besteos.bidPrice)/0.01 - 1)
                        for(i = 1; i <= numTimes; i++){
                            arrbtfxeos.push({vol: "", price: precisionRound((besteos.askPrice - i * 0.01), 2), type: "mid", hit: null, lift: null})
                        }
                        jeos++
                    }
    
                    for(i = 0; i < bidsNeweos.length; i++ ){
                        if(besteos.bidPrice - bidsNeweos[i].price <= 0.14){
                            if(arrbtfxeos[jeos].type != "bid"){
                                arrbtfxeos.push({vol: Math.round(bidsNeweos[i].volume), price: bidsNeweos[i].price, type: "bid", hit: null, lift: null})
                                jeos++
                            } else {
                                let ind = arrbtfxeos.map(o => o.price).indexOf(bidsNeweos[i].price)
                                if(ind != -1){
                                    arrbtfxeos[ind].vol += bidsNeweos[i].volume
                                    arrbtfxeos[ind].vol = Math.round(arrbtfxeos[ind].vol)
                                } else {
                                    arrbtfxeos.push({vol: Math.round(bidsNeweos[i].volume), price: bidsNeweos[i].price, type: "bid", hit: null, lift: null})
                                    jeos++
                                }
                            }
                        }
                    }
                    
                    // console.log("***********************")
                    // console.log(arrbtfx)
                    // console.log("***********************")
                    let array = updateArrBitfinex("orderbook")
    
                    return array
                }
            }
        },

        updateTradeseos: function(response){
            if(response[1] == "te"){
                roundedPricebtfxeos = precisionRound(response[2][3], 2)
                respVoleos = Number(Math.round(response[2][2]))


                let inde = arrTradesbtfxeos.map(o => o.price).indexOf(roundedPricebtfxeos)

                if(inde == -1){
                    if(respVoleos > 0){
                        arrTradesbtfxeos.push({price: roundedPricebtfxeos, hit: null, lift: Math.round(Math.abs(respVoleos))})
                    } else {
                        arrTradesbtfxeos.push({price: roundedPricebtfxeos, hit: Math.round(Math.abs(respVoleos)), lift: null})
                    }
                } else {
                    if(respVoleos < 0){
                        arrTradesbtfxeos[inde].hit += Math.abs(respVoleos)
                        arrTradesbtfxeos[inde].hit = Math.round(arrTradesbtfxeos[inde].hit)
                    } else {
                        arrTradesbtfxeos[inde].lift += Math.abs(respVoleos)
                        arrTradesbtfxeos[inde].lift = Math.round(arrTradesbtfxeos[inde].lift)
                    }
                }

                let trades = updateArrBitfinex("trades")

                return [trades, { price: roundedPricebtfxeos, vol: respVoleos, time: response[2][1] }]
            }
        },

        updateTradesbtc: function(response){
            if(response[1] == "te"){
                roundedPricebtfxbtc = Math.round(response[2][3])
                respVolbtc = precisionRound(Number(response[2][2]), 4)


                let inde = arrTradesbtfxbtc.map(o => o.price).indexOf(roundedPricebtfxbtc)

                if(inde == -1){
                    if(respVolbtc > 0){
                        arrTradesbtfxbtc.push({price: roundedPricebtfxbtc, hit: null, lift: precisionRound((Math.abs(respVolbtc)), 4)})
                    } else {
                        arrTradesbtfxbtc.push({price: roundedPricebtfxbtc, hit: precisionRound(Math.abs(respVolbtc), 4), lift: null})
                    }
                } else {
                    if(respVolbtc < 0){
                        arrTradesbtfxbtc[inde].hit += Math.abs(respVolbtc)
                        arrTradesbtfxbtc[inde].hit = precisionRound((arrTradesbtfxbtc[inde].hit), 4)
                    } else {
                        arrTradesbtfxbtc[inde].lift += Math.abs(respVolbtc)
                        arrTradesbtfxbtc[inde].lift = precisionRound((arrTradesbtfxbtc[inde].lift), 4)
                    }
                }

                let trades = updateArrBitfinexbtc("trades")

                return [trades, { price: roundedPricebtfxbtc, vol: respVolbtc, time: response[2][1] }]
            }
        },

        subscribeOrderbook: function(symbol){
            let msg = JSON.stringify({
                event: 'subscribe',
                channel: 'book',
                symbol: symbol,
                len: "100"
            });
            return msg
        },

        subscribeTrades: function(symbol){
            let msg = JSON.stringify({ 
                event: "subscribe", 
                channel: "trades", 
                symbol: symbol 
            })
            return msg
        }
    }
}()


function bestAsk(price){
    if(price <= besteos.askPrice){
        besteos.askPrice = Math.min(...askseos.map(o => o.price))
        let askIndex = askseos.map(o => o.price).indexOf(besteos.askPrice)
        besteos.askVolume = askseos[askIndex].volume
        // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
    }
}

function bestBid(price){
    if(price >= besteos.bidPrice){
        besteos.bidPrice = Math.max(...bidseos.map(o => o.price))
        let bidIndex = bidseos.map(o => o.price).indexOf(besteos.bidPrice)
        besteos.bidVolume = bidseos[bidIndex].volume
        // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
    }
}

function bestAskbtc(price){
    if(price <= bestbtc.askPrice){
        bestbtc.askPrice = Math.min(...asksbtc.map(o => o.price))
        let askIndex = asksbtc.map(o => o.price).indexOf(bestbtc.askPrice)
        bestbtc.askVolume = asksbtc[askIndex].volume
        // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
    }
}

function bestBidbtc(price){
    if(price >= bestbtc.bidPrice){
        bestbtc.bidPrice = Math.max(...bidsbtc.map(o => o.price))
        let bidIndex = bidsbtc.map(o => o.price).indexOf(bestbtc.bidPrice)
        bestbtc.bidVolume = bidsbtc[bidIndex].volume
        // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
    }
}

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

function seedArrFinal(){
    arrBitfinexeos = []
    for( i = btfxUppereos; i >= btfxLowereos; i -= 0.01 ){
        arrBitfinexeos.push({vol: "", price: precisionRound(i, 2), type: "", hit: null, lift: null})
    }
}

function seedArrFinalbtc(){
    arrBitfinexbtc = []
    for( i = btfxUpperbtc; i >= btfxLowerbtc; i -- ){
        arrBitfinexbtc.push({vol: "", price: Math.round(i), type: "", hit: null, lift: null})
    }
}

function updateArrBitfinex(updateType){
    if(updateType == "orderbook"){
        arrBitfinexeos.forEach(function(item){
            item.vol = ""
            item.type = ""
        })
    
        indexeos = null
        
        arrbtfxeos.forEach(function(item){
            indexeos = arrBitfinexeos.map(o => o.price).indexOf(item.price)
            if(indexeos != -1){
                arrBitfinexeos[indexeos].vol = item.vol
                arrBitfinexeos[indexeos].type = item.type
            }
        })
        
        for(i=1; i < arrBitfinexeos.length; i++){
            if(arrBitfinexeos[(i-1)].type == "ask" && arrBitfinexeos[(i+1)].type == "ask" && arrBitfinexeos[i].type == ""){
                arrBitfinexeos[i].type = "ask"
                arrBitfinexeos[i].vol = "0"
            } else if(arrBitfinexeos[(i+1)] == undefined) {
                break
            } else if(arrBitfinexeos[(i-1)].type == "bid" && arrBitfinexeos[(i+1)].type == "bid" && arrBitfinexeos[i].type == ""){
                arrBitfinexeos[i].type = "bid"
                arrBitfinexeos[i].vol = "0"
            }
        }
        for(i=0; i < arrBitfinexeos.length; i++){
            if(arrBitfinexeos[i].type == ""){
                arrBitfinexeos[i].type = "ask"
            } else {
                break
            }
        }

        indexeos = null
        arrTradesbtfxeos.forEach(function(item){
            indexeos = arrBitfinexeos.map(o => o.price).indexOf(item.price)
            if(indexeos != -1){
                arrBitfinexeos[indexeos].hit = item.hit
                arrBitfinexeos[indexeos].lift = item.lift
            }
        })

    } else if(updateType == "trades"){
        indexeos = null
        arrTradesbtfxeos.forEach(function(item){
            indexeos = arrBitfinexeos.map(o => o.price).indexOf(item.price)
            if(indexeos != -1){
                arrBitfinexeos[indexeos].hit = item.hit
                arrBitfinexeos[indexeos].lift = item.lift
            }
        })
    }

    return arrBitfinexeos

    // io.sockets.emit('pushbtfx', arrBitfinex)
}

function updateArrBitfinexbtc(updateType){
    if(updateType == "orderbook"){
        arrBitfinexbtc.forEach(function(item){
            item.vol = ""
            item.type = ""
        })
    
        indexbtc = null
        
        arrbtfxbtc.forEach(function(item){
            indexbtc = arrBitfinexbtc.map(o => o.price).indexOf(item.price)
            if(indexbtc != -1){
                arrBitfinexbtc[indexbtc].vol = item.vol
                arrBitfinexbtc[indexbtc].type = item.type
            }
        })
        
        for(i=1; i < arrBitfinexbtc.length; i++){
            if(arrBitfinexbtc[(i-1)].type == "ask" && arrBitfinexbtc[(i+1)].type == "ask" && arrBitfinexbtc[i].type == ""){
                arrBitfinexbtc[i].type = "ask"
                arrBitfinexbtc[i].vol = "0"
            } else if(arrBitfinexbtc[(i+1)] == undefined) {
                break
            } else if(arrBitfinexbtc[(i-1)].type == "bid" && arrBitfinexbtc[(i+1)].type == "bid" && arrBitfinexbtc[i].type == ""){
                arrBitfinexbtc[i].type = "bid"
                arrBitfinexbtc[i].vol = "0"
            }
        }
        for(i=0; i < arrBitfinexbtc.length; i++){
            if(arrBitfinexbtc[i].type == ""){
                arrBitfinexbtc[i].type = "ask"
            } else {
                break
            }
        }

        indexbtc = null
        arrTradesbtfxbtc.forEach(function(item){
            indexbtc = arrBitfinexbtc.map(o => o.price).indexOf(item.price)
            if(indexbtc != -1){
                arrBitfinexbtc[indexbtc].hit = item.hit
                arrBitfinexbtc[indexbtc].lift = item.lift
            }
        })

    } else if(updateType == "trades"){
        indexbtc = null
        arrTradesbtfxbtc.forEach(function(item){
            indexbtc = arrBitfinexbtc.map(o => o.price).indexOf(item.price)
            if(indexbtc != -1){
                arrBitfinexbtc[indexbtc].hit = item.hit
                arrBitfinexbtc[indexbtc].lift = item.lift
            }
        })
    }

    return arrBitfinexbtc

    // io.sockets.emit('pushbtfx', arrBitfinex)
}