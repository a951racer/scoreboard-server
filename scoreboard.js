const uuidv4 = require('uuid').v4
var qr = require('qr-image')
var AWS = require('aws-sdk')

const users = new Map()
let game = null
let players = null
let scores = null

class Connection {
    constructor(io, socket) {
        this.socket = socket
        this.io = io

        socket.on('newGame', (newGame) => this.handleNewGame(newGame))
        socket.on('getGame', () => this.sendGame())

        socket.on('addPlayer', (newPlayer) => this.handleAddPlayer(newPlayer))
        socket.on('getPlayers', () => this.sendPlayers())
        
        socket.on('addScore', (newScore) => this.handleAddScore(newScore))
        socket.on('getScores', () => this.sendScores())
        socket.on('getTotals', () => this.sendTotals())
        
        socket.on('reset', () => this.reset())
        socket.on('disconnect', () => this.disconnect())
        
        socket.on('connect_error', (err) => {
            console.log(`connect_error due to ${err.message}`)
        })
    }
  
    makeGameCode(length) {
        var result = ''
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charactersLength = characters.length
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength))
        }
        console.log('gamecode: ', result)
        return result
    }

    async makeQRCode() {
        var qr_png = qr.image(process.env.ROOT_URL)

        let s3bucket = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        })
    
        var params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: 'qr.png',
            Body: qr_png,
            ContentType: 'image/png',
            ACL: "public-read"
        }
        
        s3bucket.upload(params, (err, data) => {
            if (err) {
                console.error(err)
            } else {
                console.log('file uploaded: ', data)
            }
        })
    }

    sendGame()  {
        console.log('sending game: ', game)
        this.io.sockets.emit('game', game)
    }

    sendPlayers()  {
        console.log('sending players: ', players)
        this.io.sockets.emit('players', players)
    }

    sendScores()  {
        console.log('sending scores: ', scores)
        this.io.sockets.emit('scores', scores)
    }

    sendTotals()  {
        console.log('sending players: ', players)
        this.io.sockets.emit('totals', players)
    }

    async handleNewGame(newGame) {
        await this.makeQRCode()
        game = {
            name: newGame.name,
            code: this.makeGameCode(4),
            qr: process.env.ROOT_URL
        }

        this.sendGame()
    }

    handleAddPlayer(newPlayer) {
        if (players) {
            players.push({
                id: uuidv4(),
                name: newPlayer.name,
                total: 0
            })
        } else {
            players = [
                {
                    id: uuidv4(),
                    name: newPlayer.name,
                    total: 0
                }    
            ]
        }
        this.sendPlayers()
    }

    handleAddScore(newScore) {
        const score = {
            id: uuidv4(),
            playerName: newScore.playerName,
            score: newScore.score
        }
        const round = parseInt(newScore.round)
        if (scores) {
            let existingRound = scores.find(score => parseInt(score.round) === parseInt(round))
            if (existingRound) {
                let existingScore = existingRound.scores.find(score => newScore.playerName === score.playerName)
                if (existingScore) {
                    existingScore.score = newScore.score
                } else {
                    existingRound.scores.push(score)
                }
            } else {
                    scores.push({
                        round,
                        scores: [
                            score
                        ]
                    })
            }
        } else {
            scores = [
                {
                    round,
                    scores: [
                        score
                    ]
                }
            ]
        }
        const updatePlayer = players.find(player => player.name === newScore.playerName)
        if (updatePlayer) {
            let total = 0
            scores.forEach((entry) => {
                entry.scores.forEach((score) => {
                    if (score.playerName === updatePlayer.name) {
                        total += parseInt(score.score)
                    }
                })
            })
            updatePlayer.total = total
        }
        this.sendScores()
        this.sendTotals()
    }


    reset() {
        game = null
        players = null
        scores = null
        this.sendTotals()
        this.sendScores()
        this.sendPlayers()
        this.sendGame()
    }

    disconnect() {
        users.delete(this.socket);
    }
}

function chat(io) {
  io.on('connection', (socket) => {
    new Connection(io, socket);   
  });
};

module.exports = chat;