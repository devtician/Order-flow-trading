var express = require('express')
var path = require('path')
var app = express()
var server = require('http').Server(app);
var io = require('socket.io')(server, { 'pingTimeout': 7000 , 'pingInterval': 1000});
var binance = require("node-binance-api");
var adjust = require("./decimalAdjust.js")


app.set('view engine', "ejs")
app.use(express.static(__dirname, +"/build/public"))
app.set('views', path.join(__dirname, '/src/views'));

app.get("/", function(req, res){
    res.render("index")
})


// BITFINEX Initialization
var btfx = require("./btfx.js")
const WebSocket = require("ws")
const wss = new WebSocket("wss://api.bitfinex.com/ws/2")

let chanId_EOSUSD_book
let chanId_EOSUSD_trades
let chanId_BTCUSD_book
let chanId_BTCUSD_trades

wss.onopen = () => init()

function init(){
    wss.send(btfx.subscribeOrderbook("EOSUSD"))
    wss.send(btfx.subscribeOrderbook("BTCUSD"))
    wss.send(btfx.subscribeTrades("EOSUSD"))
    wss.send(btfx.subscribeTrades("BTCUSD"))
    // console.log("subscribed orderbook")
}

// BINANCE Variables
var arrBinanceEos = []
var bnbUpperEos = null
var bnbLowerEos = null
var bnbMidEos = null
var bnbThreshUpperEos = null
var bnbThreshLowerEos = null

var arrEos = []
var arrTradesEos = []
var kEos = null
var roundedPriceEos = null
let indexBinanceEos = null

var arrBinanceBtc = []
var bnbUpperBtc = null
var bnbLowerBtc = null
var bnbMidBtc = null
var bnbThreshUpperBtc = null
var bnbThreshLowerBtc = null

var arrBtc = []
var arrTradesBtc = []
var kBtc = null
var roundedPriceBtc = null
let indexBinanceBtc = null



