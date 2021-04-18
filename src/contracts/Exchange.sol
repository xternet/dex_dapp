pragma solidity ^0.5.0;

import "./Token.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV2V3Interface.sol";

contract Exchange {
  using SafeMath for uint;

  // Variables
  address public feeAccount; // the account that receives exchange fees
  address constant ETHER = address(0); // store Ether in tokens mapping with blank address
  mapping(address => mapping(address => uint256)) public tokens;
  mapping(uint256 => _Order) public orders;
  uint256 public orderCount;
  mapping(uint256 => bool) public orderCancelled;
  mapping(uint256 => bool) public orderFilled;

  /* UPDATE */
  AggregatorV2V3Interface internal ref; // Store ChainLink contract into variable
  event Fee(uint256 fee, uint256 timestamp);
  event FeePaid(uint256 fee, address user);

  // Events
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);
  event Order(
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet,
    address tokenGive,
    uint256 amountGive,
    uint256 timestamp
  );
  event Cancel(
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet,
    address tokenGive,
    uint256 amountGive,
    uint256 timestamp
  );
  event Trade(
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet,
    address tokenGive,
    uint256 amountGive,
    address userFill,
    uint256 timestamp
  );

  // Structs
  struct _Order {
    uint256 id;
    address user;
    address tokenGet;
    uint256 amountGet;
    address tokenGive;
    uint256 amountGive;
    uint256 timestamp;
  }

  constructor(address _feeAccount, address _aggregator) public {
    feeAccount = _feeAccount;
    ref = AggregatorV2V3Interface(_aggregator);
  }

  // Fallback: reverts if Ether is sent to this smart contract by mistake
  function() external {
    revert();
  }

  function depositEther() payable public {
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
    emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
  }

  function withdrawEther(uint _amount) public {
    require(tokens[ETHER][msg.sender] >= _amount);
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
    msg.sender.transfer(_amount);
    emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
  }

  function depositToken(address _token, uint _amount) public {
    require(_token != ETHER);
    require(Token(_token).transferFrom(msg.sender, address(this), _amount));
    tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
    emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }

  function withdrawToken(address _token, uint256 _amount) public {
    require(_token != ETHER);
    require(tokens[_token][msg.sender] >= _amount);
    tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
    require(Token(_token).transfer(msg.sender, _amount));
    emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }

  function balanceOf(address _token, address _user) public view returns (uint256) {
    return tokens[_token][_user];
  }

  function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
    orderCount = orderCount.add(1);
    orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
    emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
  }

  function cancelOrder(uint256 _id) public {
    _Order storage _order = orders[_id];
    require(address(_order.user) == msg.sender);
    require(_order.id == _id); // The order must exist
    orderCancelled[_id] = true;
    emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, now);
  }

  function fillOrder(uint256 _id) public payable {
    require(_id > 0 && _id <= orderCount, 'Error, wrong id');
    require(!orderFilled[_id], 'Error, order already filled');
    require(!orderCancelled[_id], 'Error, order already cancelled');
    require(msg.value>0, 'Error, msg.value must be higher than 0');
    require(_payFee(), 'Error, wrong fee amount');
    
    _Order storage _order = orders[_id];
    _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
    orderFilled[_order.id] = true;
  }

  function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
    tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet);
    tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);

    tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
    tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGive);

    emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, now);
  }

  function _payFee() internal returns(bool) {
    uint fee = calcFee();
    require(msg.value==fee, 'Error, msg.value must equal $1 in ETH');
    tokens[ETHER][feeAccount] = tokens[ETHER][feeAccount].add(msg.value);

    emit FeePaid(msg.value, msg.sender);
    return true;
  }

  function calcFee() public returns(uint) {
    uint ethInWei = 1e18;
    uint oracleUsd = 1e8; // $1 in Oracle's format
    uint oracleEthInUsd = 1e11; // for local tests, eth=$1k
    // uint oracleEthInUsd = uint(ref.latestAnswer()); // latest price from Chainlink history

    uint usdInWei = (oracleUsd.mul(ethInWei)).div(oracleEthInUsd);

    // Emit event
    emit Fee(usdInWei, now);
    return usdInWei;
  }
}