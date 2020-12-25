const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
	cors: {origin: '*'}
});

let waiting = [];

app.get('/', (req, res) => {
	res.sendStatus(200);
});

io.on('connection', socket => {
	if (waiting.length == 0) {
		waiting.push(socket);
		socket.emit('waiting');
		socket.on('disconnect', () => {
			for (let i = 0; i < waiting.length; i++) {
				if (waiting[i] == socket) {
					waiting.splice(i, 1);
				}
			}
		});
	} else {
		let opponent = waiting[0];

		waiting.shift();

		let currentPlayer = 'X';
		let board = [
			'', '', '',
			'', '', '',
			'', '', ''
		];

		opponent.emit('started', 'X');
		socket.emit('started', 'O');

		const getWinner = () => {
			let lines = [
				[0, 1, 2],
				[3, 4, 5],
				[6, 7, 8],
				[0, 3, 6],
				[1, 4, 7],
				[2, 5, 8],
				[0, 4, 8],
				[2, 4, 6]
			];

			for (let i = 0; i < lines.length; i++) {
				let [a, b, c] = lines[i];
				if (board[a] && board[a] == board[b] && board[a] == board[c]) {
					return board[a];
				}
			}

			return;
		}

		const isTie = () => {
			for (let i = 0; i < board.length; i++) {
				if (board[i] == '') {
					return false;
				}
			}

			return true;
		}

		const emitToAll = (...args) => {
			opponent.emit(...args);
			socket.emit(...args);
		}

		const setPick = (char, nextChar, location) => {
			if (currentPlayer != char || board[location] != '') return;

			board[location] = char;

			emitToAll('picked', char, location);

			let winner = getWinner();
			if (winner) {
				currentPlayer = '';
				emitToAll('winner', winner);
				return;
			}

			let tie = isTie();
			if (tie) {
				currentPlayer = '';
				emitToAll('tied');
				return;
			}

			currentPlayer = nextChar;
		}

		opponent.on('picked', location => {
			setPick('X', 'O', location);
		});

		socket.on('picked', location => {
			setPick('O', 'X', location);
		});

		opponent.on('disconnect', () => {
			if (currentPlayer == '') return;
			currentPlayer = '';
			socket.emit('winner', 'O');
		});

		socket.on('disconnect', () => {
			if (currentPlayer == '') return;
			currentPlayer = '';
			opponent.emit('winner', 'X');
		});
	}
});

const port = process.env.PORT || 3000;
http.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
