var binance = require("node-binance-api");
var arr = []
var k = null

binance.websockets.depthCache(['EOSUSDT'], (symbol, depth) => {
    let bids = binance.sortBids(depth.bids);
    let asks = binance.sortAsks(depth.asks);

    let bestBid = Number(binance.first(bids));
    let bestAsk = Number(binance.first(asks));

    let bidPrices = Object.keys(bids)
    let askPrices = Object.keys(asks)
    let bidVolumes = Object.values(bids)
    let askVolumes = Object.values(asks)

    arr = []
    k = 0

    for(i = 0; i < askPrices.length; i++){
        askPrices[i] = precisionRound(askPrices[i], 2)
    }

    for (i = 0; i < bidPrices.length; i++) {
        bidPrices[i] = precisionRound(bidPrices[i], 2)
    }
    
    for (i = askPrices.length - 1; i > 0; i--){
        if(askPrices[i] - askPrices[0] <= 0.09){
            if(arr.length == 0){
                arr.push({vol: Math.round(askVolumes[i]), price: askPrices[i], type: "ask"})
            } else {
                if(askPrices[i] == askPrices[i + 1]){
                    arr[k].vol += askVolumes[i]
                    arr[k].vol = Math.round(arr[k].vol)
                } else {
                    arr.push({vol: askVolumes[i], price: askPrices[i], type: "ask" })
                    k++
                }
            }
        }
    }

    while((arr[k].price - 0.01) != bidPrices[0]){
        arr.push({ vol: "", price: arr[k].price - 0.01, type: "mid"})
        k++
    }

    for (i = 0; i < bidPrices.length; i++) {
        if (bidPrices[0] - bidPrices[i] <= 0.09) {
            if (arr[k].type != "bid") {
                arr.push({ vol: Math.round(bidVolumes[i]), price: bidPrices[i], type: "bid" })
                k++
            } else {
                if (bidPrices[i] == bidPrices[i - 1]) {
                    arr[k].vol += bidVolumes[i]
                    arr[k].vol = Math.round(arr[k].vol)
                } else {
                    arr.push({ vol: bidVolumes[i], price: bidPrices[i], type: "bid" })
                    k++
                }
            }
        }
    }

    // console.log(arr)
    // console.log("*********************")

})

module.exports = arr

function precisionRound(number, precision){
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}