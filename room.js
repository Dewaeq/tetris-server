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
     * @param {User[]} users 
     * @param {Number} maxLength 
     * @param {Boolean} started 
     */
    constructor(code, users = [], maxLength = 2, started = false) {
        this.code = code;
        this.users = users;
        this.maxLength = maxLength;
        this.started = started;
    }

    start() {
        const currentShapeId = rand();
        const nextShapeId = rand();
        const allUsers = this.usersJson();

        for (const user of this.users) {
            user.socket.emit("start", {
                starterId: this.users[0].socket.id,
                currentShapeId: currentShapeId,
                nextShapeId: nextShapeId,
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

        this.users.push(new User(socket, userName));

        socket.on("update", (update) => {
            this.emitAll("update", update, [socket.id]);
        });

        socket.on("disconnect", () => {
            this.removeUser(socket);
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

    
    toJson() {
        return {
            code: this.code,
            users: this.usersJson(),
            maxLength: this.maxLength,
            started: this.started,
        }
    }

    usersJson() {
        return this.users.map(u => u.toJson());
    }
}

module.exports = Room;

const rand = () => Math.floor(Math.random() * 7);