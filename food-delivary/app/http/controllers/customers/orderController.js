// const Order = require('../../../models/order');
// const moment = require('moment');
// const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

// function orderController() {
//     return {
//         async store(req, res) {
//             // Validate request
//             const { phone, address, stripeToken, paymentType } = req.body;
//             if (!phone || !address) {
//                 return res.status(422).json({ message: 'All fields are required' });
//             }

//             try {
//                 const order = new Order({
//                     customerId: req.user._id,
//                     items: req.session.cart.items,
//                     phone,
//                     address
//                 });

//                 const result = await order.save();
//                 const placedOrder = await Order.populate(result, { path: 'customerId' });

//                 // Stripe payment
//                 if (paymentType === 'card') {
//                     const charge = await stripe.charges.create({
//                         amount: req.session.cart.totalPrice * 100,
//                         source: stripeToken,
//                         currency: 'inr',
//                         description: `Pizza order: ${placedOrder._id}`
//                     });

//                     placedOrder.paymentStatus = true;
//                     placedOrder.paymentType = paymentType;
//                     await placedOrder.save();

//                     // Emit
//                     const eventEmitter = req.app.get('eventEmitter');
//                     eventEmitter.emit('orderPlaced', placedOrder);
//                     delete req.session.cart;
//                     return res.json({ message: 'Payment successful, Order placed successfully' });
//                 } else {
//                     delete req.session.cart;
//                     return res.json({ message: 'Order placed successfully' });
//                 }
//             } catch (err) {
//                 return res.status(500).json({ message: 'Something went wrong' });
//             }
//         },
//         async index(req, res) {
//             try {
//                 const orders = await Order.find(
//                     { customerId: req.user._id },
//                     null,
//                     { sort: { 'createdAt': -1 } }
//                 );
//                 res.header('Cache-Control', 'no-store');
//                 res.render('customers/orders', { orders, moment });
//             } catch (err) {
//                 return res.status(500).json({ message: 'Something went wrong' });
//             }
//         },
//         async show(req, res) {
//             try {
//                 const order = await Order.findById(req.params.id);

//                 // Authorize user
//                 if (req.user._id.toString() === order.customerId.toString()) {
//                     return res.render('customers/singleOrder', { order });
//                 }
//                 return res.redirect('/');
//             } catch (err) {
//                 return res.status(500).json({ message: 'Something went wrong' });
//             }
//         }
//     };
// }

// module.exports = orderController;




const Order = require('../../../models/order')
const moment = require('moment')
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)
function orderController () {
    return {
        store(req, res) {
            // Validate request
            const { phone, address, stripeToken, paymentType } = req.body
            if(!phone || !address) {
                return res.status(422).json({ message : 'All fields are required' });
            }

            const order = new Order({
                customerId: req.user._id,
                items: req.session.cart.items,
                phone,
                address
            })
            order.save().then(result => {
                Order.populate(result, { path: 'customerId' }, (err, placedOrder) => {
                    // req.flash('success', 'Order placed successfully')

                    // Stripe payment
                    if(paymentType === 'card') {
                        stripe.charges.create({
                            amount: req.session.cart.totalPrice  * 100,
                            source: stripeToken,
                            currency: 'inr',
                            description: `Pizza order: ${placedOrder._id}`
                        }).then(() => {
                            placedOrder.paymentStatus = true
                            placedOrder.paymentType = paymentType
                            placedOrder.save().then((ord) => {
                                // Emit
                                const eventEmitter = req.app.get('eventEmitter')
                                eventEmitter.emit('orderPlaced', ord)
                                delete req.session.cart
                                return res.json({ message : 'Payment successful, Order placed successfully' });
                            }).catch((err) => {
                                console.log(err)
                            })

                        }).catch((err) => {
                            delete req.session.cart
                            return res.json({ message : 'OrderPlaced but payment failed, You can pay at delivery time' });
                        })
                    } else {
                        delete req.session.cart
                        return res.json({ message : 'Order placed succesfully' });
                    }
                })
            }).catch(err => {
                return res.status(500).json({ message : 'Something went wrong' });
            })
        },
        async index(req, res) {
            const orders = await Order.find({ customerId: req.user._id },
                null,
                { sort: { 'createdAt': -1 } } )
            res.header('Cache-Control', 'no-store')
            res.render('customers/orders', { orders: orders, moment: moment })
        },
        async show(req, res) {
            const order = await Order.findById(req.params.id)
            // Authorize user
            if(req.user._id.toString() === order.customerId.toString()) {
                return res.render('customers/singleOrder', { order })
            }
            return  res.redirect('/')
        }
    }
}

module.exports = orderController