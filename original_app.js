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

var arrFinal = []
var scaleUpper = null
var scaleLower = null
var scaleMid = null

// var arr = []
var arrBids = []
var arrAsks = []

var k = null
var j = null

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

        if(arrFinal.length == 0){
            scaleMid = precisionRound(((bestBid + bestAsk)/2), 2)
            scaleUpper = precisionRound((scaleMid + 0.24), 2)
            scaleLower = precisionRound((scaleMid - 0.24), 2)
            seedArrFinal()
        }

        arrBids = []
        arrAsks = []
        k = 0
        j = 0

        for (i = 0; i < askPrices.length; i++) {
            askPrices[i] = precisionRound(askPrices[i], 2)
        }

        for (i = 0; i < bidPrices.length; i++) {
            bidPrices[i] = precisionRound(bidPrices[i], 2)
        }

        for (i = askPrices.length - 1; i > 0; i--) {
            if (askPrices[i] - askPrices[0] <= 0.10) {
                if (arrAsks.length == 0) {
                    arrAsks.push({ vol: Math.round(askVolumes[i]), price: askPrices[i]})
                } else {
                    if (askPrices[i] == askPrices[i + 1]) {
                        arrAsks[k].vol += askVolumes[i]
                        arrAsks[k].vol = Math.round(arrAsks[k].vol)
                    } else {
                        arrAsks.push({ vol: askVolumes[i], price: askPrices[i]})
                        k++
                    }
                }
            }
        }

        // if (precisionRound(arr[k].price - bidPrices[0], 2) > 0.01) {
        //     var numTimes = Math.round((arr[k].price - bidPrices[0])/0.01 - 1)
        //     for (i = 1; i <= numTimes ; i++ ){
        //         arr.push({ vol: "", price: precisionRound((arr[k].price - i * 0.01), 2), type: "mid" })
        //         k++
        //     }
        // }

        for (i = 0; i < bidPrices.length; i++) {
            if (bidPrices[0] - bidPrices[i] <= 0.10) {
                if (arrBids.length == 0) {
                    arrBids.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i]})
                } else {
                    if (bidPrices[i] == bidPrices[i - 1]) {
                        arrBids[j].vol += bidVolumes[i]
                        arrBids[j].vol = Math.round(arrBids[j].vol)
                    } else {
                        arrBids.push({ vol: bidVolumes[i], price: bidPrices[i]})
                        j++
                    }
                }
            }
        }

        // console.log(arr)
        // console.log("*********************")
        console.log(arrBids)
        console.log(arrAsks)

        updateArrFinal(arrBids, arrAsks, socket)
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
    for( i = scaleUpper; i >= scaleLower; i -= 0.01 ){
        arrFinal.push({vol: "", price: precisionRound(i, 2), type: ""})
    }
}

function updateArrFinal(arrBids, arrAsks, socket){
    arrFinal.forEach(function(item){
        item.vol = ""
        item.type = ""
    })

    let index = null
    console.log(arrFinal)
    arrBids.forEach(function(item){
        console.log(item.price)
        index = arrFinal.map( o => o.price).indexOf(item.price)
        console.log(index)
        arrFinal[index].vol = item.vol
        arrFinal[index].type = "bid"
    })

    arrAsks.forEach(function(item){
        index = arrFinal.map( o => o.price).indexOf(item.price)
        arrFinal[index].vol = item.vol
        arrFinal[index].type = "ask"
    })

    socket.emit('push', arrFinal)
}