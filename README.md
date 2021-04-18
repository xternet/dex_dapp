## 🔧 Project Diagram
![Project workflow](https://i.gyazo.com/7328e5390fa92f147077ff5c963abf1b.png)

## Bootcamp Update v0.2.1, Auto-Balance.

Changes:
1. Auto-update UI after user change account/network in MetaMask:
    * App.js, line:23, loadBlockchainData();
    * interactions.js, line: 300, update();
    * interactions.js, line: 317, reset();
2. UI text improvement:
    * App.js, line: 42
3. Updating MetaMask, Web3 implementation:
    * interactions.js, line: 28 loadWeb3();
4. Switch colours in OrderBook(red-sell, green-buy):
    * selectors.js, line: 191
5. Preventing errors in interactions.js functions, adding if, try.
6. Adding fee info to OrderBook.js.
7. Improving UI of Balance.js, adding table for deposit token.
8. Deleting loadAllOrders(); from Content.js (update(); only can call that function)

If you find any bugs, please let us know.
dev@dappuniversity.com