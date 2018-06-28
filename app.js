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

wss.onopen = () => init()

function init(){
    wss.send(btfx.subscribeOrderbook("EOSUSD"))
}


// BINANCE Variables
var arrFinal = []
var scaleUpper = null
var scaleLower = null
var scaleMid = null
var thresholdUpper = null
var thresholdLower = null

var arr = []
var arrTrades = []
var k = null
var roundedPrice = null



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

        if(arrFinal.length == 0 || bestAsk > thresholdUpper || bestBid < thresholdLower){
            scaleMid = precisionRound(((bestBid + bestAsk)/2), 2)
            scaleUpper = precisionRound((scaleMid + 0.24), 2)
            scaleLower = precisionRound((scaleMid - 0.24), 2)
            thresholdUpper = precisionRound((scaleMid + 0.14), 2)
            thresholdLower = precisionRound((scaleMid - 0.14), 2)
            seedArrFinal()
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
        console.log(roundedPrice)
        let index = arrTrades.map(o => o.price).indexOf(roundedPrice)

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
                console.log("the updated hit: ", arrTrades[index].hit)  
            } else {
                arrTrades[index].lift += Number(quantity)  
                arrTrades[index].lift = Math.round(arrTrades[index].lift)
                console.log("the updated lift: ", arrTrades[index].lift)    
            }
        }
        
        wss.onmessage = (message) => {
            var response = JSON.parse(message.data)

            if(Array.isArray(response)){
                switch(response[0]){
                    case chanId_EOSUSD:
                        if(response[1].length > 3 ){
                            btfx.snapshotOrderbook(response)
                        } else {
                            btfx.updateOrderbook(response)
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
                            chanId_EOSUSD = response.chanId
                            console.log("Book channel ID updated")
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

        updateArrFinal(socket, "trades")
    })



    socket.on('response', function (data) {
        console.log(data);
    });
});

server.listen(3000, function(){
    console.log("Server running on port 3000")
})

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

function seedArrFinal(){
    arrFinal = []
    for( i = scaleUpper; i >= scaleLower; i -= 0.01 ){
        arrFinal.push({vol: "", price: precisionRound(i, 2), type: "", hit: null, lift: null})
    }
}

function updateArrFinal(socket, updateType){
    if(updateType == "orderbook"){
        arrFinal.forEach(function(item){
            item.vol = ""
            item.type = ""
        })
    
        let index = null
        
        arr.forEach(function(item){
            index = arrFinal.map(o => o.price).indexOf(item.price)
            arrFinal[index].vol = item.vol
            arrFinal[index].type = item.type
        })
        
        for(i=1; i < arrFinal.length; i++){
            if(arrFinal[(i-1)].type == "ask" && arrFinal[(i+1)].type == "ask" && arrFinal[i].type == ""){
                arrFinal[i].type = "ask"
                arrFinal[i].vol = "0"
            } else if(arrFinal[(i-1)].type == "bid" && arrFinal[(i+1)].type == "bid" && arrFinal[i].type == ""){
                arrFinal[i].type = "bid"
                arrFinal[i].vol = "0"
            }
        }
        for(i=0; i < arrFinal.length; i++){
            if(arrFinal[i].type == ""){
                arrFinal[i].type = "ask"
            } else {
                break
            }
        }

        arrTrades.forEach(function(item){
            index = arrFinal.map(o => o.price).indexOf(item.price)
            arrFinal[index].hit = item.hit
            arrFinal[index].lift = item.lift
        })

    } else if(updateType == "trades"){
        arrTrades.forEach(function(item){
            index = arrFinal.map(o => o.price).indexOf(item.price)
            arrFinal[index].hit = item.hit
            arrFinal[index].lift = item.lift
        })
    }

    socket.emit('push', arrFinal)
}