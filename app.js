const express = require('express')
const app = express()
const server = require('http').Server(app);
const io = require('socket.io')(server, { 'pingTimeout': 100000, 'pingInterval': 25000 });
const cors = require('cors');

// CONFIG
app.use(express.static(__dirname, +"/dist/order-flow-trading"))
app.use(cors())

// ROUTES
app.get("/", function(req, res){
    res.status(200).sendFile(__dirname + '/dist/order-flow-trading/index.html')
})

app.get("/clear-cups", function(req, res){
    for (let currency of currencyArray) {
        currency.clearCup()
    }
    res.send({
        worked: true
    })
})

// BITFINEX INIT
const BiftinexCurrency = require("./bitfinex.js")
const WebSocket = require("ws")
const wss = new WebSocket("wss://api.bitfinex.com/ws/2")

let bitfinexCurrencyArray = [
    eos_usd = new BiftinexCurrency(2, 0, 'EOSUSD', 1000, 2),
    btc_usd = new BiftinexCurrency(0, 2, 'BTCUSD', 2, 4),
]

wss.onopen = () => {
    for (let currency of bitfinexCurrencyArray) {
        wss.send(currency.subscribeOrderbook())
        wss.send(currency.subscribeTrades())
    }
}

wss.onmessage = (message) => {
    let response = JSON.parse(message.data)
    
    if(Array.isArray(response)){
        for (let currency of bitfinexCurrencyArray) {
            if (response[0] == currency.channelId.book) {
                if (response[1].length > 3) {
                    currency.snapshotOrderbook(response)
                } else {
                    let cup = currency.updateOrderbook(response)
                    if(cup != null){
                        io.emit(`update-cup-bitfinex-${currency.symbol}`, cup)
                    }
                }
            } else if (response[0] == currency.channelId.trades) {
                let trades = currency.updateTrades(response)
                if(trades != null){
                    io.emit(`update-cup-bitfinex-${currency.symbol}`, trades[0])
                    io.emit(`update-trades-bitfinex-${currency.symbol}`, [trades[1], { numsAfterDecimal: currency.numsAfterDecimal}])
                }
            }
        }
    } else {
        let event = response.event
        let channel = response.channel
        let pair = response.pair
        switch(event){
            case "subscribed":
                for (let currency of bitfinexCurrencyArray) {
                    if (pair == currency.symbol) {
                        if (channel == 'book') {
                            currency.channelId.book = response.chanId
                            console.log(`${currency.symbol} book channel ID updated`)
                        } else if (channel == 'trades') {
                            currency.channelId.trades = response.chanId
                            console.log(`${currency.symbol} trades channel ID updated`)
                        }
                    }
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

// BINANCE INIT
const binance = require("node-binance-api")
const BinanceCurrency = require('./binance.js')

let binanceCurrencyArray = [
    eos_usdt = new BinanceCurrency(2,0,'EOSUSDT', 1000, 1),
    btc_usdt = new BinanceCurrency(0,2,'BTCUSDT', 2, 3)
]

for (let currency of binanceCurrencyArray) {
    binance.websockets.depthCache([currency.symbol], (symbol, depth) => {
        let output = currency.updateOrderbook(symbol, depth)
        io.emit(`update-cup-binance-${currency.symbol}`, output)
    })
    binance.websockets.trades([currency.symbol], (trades) => {
        let output = currency.updateTrades(trades)
        io.emit(`update-cup-binance-${currency.symbol}`, output[0])
        io.emit(`update-trades-binance-${currency.symbol}`, [output[1],{ numsAfterDecimal: currency.numsAfterDecimal}])
    })
}
let currencyArray = [...binanceCurrencyArray, ...bitfinexCurrencyArray]

// ON CONNECTION 
io.on('connection', () => {
    io.emit('getCurrencies', currencyArray.sort((a, b) => a.position - b.position).map(a => { return { exchange: a.exchange, symbol: a.symbol, initFilterValue: a.initFilterValue, trades: [], cup: [] } }))
})

// SERVER
server.listen(3000, function(){
    console.log("Server running on port 3000")
})