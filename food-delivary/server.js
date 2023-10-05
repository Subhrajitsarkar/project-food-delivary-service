require('dotenv').config()

const express = require('express')
const app = express()
const ejs = require('ejs')
const path = require('path')
const expressLayouts = require('express-ejs-layouts')
const PORT = process.env.PORT || 3000
const mongoose = require('mongoose')
const session = require('express-session')
const flash = require('express-flash')
const MongoStore = require('connect-mongo')
const passport = require('passport')
const Emitter = require('events')

//database connection
const url = 'mongodb://127.0.0.1:27017/pizza'
mongoose.connect(url)

const connection = mongoose.connection;
connection.once('open', () => {
    console.log('Database connected...');
}).on('error', () => {
    console.log('Connection failed...');
});


//session strore
let mongoStore = MongoStore.create({
    mongoUrl: url,
    dbName: 'pizza',
    collectionName: 'sessions',
});

//event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

//session config
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    store: mongoStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

//passport config
const passportInit = require('./app/config/passport')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

//assets
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

//global middleware
app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})

//set template engine
app.use(expressLayouts)
app.set('views', path.join(__dirname, '/resources/views'))
app.set('view engine', 'ejs')

require('./routes/web')(app)

const server = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

//socket
const io = require('socket.io')(server)
io.on('connection', (socket) => {
    //join
    //console.log(socket.id)
    socket.on('join', (orderId) => {
        //console.log(orderId)
        socket.join(orderId)
    })
})

eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})