var WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090 
var wss = new WebSocketServer({ port: 9090 });
var users = {};
//when a user connects to our sever 
wss.on('connection', function(connection) {
    console.log("user connected");
    //when server gets a message from a connected user 
    connection.on('message', function(message) {
        console.log("Got message from a user:", message);
        var data;
        //accepting only JSON messages 
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }


        //switching type of the user message
        switch (data.type) {
            //when a user tries to login
            case "login":
                console.log("User logged:", data.name);
                console.log("Adding user : "+data.name + " to users :" + users);
                //if anyone is logged in with this username then refuse 
                if (users[data.name]) {
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                } else {
                    //save user connection on the server 
                    users[data.name] = connection;
                     console.log("Added user : "+data.name + " to users :" + users);
                    connection.name = data.name;
                    sendTo(connection, {
                        type: "login",
                        success: true
                    });

                }
                break;

            case "offer":
                //for ex. UserA wants to call UserB 
                console.log("Sending offer to: ", data.name); //if UserB exists then send him offer details 
                var conn = users[data.name];
                if (conn != null) {
                    //setting that UserA connected with UserB 
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "offer",
                        success: true,
                        offer: data.offer,
                        name: connection.name
                    });
                } else {
                    console.log("failed to find user : "+data.name + " in :" + users);
                    sendTo(connection, {
                        type: "offer",
                        success: false
                    });
                }
                break;

            case "answer":
                console.log("Sending answer to: ", data.name);
                //for ex. UserB answers UserA
                var conn = users[data.name];
                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }
                break;

            case "candidate":
                console.log("Sending candidate to:", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }
                break;

            case "leave":
                console.log("Disconnecting from", data.name);
                var conn = users[data.name];
                //notify the other user so he can disconnect his peer connection 
                if (conn != null) {
                    conn.otherName = null;
                    sendTo(conn, {
                        type: "leave"
                    });
                }
                break;

            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command no found: " + data.type
                });
                break;
        }
    });


    connection.on("close", function() {
        if (connection.name) {
            delete users[connection.name];
            if (connection.otherName) {
                console.log("Disconnecting from ", connection.otherName);
                var conn = users[connection.otherName];
                conn.otherName = null;
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
            }
        }
    });

    connection.send("Hello from server");
});

function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}
