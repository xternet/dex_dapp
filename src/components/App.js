import { contractsLoadedSelector } from '../store/selectors'
import { update } from '../store/interactions'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import Content from './Content'
import Navbar from './Navbar'
import './App.css'

class App extends Component {
  async componentWillMount() {
    await this.loadBlockchainData(this.props.dispatch)
  }

  /** !UPDATE
    * Use Chrome Browser (web3 is not working with Firefox yet)
    * https://metamask.zendesk.com/hc/en-us/articles/360053147012
    *
    * DApp update UI without refreshing the page.
    *
    * loadBlockchainData() will update UI in 3x cases:
    * Case 1: User connect to DApp.
    * Case 2: User change account.
    * Case 3: User change network.
    */
  async loadBlockchainData(dispatch) {
    /* Case 1, User connect for 1st time */
    if(typeof window.ethereum !== 'undefined'){
      await update(dispatch)

      /* Case 2 - User switch account */
      window.ethereum.on('accountsChanged', async () => {
        await update(dispatch)
      });

      /* Case 3 - User switch network */
      window.ethereum.on('chainChanged', async () => {
        await update(dispatch)
      });
    }
  }

  render() {
    return (
      <div className="text-monospace text-center">
        <Navbar />
        { this.props.contractsLoaded ? <Content /> : <div className="content"></div> }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    contractsLoaded: contractsLoadedSelector(state)
  }
}

export default connect(mapStateToProps)(App)