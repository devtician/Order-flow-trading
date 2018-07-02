var express = require('express')
var path = require('path')
var app = express()
var server = require('http').Server(app);
var io = require('socket.io')(server, { 'pingTimeout': 7000 , 'pingInterval': 1000});
var binance = require("node-binance-api");

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

let chanId_EOSUSD
let chanId_trades

wss.onopen = () => init()

function init(){
    wss.send(btfx.subscribeOrderbook("EOSUSD"))
    wss.send(btfx.subscribeTrades("EOSUSD"))
    // console.log("subscribed orderbook")
}

// BINANCE Variables
var arrBinance = []
var bnbUpper = null
var bnbLower = null
var bnbMid = null
var bnbThreshUpper = null
var bnbThreshLower = null

var arr = []
var arrTrades = []
var k = null
var roundedPrice = null
let indexBinance = null



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

        if(arrBinance.length == 0 || bestAsk > bnbThreshUpper || bestBid < bnbThreshLower){
            bnbMid = precisionRound(((bestBid + bestAsk)/2), 2)
            bnbUpper = precisionRound((bnbMid + 0.24), 2)
            bnbLower = precisionRound((bnbMid - 0.24), 2)
            bnbThreshUpper = precisionRound((bnbMid + 0.14), 2)
            bnbThreshLower = precisionRound((bnbMid - 0.14), 2)
            seedArrFinal()
            console.log("after seed")
        }

        arr = []
        k = 0

        for (i = 0; i < askPrices.length; i++) {
            askPrices[i] = precisionRound(askPrices[i], 2)
        }

        for (i = 0; i < bidPrices.length; i++) {
            bidPrices[i] = precisionRound(bidPrices[i], 2)
        }

        for (i = askPrices.length - 1; i > 0; i--) {
            if (askPrices[i] - askPrices[0] <= 0.14) {
                if (arr.length == 0) {
                    arr.push({ vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask", hit: null, lift: null})
                } else {
                    if (askPrices[i] == askPrices[i + 1]) {
                        arr[k].vol += askVolumes[i]
                        arr[k].vol = Math.round(arr[k].vol)
                    } else {
                        arr.push({ vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask", hit: null, lift: null})
                        k++
                    }
                }
            }
        }

        if (precisionRound(arr[k].price - bidPrices[0], 2) > 0.01) {
            var numTimes = Math.round((arr[k].price - bidPrices[0])/0.01 - 1)
            for (i = 1; i <= numTimes ; i++ ){
                arr.push({ vol: "", price: precisionRound((arr[k].price - i * 0.01), 2), type: "mid", hit: null, lift: null })
                k++
            }
        }

        for (i = 0; i < bidPrices.length; i++) {
            if (bidPrices[0] - bidPrices[i] <= 0.14) {
                if (arr[k].type != "bid") {
                    arr.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid", hit: null, lift: null})
                    k++
                } else {
                    if (bidPrices[i] == bidPrices[i - 1]) {
                        arr[k].vol += bidVolumes[i]
                        arr[k].vol = Math.round(arr[k].vol)
                    } else {
                        arr.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid", hit: null, lift: null})
                        k++
                    }
                }
            }
        }

        updateArrFinal(socket, "orderbook")
    })

    binance.websockets.trades(['EOSUSDT'], (trades) => {
        let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId, M:M} = trades;
        // console.log(trades)
        // console.log(symbol+" trade update. price: "+price+", quantity: "+quantity+", m: "+maker+", M" + M);
        roundedPrice = precisionRound(Number(price), 2)
        // console.log(roundedPrice)
        let index = arrTrades.map(o => o.price).indexOf(roundedPrice)

        io.sockets.emit("binance-eos-trades", {price: roundedPrice, vol: quantity, time: eventTime, side: maker})

        if(index == -1){
            if(maker == true){
                arrTrades.push({price: roundedPrice, hit: Math.round(Number(quantity)), lift: null})
            } else {
                arrTrades.push({price: roundedPrice, hit: null, lift: Math.round(Number(quantity))})
            }
        } else {
            if(maker == true){
                arrTrades[index].hit += Number(quantity)  
                arrTrades[index].hit = Math.round(arrTrades[index].hit)
                // console.log("the updated hit: ", arrTrades[index].hit)  
            } else {
                arrTrades[index].lift += Number(quantity)  
                arrTrades[index].lift = Math.round(arrTrades[index].lift)
                // console.log("the updated lift: ", arrTrades[index].lift)    
            }
        }
        
        updateArrFinal(socket, "trades")
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
            case chanId_EOSUSD:
                if(response[1].length > 3 ){
                    // console.log("sending to snapshot")
                    btfx.snapshotOrderbook(response)
                } else {
                    // console.log("sending to updateorderbook")
                    let array = btfx.updateOrderbook(response)
                    if(array != null){
                        io.sockets.emit("pushbtfx-eos", array)
                    }
                    // console.log("sent emit message")
                }
                break
            case chanId_trades:
                let trades = btfx.updateTrades(response)
                if(trades != null){
                    io.sockets.emit("pushbtfx-eos", trades[0])
                    io.sockets.emit("bitfinex-eos-trades", trades[1])
                }
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
                    chanId_EOSUSD = response.chanId
                    console.log("Book channel ID updated")
                } else if(channel == "trades" && pair == "EOSUSD"){
                    chanId_trades = response.chanId
                    console.log("Trades channel ID updated")
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

function seedArrFinal(){
    arrBinance = []
    for( i = bnbUpper; i >= bnbLower; i -= 0.01 ){
        arrBinance.push({vol: "", price: precisionRound(i, 2), type: "", hit: null, lift: null})
    }
}

function updateArrFinal(socket, updateType){
    if(updateType == "orderbook"){
        arrBinance.forEach(function(item){
            item.vol = ""
            item.type = ""
        })
    
        indexBinance = null
        
        arr.forEach(function(item){
            indexBinance = arrBinance.map(o => o.price).indexOf(item.price)
            arrBinance[indexBinance].vol = item.vol
            arrBinance[indexBinance].type = item.type
        })
        
        for(i=1; i < arrBinance.length; i++){
            if(arrBinance[(i-1)].type == "ask" && arrBinance[(i+1)].type == "ask" && arrBinance[i].type == ""){
                arrBinance[i].type = "ask"
                arrBinance[i].vol = "0"
            } else if(arrBinance[(i-1)].type == "bid" && arrBinance[(i+1)].type == "bid" && arrBinance[i].type == ""){
                arrBinance[i].type = "bid"
                arrBinance[i].vol = "0"
            }
        }
        for(i=0; i < arrBinance.length; i++){
            if(arrBinance[i].type == ""){
                arrBinance[i].type = "ask"
            } else {
                break
            }
        }

        indexBinance = null
        arrTrades.forEach(function(item){
            indexBinance = arrBinance.map(o => o.price).indexOf(item.price)
            arrBinance[indexBinance].hit = item.hit
            arrBinance[indexBinance].lift = item.lift
        })

    } else if(updateType == "trades"){
        indexBinance = null
        arrTrades.forEach(function(item){
            indexBinance = arrBinance.map(o => o.price).indexOf(item.price)
            arrBinance[indexBinance].hit = item.hit
            arrBinance[indexBinance].lift = item.lift
        })
    }

    io.sockets.emit('pushBinance-eos', arrBinance)
}
