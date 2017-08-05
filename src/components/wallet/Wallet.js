import React from 'react';
var fs = window.require('fs');
var os = window.require('os');
var bs58 = require('bs58');
var bitcoin = window.require('bitcoinjs-lib');
import axios from 'axios';
import {toHexString, encrypt, decrypt} from '../../utils/utils';
import QRCode from 'qrcode.react';


import Navigation from '../Navigation';


export default class Wallet extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            keys: [],
            wallet: {},
            is_loading: false,
            safex_price: 0,
            bitcoin_price: 0,
            receive_amount: 0.0000001.toFixed(7),
            colapse_open: {
                key: '',
                receive_open: false,
                send_open: false
            },
            send_coin: 'safex',
            send_amount: 0.0000001.toFixed(7),
            send_fee: 0,
            send_total: 0,
        }

        this.createKey = this.createKey.bind(this);
        this.importKey = this.importKey.bind(this);
        this.getSafexPrice = this.getSafexPrice.bind(this);
        this.getBitcoinPrice = this.getBitcoinPrice.bind(this);
        this.getBitcoinBalance = this.getBitcoinBalance.bind(this);
    }


    componentDidMount() {

        try {
            var json = JSON.parse(localStorage.getItem('wallet'));
            this.setState({wallet: json, keys: json['keys']});
        } catch (e) {
            console.log(e);
        }

        this.getSafexPrice();
        this.getBitcoinPrice();
    }

    sendBitcoin() {
        //send bitcoins
        //fetch UTXOs for a specific address /insight-api/addr/[:addr]/utxo
        //broadcast /insight-api/tx/send
        // rawtx: "signed transaction as hex string"

        //eg

        //rawtx: 01000000017b1eabe0209b1fe794124575ef807057c77ada2138ae4fa8d6c4de0398a14f3f00000000494830450221008949f0cb400094ad2b5eb399d59d01c14d73d8fe6e96df1a7150deb388ab8935022079656090d7f6bac4c9a94e0aad311a4268e082a725f8aeae0573fb12ff866a5f01ffffffff01f0ca052a010000001976a914cbc20a7664f2f69e5355aa427045bc15e7c6c77288ac00000000

        //estimate fee:
        // /insight-api/utils/estimatefee[?nbBlocks=2]
    }

    sendSafex() {

    }

    safexPayload(amount) {
        const prefix = 'omni';
        const payload = this.padZeroes16(this.toHex(56)) + this.padZeroes16(this.toHex(amount));

        return new Buffer.concat([new Buffer(prefix), new Buffer(payload, 'hex')]);
    }

    toHex(num) {
        return (num).toString(16);
    }

    padZeroes16(str) {
        var result = str,
            left = 16 - str.length;

        if (left < 0) {
            throw new Error('invalid amount');
        }

        for (let i = left; i--;) {
            result = '0' + result;
        }

        return result;
    }

    getBitcoinPrice() {
        axios.get('https://api.coinmarketcap.com/v1/ticker/').then(res => {
            console.log(res);
            try {
                for (var i = 0; i < res.data.length; i++) {
                    // look for the entry with a matching `code` value
                    if (res.data[i].symbol === 'BTC') {
                        console.log(res.data[i].price_usd)
                        this.setState({bitcoin_price: res.data[i].price_usd});
                    }
                }
            } catch (e) {
                console.log(e);
            }
        });
        //get the current price of bitcoin
    }

    getSafexPrice() {
        axios.get('https://api.coinmarketcap.com/v1/ticker/').then(res => {
            console.log(res);
            try {
                for (var i = 0; i < res.data.length; i++) {
                    // look for the entry with a matching `code` value
                    if (res.data[i].symbol === 'SAFEX') {
                        console.log(res.data[i].price_usd)
                        this.setState({safex_price: res.data[i].price_usd});
                    }
                }
            } catch (e) {
                console.log(e);
            }
        });
        //get latest price of safex
    }

    getBitcoinHistory() {
        //take in an address, return the history of transactions
        //transaction history:
        // /insight-api/txs/?address=mmhmMNfBiZZ37g1tgg2t8DDbNoEdqKVxAL
    }

    getBitcoinBalance(address) {

        axios.get('http://46.101.251.77/insight-api/addr/' + address + '/balance').then(res => {
            console.log(res);
            return res;
        });
        //take in an address, return the balance for bitcoins
        // /insight-api/addr/[:addr]/balance
    }

    getSafexHistory() {
        //take in an address, return the history of transactions for safex

        // http://omniexplorer.info/ask.aspx?api=gethistory&address=1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P
    }

    getSafexBalance(address) {
        //take in an address, return the balance for safex coins

        //  http://omniexplorer.info/ask.aspx?api=getbalance&prop=1&address=1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P
        axios.get('http://omniexplorer.info/ask.aspx?api=getbalance&prop=1&address=' + address ).then(res => {
            console.log(res);
            return res;
        });
    }

    getAverageFee() {
        //fetch the average fee cost, for preloading into transactions, for safex or for bitcoin
    }


    createKey() {
        this.setState({is_loading: true});

        var random_array = new Uint8Array(32);
        window.crypto.getRandomValues(random_array);
        var priv_key_bytes = [];

        for (var i = 0; i < random_array.length; ++i) {
            priv_key_bytes[i] = random_array[i];
        }

        var hex_string = toHexString(priv_key_bytes).toUpperCase();

        var priv_key_and_version = "80" + hex_string;
        var first_bytes = Buffer.from(priv_key_and_version, 'hex');
        var first_sha = bitcoin.crypto.sha256(first_bytes);
        var second_sha = bitcoin.crypto.sha256(first_sha);
        var checksum = toHexString(second_sha).substr(0, 8).toUpperCase();
        var key_with_checksum = priv_key_and_version + checksum;

        var final_bytes = Buffer.from(key_with_checksum, 'hex');
        var priv_key_wif = bs58.encode(final_bytes);

        var key_pair = bitcoin.ECPair.fromWIF(priv_key_wif);

        var address = key_pair.getAddress();


        var key_json = {};
        key_json['public_key'] = address;
        key_json['private_key'] = priv_key_wif;


        try {
            var json = JSON.parse(localStorage.getItem('wallet'));
        } catch (e) {
            console.log(e);
        }


        json['keys'].push(key_json);
        console.log(json);


        var crypto = require('crypto'),
            algorithm = 'aes-256-ctr',
            password = localStorage.getItem('password');

        var cipher_text = encrypt(JSON.stringify(json), algorithm, password);


        var home_dir = os.homedir();

        fs.writeFile(home_dir + '/safexwallet.dat', cipher_text, (err) => {
            if (err) {
                console.log(err)
            } else {
                localStorage.setItem('wallet', JSON.stringify(json));
                try {
                    var json2 = JSON.parse(localStorage.getItem('wallet'));
                    this.setState({wallet: json2, keys: json2['keys'], is_loading: false});
                } catch (e) {
                    console.log(e);
                }

            }
        });
    }

    importKey(e) {
        e.preventDefault();
        try {
            var key_pair = bitcoin.ECPair.fromWIF(e.target.key.value);

            var address = key_pair.getAddress();


            var key_json = {};
            key_json['public_key'] = address;
            key_json['private_key'] = e.target.key.value;


            try {
                var json = JSON.parse(localStorage.getItem('wallet'));
                json['keys'].push(key_json);
                console.log(json);

                var key_exists = false;

                for (var i = 0; i < json['keys'].length; i++) {
                    // look for the entry with a matching `code` value
                    if (json['keys'][i].public_key === address) {
                        key_exists = true;
                    }
                }

                if (key_exists === false) {
                    var crypto = require('crypto'),
                        algorithm = 'aes-256-ctr',
                        password = localStorage.getItem('password');

                    var cipher_text = encrypt(JSON.stringify(json), algorithm, password);


                    var home_dir = os.homedir();

                    fs.writeFile(home_dir + '/safexwallet.dat', cipher_text, (err) => {
                        if (err) {
                            console.log(err)
                        } else {
                            localStorage.setItem('wallet', JSON.stringify(json));
                            try {
                                var json2 = JSON.parse(localStorage.getItem('wallet'));
                                this.setState({wallet: json2, keys: json2['keys'], is_loading: false});
                            } catch (e) {
                                console.log(e);
                            }

                        }
                    });
                } else {
                    console.log('key exists');
                }


            } catch (e) {
                console.log(e);
            }
        } catch (e) {
            console.log(e);
        }


    }

    exportKey() {

    }
    amountChange(receive_amount) {
        this.setState({
            receive_amount: receive_amount.value
          });
    }
    openSendReceive(key,sendreceive){
        if(sendreceive == 'send'){
                this.setState({
                    colapse_open: {
                        key: key,
                        send_open: !this.state.colapse_open.send_open,
                        receive_open: false
                    }
                });
            }
        if(sendreceive == 'receive'){
                this.setState({
                    colapse_open: {
                        key: key,
                        send_open: false,
                        receive_open: !this.state.colapse_open.receive_open
                    }
                });
            }
    }
    sendCoinChoose(coin){
        this.setState({
            send_coin: coin
        })
    }
    sendCoinOnChange(e){
        if(e.target.name == 'amount'){
            var send_fee = parseFloat(e.target.value) / 40;
            var send_total = 0;
            if(send_fee < 0.01){
                send_fee = 0.01;
            }
            send_total = parseFloat(e.target.value) + send_fee;
            this.setState({
                send_amount: e.target.value,
                send_fee: send_fee,
                send_total: send_total
            });
        }
    }
    sendCoin(e){
        e.preventDefault();
        if(this.state.send_coin == 'safex'){
            //this.sendSafex();
            console.log('Sending Safex');
        }else{
            //this.sendBitcoin();
            console.log('Sending Bitcoin');
        }
    }

    render() {

        const {keys} = this.state;

        var table = Object.keys(keys).map((key) => {

            return <div className="col-xs-12 single-key" key={key}>
                <div className="col-xs-7">
                    <div className="key">{keys[key].public_key}</div>
                    <div className="amounts">
                        AMOUNT: <span className="amount">Safex: {this.getSafexBalance(keys[key].public_key)}</span> <span className="amount">Bitcoin: {this.getBitcoinBalance(keys[key].public_key)}</span>
                    </div>
                </div>
                <div className="pull-right">
                    <button onClick={this.openSendReceive.bind(this,key,'send')}>SEND  <img src="/images/send.png" /></button>
                    <button onClick={this.openSendReceive.bind(this,key,'receive')}>RECEIVE <img src="/images/import.png" /></button>
                    <button><img src="/images/history.png" /></button>
                </div>
                <form onChange={this.sendCoinOnChange.bind(this)} onSubmit={this.sendCoin} className={this.state.colapse_open.send_open && this.state.colapse_open.key == key
                ? 'col-xs-12 form-inline form-send active'
                : 'col-xs-12 form-inline form-send'}>
                    <div className="row">
                        <div className="col-xs-8 send-left">
                            <label htmlFor="which">Currency</label>
                            <img className={this.state.send_coin == 'safex'
                            ? 'coin active'
                            : 'coin'} onClick={this.sendCoinChoose.bind(this,'safex')} src="/images/safex-coin.png" />
                            <img className={this.state.send_coin == 'btc'
                            ? 'coin active'
                            : 'coin'} onClick={this.sendCoinChoose.bind(this,'btc')} src="/images/btc-coin.png" />
                            <input type="hidden" name="which" value={this.state.send_coin}></input>
                            <div className="input-group">
                              <span className="input-group-addon" id="basic-addon1">TO:</span>
                              <input name="destination" type="text" className="form-control" placeholder="Address" aria-describedby="basic-addon1" />
                            </div>
                        </div>
                        <div className="col-xs-4">
                            <div className="form-group">
                                <label htmlFor="amount">Amount:</label>
                                <input name="amount" value={this.state.send_amount} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="fee">Fee:</label>
                                <input name="fee" value={this.state.send_fee} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="total">Total:</label>
                                <input name="total" value={this.state.send_total}></input>
                            </div>
                            <button type="submit">Send</button>
                        </div>
                    </div>
                </form>
                <div className={this.state.colapse_open.receive_open && this.state.colapse_open.key == key
                ? 'col-xs-12 receive active'
                : 'col-xs-12 receive'}>
                    <div className="col-xs-12">
                        <label htmlFor="receive-address">Address:</label>
                        <input name="receive-address" value={keys[key].public_key} />
                    </div>
                    <div className="col-xs-8">
                        <label htmlFor="amount">Amount:</label>
                        <input type="amount" placeholder="1" onChange={this.amountChange.bind(this)} value={this.state.receive_amount} />
                    </div>
                    <div className="col-xs-4">
                        <div className="row">
                            <div className="col-xs-6">
                                <QRCode value={"bitcoin:"+keys[key].public_key+"?amount="+this.state.receive_amount} />
                            </div>
                            <div className="col-xs-6">
                                <button>Print <img src="/images/print.png" /></button>
                                <button>PDF <img src="/images/pdf.png" /></button>
                            </div>
                        </div>
                    </div>
                </div>
        </div>
        });

        return (
            <div>
                <Navigation />
                <div className="container key-buttons">
                        <div className="row">
                            <div className="col-xs-12">
                                <button onClick={this.createKey}>create key</button>
                                <form onSubmit={this.importKey}>
                                    <input name="key"></input>
                                    <button type="submit">import key</button>
                                </form>
                                <button>export key</button>
                            </div>
                        </div>
                </div>
                <div className="container">
                    <div className="col-xs-12">
                        <div className="row">
                            {table}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}