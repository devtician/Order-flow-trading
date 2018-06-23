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

var arr = []
// var arrBids = []
// var arrAsks = []

var k = null
// var j = null

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

        arr = []
        // arrBids = []
        // arrAsks = []
        k = 0
        // j = 0

        for (i = 0; i < askPrices.length; i++) {
            askPrices[i] = precisionRound(askPrices[i], 2)
        }

        for (i = 0; i < bidPrices.length; i++) {
            bidPrices[i] = precisionRound(bidPrices[i], 2)
        }

        for (i = askPrices.length - 1; i > 0; i--) {
            if (askPrices[i] - askPrices[0] <= 0.10) {
                if (arr.length == 0) {
                    arr.push({ vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask"})
                } else {
                    if (askPrices[i] == askPrices[i + 1]) {
                        arr[k].vol += askVolumes[i]
                        arr[k].vol = Math.round(arr[k].vol)
                    } else {
                        arr.push({ vol: askVolumes[i], price: askPrices[i], type: "ask"})
                        k++
                    }
                }
            }
        }

        if (precisionRound(arr[k].price - bidPrices[0], 2) > 0.01) {
            var numTimes = Math.round((arr[k].price - bidPrices[0])/0.01 - 1)
            for (i = 1; i <= numTimes ; i++ ){
                arr.push({ vol: "", price: precisionRound((arr[k].price - i * 0.01), 2), type: "mid" })
                k++
            }
        }

        for (i = 0; i < bidPrices.length; i++) {
            if (bidPrices[0] - bidPrices[i] <= 0.10) {
                if (arr[k].type != "bid") {
                    arr.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid"})
                    k++
                } else {
                    if (bidPrices[i] == bidPrices[i - 1]) {
                        arr[k].vol += bidVolumes[i]
                        arr[k].vol = Math.round(arr[k].vol)
                    } else {
                        arr.push({ vol: bidVolumes[i], price: bidPrices[i], type: "bid"})
                        k++
                    }
                }
            }
        }

        // console.log(arr)
        // console.log("*********************")
        // console.log(arrBids)
        // console.log(arrAsks)

        updateArrFinal(arr, socket)
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

function updateArrFinal(arr, socket){
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
        if(arrFinal[i-1].type == "ask" && arrFinal[i+1].type == "ask" && arrFinal[i].type == ""){
            arrFinal[i].type = "ask"
            arrFinal[i].vol = 0
        } else if(arrFinal[i-1].type == "bid" && arrFinal[i+1].type == "bid" && arrFinal[i].type == ""){
            arrFinal[i].type = "bid"
            arrFinal[i].vol = 0
        }
    }
    for(i=0; i < arrFinal.length; i++){
        if(arrFinal[i].type == ""){
            arrFinal[i].type = "ask"
        } else {
            break
        }
    }
    
    
    // arrBids.forEach(function(item){
        //     console.log(item.price)
        //     index = arrFinal.map( o => o.price).indexOf(item.price)
        //     console.log(index)
        //     arrFinal[index].vol = item.vol
        //     arrFinal[index].type = "bid"
        // })
        
        // arrAsks.forEach(function(item){
            //     index = arrFinal.map( o => o.price).indexOf(item.price)
            //     arrFinal[index].vol = item.vol
            //     arrFinal[index].type = "ask"
            // })
            
    // console.log(arrFinal)
    socket.emit('push', arrFinal)
}