io.on('connection', function (socket) {
    binance.websockets.depthCache(['EOSUSDT'], (symbol, depth) => {
        let bids = binance.sortBids(depth.bids);
        let asks = binance.sortAsks(depth.asks);

        let bestBid = Number(binance.first(bids));
        let bestAsk = Number(binance.first(asks));

        let bidPrices = Object.keys(bids)
        let askPrices = Object.keys(asks)
        let bidVolumes = Object.values(bids)
        let askVolumes = Object.values(asks)

        if(arrBinanceEos.length == 0 || bestAsk > bnbThreshUpperEos || bestBid < bnbThreshLowerEos){
            bnbMidEos = precisionRound(((bestBid + bestAsk)/2), 2)
            bnbUpperEos = precisionRound((bnbMidEos + 0.24), 2)
            bnbLowerEos = precisionRound((bnbMidEos - 0.24), 2)
            bnbThreshUpperEos = precisionRound((bnbMidEos + 0.14), 2)
            bnbThreshLowerEos = precisionRound((bnbMidEos - 0.14), 2)
            seedArrFinalEos()
            console.log("after seed")
        }

        arrEos = []
        kEos = 0

        for (i = 0; i < askPrices.length; i++) {
            askPrices[i] = adjust.ceil(askPrices[i], -2)
        }

        for (i = 0; i < bidPrices.length; i++) {
            bidPrices[i] = adjust.floor(bidPrices[i], -2)
        }

        for (i = askPrices.length - 1; i > 0; i--) {
            if (askPrices[i] - askPrices[0] <= 0.14) {
                if (arrEos.length == 0) {
                    arrEos.push({ vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask", hit: null, lift: null})
                } else {
                    if (askPrices[i] == askPrices[i + 1]) {
                        arrEos[kEos].vol += askVolumes[i]
                        arrEos[kEos].vol = Math.round(arrEos[kEos].vol)
                    } else {
                        arrEos.push({ vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask", hit: null, lift: null})
                        kEos++
                    }
                }
            }
        }

        if (precisionRound(arrEos[kEos].price - bidPrices[0], 2) > 0.01) {
            var numTimes = Math.round((arrEos[kEos].price - bidPrices[0])/0.01 - 1)
            for (i = 1; i <= numTimes ; i++ ){
                arrEos.push({ vol: "", price: precisionRound((arrEos[kEos].price - i * 0.01), 2), type: "mid", hit: null, lift: null })
                kEos++
            }
        }

        for (i = 0; i < bidPrices.length; i++) {
            if (bidPrices[0] - bidPrices[i] <= 0.14) {
                if (arrEos[kEos].type != "bid") {
                    arrEos.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid", hit: null, lift: null})
                    kEos++
                } else {
                    if (bidPrices[i] == bidPrices[i - 1]) {
                        arrEos[kEos].vol += bidVolumes[i]
                        arrEos[kEos].vol = Math.round(arrEos[kEos].vol)
                    } else {
                        arrEos.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid", hit: null, lift: null})
                        kEos++
                    }
                }
            }
        }

        updateArrFinalEos(socket, "orderbook", adjust.floor(bestBid, -2), adjust.ceil(bestAsk, -2))
    })

    binance.websockets.trades(['EOSUSDT'], (trades) => {
        let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId, M:M} = trades;
        // console.log(trades)
        // console.log(symbol+" trade update. price: "+price+", quantity: "+quantity+", m: "+maker+", M" + M);
        if(maker == true){
            roundedPriceEos = adjust.floor(Number(price), -2)
        } else {
            roundedPriceEos = adjust.ceil(Number(price), -2)
        }
        // console.log(roundedPriceBtc)
        let index = arrTradesEos.map(o => o.price).indexOf(roundedPriceEos)

        io.sockets.emit("binance-eos-trades", {price: roundedPriceEos, vol: quantity, time: eventTime, side: maker})

        if(index == -1){
            if(maker == true){
                arrTradesEos.push({price: roundedPriceEos, hit: Math.round(Number(quantity)), lift: null})
            } else {
                arrTradesEos.push({price: roundedPriceEos, hit: null, lift: Math.round(Number(quantity))})
            }
        } else {
            if(maker == true){
                arrTradesEos[index].hit += Number(quantity)  
                arrTradesEos[index].hit = Math.round(arrTradesEos[index].hit)
                // console.log("the updated hit: ", arrTrades[index].hit)  
            } else {
                arrTradesEos[index].lift += Number(quantity)  
                arrTradesEos[index].lift = Math.round(arrTradesEos[index].lift)
                // console.log("the updated lift: ", arrTrades[index].lift)    
            }
        }
        
        updateArrFinalEos(socket, "trades")
    })
    
    binance.websockets.depthCache(['BTCUSDT'], (symbol, depth) => {
        let bids = binance.sortBids(depth.bids);
        let asks = binance.sortAsks(depth.asks);

        let bestBid = Math.round(Number(binance.first(bids)));
        let bestAsk = Math.round(Number(binance.first(asks)));

        let bidPrices = Object.keys(bids)
        let askPrices = Object.keys(asks)
        let bidVolumes = Object.values(bids)
        let askVolumes = Object.values(asks)

        if(arrBinanceBtc.length == 0 || bestAsk > bnbThreshUpperBtc || bestBid < bnbThreshLowerBtc){
            bnbMidBtc = Math.round((bestBid + bestAsk)/2)
            bnbUpperBtc = Math.round((bnbMidBtc + 24))
            bnbLowerBtc = Math.round((bnbMidBtc - 24))
            bnbThreshUpperBtc = Math.round((bnbMidBtc + 13))
            bnbThreshLowerBtc = Math.round((bnbMidBtc - 13))
            seedArrFinalBtc()
            console.log("after seed")
        }

        arrBtc = []
        kBtc = 0

        for (i = 0; i < askPrices.length; i++) {
            askPrices[i] = Math.ceil(askPrices[i])
        }

        for (i = 0; i < bidPrices.length; i++) {
            bidPrices[i] = Math.floor(bidPrices[i])
        }

        for (i = askPrices.length - 1; i > 0; i--) {
            if (askPrices[i] - askPrices[0] <= 14) {
                if (arrBtc.length == 0) {
                    arrBtc.push({ vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask", hit: null, lift: null})
                } else {
                    if (askPrices[i] == askPrices[i + 1]) {
                        arrBtc[kBtc].vol += askVolumes[i]
                        arrBtc[kBtc].vol = Math.round(arrBtc[kBtc].vol)
                    } else {
                        arrBtc.push({ vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask", hit: null, lift: null})
                        kBtc++
                    }
                }
            }
        }

        if (Math.round(arrBtc[kBtc].price - bidPrices[0]) > 1) {
            var numTimes = Math.round((arrBtc[kBtc].price - bidPrices[0]) - 1)
            for (i = 1; i <= numTimes ; i++ ){
                arrBtc.push({ vol: "", price: Math.round((arrBtc[kBtc].price - i)), type: "mid", hit: null, lift: null })
                kBtc++
            }
        }

        for (i = 0; i < bidPrices.length; i++) {
            if (bidPrices[0] - bidPrices[i] <= 14) {
                if (arrBtc[kBtc].type != "bid") {
                    arrBtc.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid", hit: null, lift: null})
                    kBtc++
                } else {
                    if (bidPrices[i] == bidPrices[i - 1]) {
                        arrBtc[kBtc].vol += bidVolumes[i]
                        arrBtc[kBtc].vol = Math.round(arrBtc[kBtc].vol)
                    } else {
                        arrBtc.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid", hit: null, lift: null})
                        kBtc++
                    }
                }
            }
        }

        updateArrFinalBtc(socket, "orderbook", adjust.floor(bestBid), adjust.ceil(bestAsk))
    })

    binance.websockets.trades(['BTCUSDT'], (trades) => {
        let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId, M:M} = trades;
        // console.log(trades)
        // console.log(symbol+" trade update. price: "+price+", quantity: "+quantity+", m: "+maker+", M" + M);

        if(maker == true){
            roundedPriceBtc = Math.floor(Number(price))
        } else {
            roundedPriceBtc = Math.ceil(Number(price))
        }
        // console.log(roundedPriceBtc)
        let index = arrTradesBtc.map(o => o.price).indexOf(roundedPriceBtc)

        io.sockets.emit("binance-btc-trades", {price: roundedPriceBtc, vol: quantity, time: eventTime, side: maker})

        if(index == -1){
            if(maker == true){
                arrTradesBtc.push({price: roundedPriceBtc, hit: precisionRound(Number(quantity), 4), lift: null})
            } else {
                arrTradesBtc.push({price: roundedPriceBtc, hit: null, lift: precisionRound(Number(quantity), 4)})
            }
        } else {
            if(maker == true){
                arrTradesBtc[index].hit += Number(quantity)  
                arrTradesBtc[index].hit = precisionRound(arrTradesBtc[index].hit, 4)
                // console.log("the updated hit: ", arrTrades[index].hit)  
            } else {
                arrTradesBtc[index].lift += Number(quantity)  
                arrTradesBtc[index].lift = precisionRound(arrTradesBtc[index].lift, 4)
                // console.log("the updated lift: ", arrTrades[index].lift)    
            }
        }
        
        updateArrFinalBtc(socket, "trades")
    })

    socket.on('response', function (data) {
        // console.log(data);
    });
});

wss.onmessage = (message) => {
    var response = JSON.parse(message.data)
    // console.log("this is the response: ", response)

    if(Array.isArray(response)){
        switch(response[0]){
            case chanId_EOSUSD_book:
                if(response[1].length > 3 ){
                    // console.log("sending to snapshot")
                    btfx.snapshotOrderbook(response, "eos")
                } else {
                    // console.log("sending to updateorderbook")
                    let arrayeos = btfx.updateOrderbook(response, "eos")
                    if(arrayeos != null){
                        io.sockets.emit("pushbtfx-eos", arrayeos)
                    }
                    // console.log("sent emit message")
                }
                break
            case chanId_EOSUSD_trades:
                let tradeseos = btfx.updateTradeseos(response)
                if(tradeseos != null){
                    io.sockets.emit("pushbtfx-eos", tradeseos[0])
                    io.sockets.emit("bitfinex-eos-trades", tradeseos[1])
                }
                break    
            case chanId_BTCUSD_book:
                if(response[1].length > 3 ){
                    // console.log("sending to snapshot")
                    btfx.snapshotOrderbook(response, "btc")
                } else {
                    // console.log("sending to updateorderbook")
                    let arraybtc = btfx.updateOrderbook(response, "btc")
                    if(arraybtc != null){
                        io.sockets.emit("pushbtfx-btc", arraybtc)
                    }
                    // console.log("sent emit message")
                }
                break
            case chanId_BTCUSD_trades:
                let tradesbtc = btfx.updateTradesbtc(response)
                if(tradesbtc != null){
                    io.sockets.emit("pushbtfx-btc", tradesbtc[0])
                    io.sockets.emit("bitfinex-btc-trades", tradesbtc[1])
                }
                break 
            default:
                console.log(response)
        }
    } else {
        var event = response.event
        var channel = response.channel
        var pair = response.pair
        switch(event){
            case "subscribed":
                if(channel == "book" && pair == "EOSUSD"){
                    chanId_EOSUSD_book = response.chanId
                    console.log("EOSUSD Book channel ID updated")
                } else if(channel == "trades" && pair == "EOSUSD"){
                    chanId_EOSUSD_trades = response.chanId
                    console.log("EOSUSD Trades channel ID updated")
                } else if(channel == "book" && pair == "BTCUSD"){
                    chanId_BTCUSD_book = response.chanId
                    console.log("BTCUSD Book channel ID updated")
                } else if(channel == "trades" && pair == "BTCUSD"){
                    chanId_BTCUSD_trades = response.chanId
                    console.log("BTCUSD Trades channel ID updated")
                }
                break
            case "info":
                console.log(response)
                break
            default:
                console.log(response)
        }
    }
}

server.listen(3000, function(){
    console.log("Server running on port 3000")
})

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

function seedArrFinalEos(){
    arrBinanceEos = []
    for( i = bnbUpperEos; i >= bnbLowerEos; i -= 0.01 ){
        arrBinanceEos.push({vol: "", price: precisionRound(i, 2), type: "", hit: null, lift: null})
    }
}
function seedArrFinalBtc(){
    arrBinanceBtc = []
    for( i = bnbUpperBtc; i >= bnbLowerBtc; i -- ){
        arrBinanceBtc.push({vol: "", price: Math.round(i), type: "", hit: null, lift: null})
    }
}

function updateArrFinalEos(socket, updateType, bestBid, bestAsk){
    if(updateType == "orderbook"){
        arrBinanceEos.forEach(function(item){
            item.vol = ""
            item.type = ""
        })
    
        indexBinanceEos = null
        
        arrEos.forEach(function(item){
            indexBinanceEos = arrBinanceEos.map(o => o.price).indexOf(item.price)
            if (indexBinanceEos != -1){
                arrBinanceEos[indexBinanceEos].vol = item.vol
                arrBinanceEos[indexBinanceEos].type = item.type
            }
        })
        
        for(i = 0; i < arrBinanceEos.length; i++){
            if(arrBinanceEos[i].price >= bestAsk){
                arrBinanceEos[i].type = "ask"
            } else if(arrBinanceEos[i].price < bestAsk && arrBinanceEos[i].price > bestBid){
                arrBinanceEos[i].type = "mid"
            } else {
                arrBinanceEos[i].type = "bid"
            }
        }

        // for(i=1; i < arrBinanceEos.length; i++){
        //     if(arrBinanceEos[(i-1)].type == "ask" && arrBinanceEos[(i+1)].type == "ask" && arrBinanceEos[i].type == ""){
        //         arrBinanceEos[i].type = "ask"
        //         arrBinanceEos[i].vol = "0"
        //     } else if(arrBinanceEos[(i+1)] == undefined) {
        //         break
        //     } else if(arrBinanceEos[(i-1)].type == "bid" && arrBinanceEos[(i+1)].type == "bid" && arrBinanceEos[i].type == ""){
        //         arrBinanceEos[i].type = "bid"
        //         arrBinanceEos[i].vol = "0"
        //     }
        // }
        // for(i=0; i < arrBinanceEos.length; i++){
        //     if(arrBinanceEos[i].type == ""){
        //         arrBinanceEos[i].type = "ask"
        //     } else {
        //         break
        //     }
        // }

        indexBinanceEos = null
        arrTradesEos.forEach(function(item){
            indexBinanceEos = arrBinanceEos.map(o => o.price).indexOf(item.price)
            if (indexBinanceEos != -1){
            arrBinanceEos[indexBinanceEos].hit = item.hit
            arrBinanceEos[indexBinanceEos].lift = item.lift
            }
        })

    } else if(updateType == "trades"){
        indexBinanceEos = null
        arrTradesEos.forEach(function(item){
            indexBinanceEos = arrBinanceEos.map(o => o.price).indexOf(item.price)
            if (indexBinanceEos != -1){
            arrBinanceEos[indexBinanceEos].hit = item.hit
            arrBinanceEos[indexBinanceEos].lift = item.lift
            }
        })
    }

    io.sockets.emit('pushBinance-eos', arrBinanceEos)
}

function updateArrFinalBtc(socket, updateType, bestBid, bestAsk){
    if(updateType == "orderbook"){
        arrBinanceBtc.forEach(function(item){
            item.vol = ""
            item.type = ""
        })
    
        indexBinanceBtc = null
        
        arrBtc.forEach(function(item){
            indexBinanceBtc = arrBinanceBtc.map(o => o.price).indexOf(item.price)
            if (indexBinanceBtc != -1){
                arrBinanceBtc[indexBinanceBtc].vol = item.vol
                arrBinanceBtc[indexBinanceBtc].type = item.type
            }
        })
        
        for(i = 0; i < arrBinanceBtc.length; i++){
            if(arrBinanceBtc[i].price >= bestAsk){
                arrBinanceBtc[i].type = "ask"
            } else if(arrBinanceBtc[i].price < bestAsk && arrBinanceBtc[i].price > bestBid){
                arrBinanceBtc[i].type = "mid"
            } else {
                arrBinanceBtc[i].type = "bid"
            }
        }


        // for(i=1; i < arrBinanceBtc.length; i++){
        //     if(arrBinanceBtc[(i-1)].type == "ask" && arrBinanceBtc[(i+1)].type == "ask" && arrBinanceBtc[i].type == ""){
        //         arrBinanceBtc[i].type = "ask"
        //         arrBinanceBtc[i].vol = "0"
        //     } else if(arrBinanceBtc[(i+1)] == undefined) {
        //         break
        //     } else if(arrBinanceBtc[(i-1)].type == "bid" && arrBinanceBtc[(i+1)].type == "bid" && arrBinanceBtc[i].type == ""){
        //         arrBinanceBtc[i].type = "bid"
        //         arrBinanceBtc[i].vol = "0"
        //     }
        // }
        // for(i=0; i < arrBinanceBtc.length; i++){
        //     if(arrBinanceBtc[i].type == ""){
        //         arrBinanceBtc[i].type = "ask"
        //     } else {
        //         break
        //     }
        // }

        indexBinanceBtc = null
        arrTradesBtc.forEach(function(item){
            indexBinanceBtc = arrBinanceBtc.map(o => o.price).indexOf(item.price)
            if (indexBinanceBtc != -1){
                arrBinanceBtc[indexBinanceBtc].hit = item.hit
                arrBinanceBtc[indexBinanceBtc].lift = item.lift
            }
        })

    } else if(updateType == "trades"){
        indexBinanceBtc = null
        arrTradesBtc.forEach(function(item){
            indexBinanceBtc = arrBinanceBtc.map(o => o.price).indexOf(item.price)
            if (indexBinanceBtc != -1){
                arrBinanceBtc[indexBinanceBtc].hit = item.hit
                arrBinanceBtc[indexBinanceBtc].lift = item.lift
            }
        })
    }

    io.sockets.emit('pushBinance-btc', arrBinanceBtc)
}
