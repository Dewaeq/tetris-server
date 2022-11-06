const { Socket } = require("socket.io");

class User {
    /**
     * @param {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} socket 
     * @param {String} userName 
     * @param {Number} score 
     */
    constructor(socket, userName, score = 0) {
        this.socket = socket;
        this.userName = userName;
        this.score = score;
    }

    toJson() {
        return {
            id: this.socket.id,
            score: this.score,
            userName: this.userName,
        }
    }
}

class Room {
    /**
     * @param {Number} code 
     * @param {String} hostId 
     * @param {Number} maxSize 
     * @param {User[]} users 
     * @param {Boolean} started 
     */
    constructor(code, hostId, maxSize = 50, users = [], started = false) {
        this.code = code;
        this.hostId = hostId;
        this.maxLength = maxSize;
        this.users = users;
        this.started = started;
    }

    start() {
        const bag = getBag();
        const nextBag = getBag();
        const allUsers = this.usersJson();

        for (const user of this.users) {
            user.socket.emit("start", {
                starterId: this.users[0].socket.id,
                bag: bag,
                nextBag: nextBag,
                allUsers: allUsers,
            });
        }
        this.started = true;
    }

    stop() {
        this.started = false;
    }

    reset() {
        this.users = [];
        this.hostId = null;
        this.stop();
    }

    /**
     * Add a user to this room and add the required listeners
     * 
     * @param {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} socket 
     * @param {String} userName
     * @returns {Boolean} succes
     */
    addUser(socket, userName) {
        if (this.isFull()) {
            console.log(`Can't add user ${socket.id} to room ${this.code}, room is already full!`);
            return false;
        }

        const user = new User(socket, userName);
        this.users.push(user);
        this.emitAll("userJoined", user.toJson());

        socket.on("start", () => {
            if (socket.id !== this.hostId) {
                console.error("only host can start the game!");
                return;
            }

            this.start();
        });

        socket.on("update", (update) => {
            this.emitAll("update", update, [socket.id]);
        });

        socket.on("disconnect", () => {
            this.removeUser(socket);
            delete this;
        });

        return true;
    }

    /**
     * Remove a user from this room and close it
     * 
     * @param {*} socket 
     */
    removeUser(socket) {
        this.emitAll("leave", this.usersJson());
        this.reset();
    }

    /**
     * Broadcast a message to every member,
     * except those whose id is listed in `exclude`
     * 
     * @param {String} message 
     * @param {any} data 
     * @param {String[]} exclude Possible list of users to exclude in broadcast
     */
    emitAll(message, data, exclude = []) {
        for (const user of this.users) {
            if (!exclude.includes(user.socket.id)) {
                user.socket.emit(message, data);
            }
        }
    }

    isFull() {
        return this.users.length >= this.maxLength;
    }

    isEmpty() {
        return this.users.length === 0;
    }

    toJson() {
        return {
            code: this.code,
            users: this.usersJson(),
            maxLength: this.maxLength,
            started: this.started,
            hostId: this.hostId,
        }
    }

    usersJson() {
        return this.users.map(u => u.toJson());
    }
}

module.exports = Room;

const getBag = () => {
    const bag = [0, 1, 2, 3, 4, 5, 6];
    let currentIndex = bag.length;

    while (currentIndex != 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [bag[currentIndex], bag[randomIndex]] = [bag[randomIndex], bag[currentIndex]];
    }

    return bag;
}