let bids = []
let asks = [] 
let best = {}

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
            }
        },

        subscribeOrderbook: function(symbol){
            let msg = JSON.stringify({
                event: 'subscribe',
                channel: 'book',
                symbol: symbol
            });
            return msg
        }
    }
}()