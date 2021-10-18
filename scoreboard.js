const uuidv4 = require('uuid').v4

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

    handleNewGame(newGame) {
        game = {
            name: newGame.name,
            code: this.makeGameCode(4)
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