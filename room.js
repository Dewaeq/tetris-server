const { Socket } = require("socket.io");

class User {
    /**
     * 
     * @param {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} socket 
     * @param {String} userName 
     * @param {Number} score 
     */
    constructor(socket, userName, score = 0) {
        this.socket = socket;
        this.userName = userName;
        this.score = score;
    }
}

class Room {
    constructor(code, users = [], maxLength = 2, started = false) {
        this.code = code;
        /**@type {User[]} */
        this.users = users;
        this.maxLength = maxLength;
    }

    /**
     * @param {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} socket 
     * @param {String} userName
     * @returns 
     */
    addUser(socket, userName) {
        if (this.users.length >= this.maxLength) {
            console.log(`Can't add user ${socket.id} to room ${this.code}, room is already full!`);
            return false;
        }

        this.users.push(new User(socket, userName));

        socket.on("update", (update) => {
            console.log(`${socket.id} sent an update`);

            this.emitAll("update", update, [socket.id]);
        });

        socket.on("disconnect", () => {
            this.removeUser(socket);
        });

        return true;
    }

    removeUser(socket) {
        this.emitAll("leave", this.usersJson());
        this.reset();
    }

    /**
     * 
     * @param {String} message 
     * @param {} data 
     * @param {String[]} exclude Possible list of users to exclude in broadcast
     */
    emitAll(message, data, exclude = []) {
        for (const user of this.users) {
            if (!exclude.includes(user.socket.id)) {
                user.socket.emit(message, data);
            }
        }
    }

    full() {
        return this.users.length === this.maxLength;
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

    toJson() {
        return {
            code: this.code,
            users: this.usersJson(),
            maxLength: this.maxLength,
            started: this.started,
        }
    }

    usersJson() {
        return this.users.map(u => ({
            id: u.socket.id,
            score: u.score,
            userName: u.userName,
        }));
    }
}

module.exports = Room;

const rand = () => Math.floor(Math.random() * 7);