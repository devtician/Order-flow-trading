import { Component, OnInit, AfterViewInit} from '@angular/core';
import * as io from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  host: { '(window:keydown)': 'hotkeys($event)' },
})

export class AppComponent implements OnInit, AfterViewInit{
  currencyArray = [];
  socket;
  binanceEOS;
  bitfinexEOS;
  binanceBTC;
  bitfinexBTC;

  constructor(private http: HttpClient) {
    this.socket = io.connect('http://localhost:3000')
    this.socket.on('getCurrencies', (data) => {
      this.currencyArray = data
      this.binanceEOS = data[0]
      this.bitfinexEOS = data[1]
      this.binanceBTC = data[2]
      this.bitfinexBTC = data[3]
    })
  }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
    this.socket.on('update-trades-bitfinex-EOSUSD', (data) => {
      if (Math.abs(Number(data[0].vol)) != 0 && Math.abs(Number(data[0].vol)) >= this.bitfinexEOS.initFilterValue) {
        let date = new Date(data[0].time);
        this.bitfinexEOS.trades.unshift({
          volume: Math.abs(Number(data[0].vol)).toFixed(data[1].numsAfterDecimal.trades),
          time: date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(),
          price: data[0].price.toFixed(data[1].numsAfterDecimal.cup),
          side: typeof data[0].side === 'boolean' ? data[0].side : (Math.sign(data[0].vol) == 1 ? false : true)
        })
        if (this.bitfinexEOS.trades.length >= 58) {
          this.bitfinexEOS.trades.pop()
        }
      }
    })
    this.socket.on('update-trades-bitfinex-BTCUSD', (data) => {
      if (Math.abs(Number(data[0].vol)) != 0 && Math.abs(Number(data[0].vol)) >= this.bitfinexBTC.initFilterValue) {
        let date = new Date(data[0].time);
        this.bitfinexBTC.trades.unshift({
          volume: Math.abs(Number(data[0].vol)).toFixed(data[1].numsAfterDecimal.trades),
          time: date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(),
          price: data[0].price.toFixed(data[1].numsAfterDecimal.cup),
          side: typeof data[0].side === 'boolean' ? data[0].side : (Math.sign(data[0].vol) == 1 ? false : true)
        })
        if (this.bitfinexBTC.trades.length >= 58) {
          this.bitfinexBTC.trades.pop()
        }
      }
    })
    this.socket.on('update-trades-binance-BTCUSDT', (data) => {
      if (Math.abs(Number(data[0].vol)) != 0 && Math.abs(Number(data[0].vol)) >= this.binanceBTC.initFilterValue) {
        let date = new Date(data[0].time);
        this.binanceBTC.trades.unshift({
          volume: Math.abs(Number(data[0].vol)).toFixed(data[1].numsAfterDecimal.trades),
          time: date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(),
          price: data[0].price.toFixed(data[1].numsAfterDecimal.cup),
          side: typeof data[0].side === 'boolean' ? data[0].side : (Math.sign(data[0].vol) == 1 ? false : true)
        })
        if (this.binanceBTC.trades.length >= 58) {
          this.binanceBTC.trades.pop()
        }
      }
    })
    this.socket.on('update-trades-binance-EOSUSDT', (data) => {
      if (Math.abs(Number(data[0].vol)) != 0 && Math.abs(Number(data[0].vol)) >= this.binanceEOS.initFilterValue) {
        let date = new Date(data[0].time);
        this.binanceEOS.trades.unshift({
          volume: Math.abs(Number(data[0].vol)).toFixed(data[1].numsAfterDecimal.trades),
          time: date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(),
          price: data[0].price.toFixed(data[1].numsAfterDecimal.cup),
          side: typeof data[0].side === 'boolean' ? data[0].side : (Math.sign(data[0].vol) == 1 ? false : true)
        })
        if (this.binanceEOS.trades.length >= 58) {
          this.binanceEOS.trades.pop()
        }
      }
    })
    this.socket.on('update-cup-binance-EOSUSDT', (data) => {
      this.binanceEOS.cup = data
    })
    this.socket.on('update-cup-binance-BTCUSDT', (data) => {
      this.binanceBTC.cup = data
    })
    // this.socket.on('update-cup-bitfinex-BTCUSD', (data) => {
    //   this.bitfinexBTC.cup = data
    // })
    this.socket.on('update-cup-bitfinex-EOSUSD', (data) => {
      this.bitfinexEOS.cup = data
    })
  }

  changeFilterValue(e) {
    let idArr = e.target.id.split('-')
    for (let currency of this.currencyArray) {
      if (currency.exchange == idArr[0] && currency.symbol == idArr[1]) {
        currency.initFilterValue = Number(e.target.value)
      }
    }
  }

  resetFilter(e){
    let filter  = e.target.nextSibling;
    while (filter.children.length != 0) {
      filter.removeChild(filter.lastChild)
    }
  }

  hotkeys(e) {
    if (e.ctrlKey && e.which == 67) {
      e.preventDefault()
      this.clearCups();
    }
    if (e.ctrlKey && e.which == 70) {
      e.preventDefault()
      let nodes = Array.from(document.querySelectorAll('.filter__trades'))
      nodes.forEach(node => {
        while (node.children.length != 0) {
          node.removeChild(node.lastChild)
        }
      })
    }
  }

  clearCups() {
    this.http.get('http://localhost:3000/clear-cups').subscribe(data => console.log(data))
  }
}
