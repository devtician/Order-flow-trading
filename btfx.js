let bids = []
let asks = [] 
let bidsNew = []
let asksNew = []
let best = {}

var arrBitfinex = []
var btfxUpper = null
var btfxLower = null
var btfxMid = null
var btfxThreshUpper = null
var btfxThreshLower = null

var arrbtfx = []
var arrTradesbtfx = []
var j = null
var roundedPricebtfx = null
var respVol = null
var index = null

module.exports = function(){
    return {
        best,

        snapshotOrderbook: function(response){
            response[1].forEach(function(snapshot){
                if(snapshot[2] > 0){
                    let bid = {}
                    bid.price = snapshot[0]
                    bid.volume = snapshot[2] 
                    bids.push(bid)
                } else {
                    let ask = {}
                    ask.price = snapshot[0]
                    ask.volume = Math.abs(snapshot[2])
                    asks.push(ask)
                }
            })
            best.bidPrice = Math.max(...bids.map(o => o.price))
            best.askPrice = Math.min(...asks.map(o => o.price))
            let bidIndex = bids.map(o => o.price).indexOf(best.bidPrice)
            let askIndex = asks.map(o => o.price).indexOf(best.askPrice)
            best.bidVolume = bids[bidIndex].volume
            best.askVolume = asks[askIndex].volume
            // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
        },

        updateOrderbook: function(response){
            if(response[1] != "hb"){
                let price = response[1][0]
                let count = response[1][1]
                let volume = response[1][2]
                if(count == 0){
                    if(volume == 1){
                        let index = bids.map(o => o.price).indexOf(price)
                        bids.splice(index, 1)
                        bestBid(price)
                    } else {
                        let index = asks.map(o => o.price).indexOf(price)
                        asks.splice(index, 1)
                        bestAsk(price)
                    }
                } else if(volume > 0){
                    let index = bids.map(o => o.price).indexOf(price)
                    if(index == -1){
                        let bid = {}
                        bid.price = price
                        bid.volume = volume
                        bids.push(bid)
                    } else {
                        bids[index].volume = volume
                    }
                    bestBid(price)
                } else {
                    let index = asks.map(o => o.price).indexOf(price)
                    if(index == -1){
                        let ask = {}
                        ask.price = price
                        ask.volume = Math.abs(volume)
                        asks.push(ask)
                    } else {
                        asks[index].volume = Math.abs(volume)
                    }
                    bestAsk(price)
                }
                
                
                if(arrBitfinex.length == 0 || best.askPrice > btfxThreshUpper || best.bidPrice < btfxThreshLower){
                    btfxMid = precisionRound(((best.bidPrice + best.askPrice)/2), 2)
                    btfxUpper = precisionRound((btfxMid + 0.24), 2)
                    btfxLower = precisionRound((btfxMid - 0.24), 2)
                    btfxThreshUpper = precisionRound((btfxMid + 0.14), 2)
                    btfxThreshLower = precisionRound((btfxMid - 0.14), 2)
                    seedArrFinal()
                }
                
                arrbtfx = []
                j = 0
                bidsNew = []
                asksNew = []
                
                for( i = 0; i < asks.length; i++){
                    asksNew.push({volume: Number(asks[i].volume), price: precisionRound(asks[i].price, 2)})
                }
                
                for( i = 0; i < bids.length; i++){
                    bidsNew.push({volume: Number(bids[i].volume), price: precisionRound(bids[i].price, 2)})
                }
                
                // console.log("asksNew\n", asksNew)
                // console.log("bidsNew\n", bidsNew)

                for(i = asksNew.length - 1; i > 0; i--) {
                    if(asksNew[i].price - best.askPrice <= 0.14){
                        if(arrbtfx.length == 0){
                            arrbtfx.push({vol: Math.round(asksNew[i].volume), price: asksNew[i].price, type: "ask", hit: null, lift: null})
                        } else {
                            let index = arrbtfx.map(o => o.price).indexOf(asksNew[i].price) 
                            if(index != -1){
                                arrbtfx[index].vol += asksNew[i].volume
                                arrbtfx[index].vol = Math.round(arrbtfx[index].vol) 
                            } else {
                                arrbtfx.push({vol: Math.round(asksNew[i].volume), price: asksNew[i].price, type: "ask", hit: null, lift: null})
                                j++
                            }
                        }
                    }
                }

                if (precisionRound(best.askPrice - best.bidPrice, 2) > 0.01){
                    var numTimes = Math.round((best.askPrice - best.bidPrice)/0.01 - 1)
                    for(i = 1; i <= numTimes; i++){
                        arrbtfx.push({vol: "", price: precisionRound((best.askPrice - i * 0.01), 2), type: "mid", hit: null, lift: null})
                    }
                    j++
                }

                for(i = 0; i < bidsNew.length; i++ ){
                    if(best.bidPrice - bidsNew[i].price <= 0.14){
                        if(arrbtfx[j].type != "bid"){
                            arrbtfx.push({vol: Math.round(bidsNew[i].volume), price: bidsNew[i].price, type: "bid", hit: null, lift: null})
                            j++
                        } else {
                            let ind = arrbtfx.map(o => o.price).indexOf(bidsNew[i].price)
                            if(ind != -1){
                                arrbtfx[ind].vol += bidsNew[i].volume
                                arrbtfx[ind].vol = Math.round(arrbtfx[ind].vol)
                            } else {
                                arrbtfx.push({vol: Math.round(bidsNew[i].volume), price: bidsNew[i].price, type: "bid", hit: null, lift: null})
                                j++
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
        },

        updateTrades: function(response){
            if(response[1] == "te"){
                roundedPricebtfx = precisionRound(response[2][3], 2)
                respVol = Number(Math.round(response[2][2]))

                io.sockets.emit("bitfinex-trades", {price: roundedPricebtfx, vol: respVol, time: response[2][1]})

                let inde = arrTradesbtfx.map(o => o.price).indexOf(roundedPricebtfx)

                if(inde == -1){
                    if(respVol > 0){
                        arrTradesbtfx.push({price: roundedPricebtfx, hit: null, lift: Math.round(Math.abs(respVol))})
                    } else {
                        arrTradesbtfx.push({price: roundedPricebtfx, hit: Math.round(Math.abs(respVol)), lift: null})
                    }
                } else {
                    if(respVol < 0){
                        arrTradesbtfx[inde].hit += Math.abs(respVol)
                        arrTradesbtfx[inde].hit = Math.round(arrTradesbtfx[inde].hit)
                    } else {
                        arrTradesbtfx[inde].lift += Math.abs(respVol)
                        arrTradesbtfx[inde].lift = Math.round(arrTradesbtfx[inde].lift)
                    }
                }

                let trades = updateArrBitfinex("trades")

                return trades
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
    if(price <= best.askPrice){
        best.askPrice = Math.min(...asks.map(o => o.price))
        let askIndex = asks.map(o => o.price).indexOf(best.askPrice)
        best.askVolume = asks[askIndex].volume
        // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
    }
}

function bestBid(price){
    if(price >= best.bidPrice){
        best.bidPrice = Math.max(...bids.map(o => o.price))
        let bidIndex = bids.map(o => o.price).indexOf(best.bidPrice)
        best.bidVolume = bids[bidIndex].volume
        // console.log(best.bidVolume, best.bidPrice, best.askPrice, best.askVolume)
    }
}

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

function seedArrFinal(){
    arrBitfinex = []
    for( i = btfxUpper; i >= btfxLower; i -= 0.01 ){
        arrBitfinex.push({vol: "", price: precisionRound(i, 2), type: "", hit: null, lift: null})
    }
}

function updateArrBitfinex(updateType){
    if(updateType == "orderbook"){
        arrBitfinex.forEach(function(item){
            item.vol = ""
            item.type = ""
        })
    
        index = null
        
        arrbtfx.forEach(function(item){
            index = arrBitfinex.map(o => o.price).indexOf(item.price)
            arrBitfinex[index].vol = item.vol
            arrBitfinex[index].type = item.type
        })
        
        for(i=1; i < arrBitfinex.length; i++){
            if(arrBitfinex[(i-1)].type == "ask" && arrBitfinex[(i+1)].type == "ask" && arrBitfinex[i].type == ""){
                arrBitfinex[i].type = "ask"
                arrBitfinex[i].vol = "0"
            } else if(arrBitfinex[(i-1)].type == "bid" && arrBitfinex[(i+1)].type == "bid" && arrBitfinex[i].type == ""){
                arrBitfinex[i].type = "bid"
                arrBitfinex[i].vol = "0"
            }
        }
        for(i=0; i < arrBitfinex.length; i++){
            if(arrBitfinex[i].type == ""){
                arrBitfinex[i].type = "ask"
            } else {
                break
            }
        }

        index = null
        arrTradesbtfx.forEach(function(item){
            index = arrBitfinex.map(o => o.price).indexOf(item.price)
            arrBitfinex[index].hit = item.hit
            arrBitfinex[index].lift = item.lift
        })

    } else if(updateType == "trades"){
        index = null
        arrTradesbtfx.forEach(function(item){
            index = arrBitfinex.map(o => o.price).indexOf(item.price)
            arrBitfinex[index].hit = item.hit
            arrBitfinex[index].lift = item.lift
        })
    }

    return arrBitfinex

    // io.sockets.emit('pushbtfx', arrBitfinex)
}