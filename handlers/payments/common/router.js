var Router = require('koa-router');

var router = module.exports = new Router();
router.param('userById', require('users').routeUserById);

var order = require('./controller/order');
var checkout = require('./controller/checkout');
var ordersByUser = require('./controller/ordersByUser');

router.post('/checkout', checkout.post);
router.patch('/order', order.patch);
router.del('/order', order.del);

router.get('/orders/user/:userById', ordersByUser.get);

router.get('/cancel-pending', require('./controller/cancelPending').get);

// form for invoices (after generating the transaction) submits here to go back to order,
// without any external service
router.get('/redirect/order/:orderNumber', function*() {
  yield this.loadOrder();
  this.redirectToOrder();
});



