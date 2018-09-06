export class MQTTChat {

    /*
    Constructs a new MQTTChat object.
    */
    constructor(host, port, resource, clientID, initGroup) {
        this.clientID = clientID;
        this.group = initGroup;
        this.baseTopic = "chat/onboard/bus/";
        this.client = new Paho.MQTT.Client(host, port, resource, clientID);
        this.client.onConnectionLost = MQTTChat.onConnectionLost;
        this.setEventHandlers = this.setEventHandlers.bind(this);
        this.connect = this.connect.bind(this);
        this.onConnect = this.onConnect.bind(this);
        this.changeGroup = this.changeGroup.bind(this);
        this.statusMessage = this.statusMessage.bind(this);
        this.handleNewMessage = this.handleNewMessage.bind(this);
    }

    /*
    Connects the client to the MQTT broker with an LWT message of "offline"
    to be sent when the goes offline or closes the chat.
    */
    connect() {
        const offlineMsg = this.statusMessage("offline", true);
        this.client.connect({
            onSuccess: this.onConnect,
            onFailure: MQTTChat.failureHandler,
            keepAliveInterval: 10,
            reconnect: true,
            cleanSession: true,
            willMessage: offlineMsg,
            useSSL: true
        });
    }

    /*
    Creates and returns a Paho.MQTT.Message object representing a status message to
    be published to the correct topic on broker that keeps track of which clients are
    online. The payload parameter must be one of two values: "online" or "offline".
    */
    statusMessage(payload, retained) {
        const willMsg = new Paho.MQTT.Message(payload);
        willMsg.destinationName = "bus-onboard/clients/" + this.group + "/" + this.clientID;
        willMsg.retained = retained;
        willMsg.qos = 1;
        return willMsg;
    }

    /*
    Static method that is called anytime a client loses the connection with the broker.
    */
    static onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost: " + responseObject.errorMessage);
          }
    }

    /*
    Method that is called immediately after the client establishes a successful connection
    with the broker. This method subscribes to the corect chat and client status groups,
    and sends a retained status message of "online" to be sent to all current and future
    subscribers of the same group.
    */
    onConnect() {
        console.log("onConnect");
        this.client.subscribe(this.baseTopic + this.group);
        this.client.send(this.statusMessage("online", true));
        this.client.subscribe("bus-onboard/clients/" + this.group + "/+");
        this.client.onMessageArrived = this.handleNewMessage;
    }

    /*
    This method is called when a failure occurs when connection the client to the broker.
    It simply throws an error representing a failure to connect to the server.
    */
    static failureHandler() {
        throw new Error("Failed to connect to the server.");
    }

    /*
    Sets the functions that will be called when an incoming message arrives from the
    broker. This function is used in order for the view to be able to update everytime
    a message a new message is received. The msgHandler represents the function to be
    called when a text message arrives and statusHandler represents the function to be
    called everytime a status message arrives (i.e., client changes from being "online"
    to being "offline" and vice versa).
    */
    setEventHandlers(msgHandler, statusHandler) {
        this.msgHandler = msgHandler;
        this.statusHandler = statusHandler;
    }

    /*
    If the new group is differnt from the old one, this method changes the chat group
    by unsubscribing from the previous one, subscribing to the new group, and updating
    the group property.
    */
    changeGroup(topic) {
        if (this.group !== topic) {
            console.log("Unsubscribing previous topic: " + this.group);
            this.client.unsubscribe(this.baseTopic + this.group);
            this.group = topic;
            this.client.subscribe(this.baseTopic + this.group);
            console.log("Successfully changed groups: " + topic);
        }
    }

    /*
    Creates and returns a new Paho.MQTT.Message object. The payload is encoded in JSON,
    with values representing both the name of the sender and the message body.
    */
    createMessage(nickname, msgText, destination, qos=1, retained=false, duplicate=false) {
        const msg = new Paho.MQTT.Message(MQTTChat.formatMsg(nickname, msgText));
        msg.destinationName = destination;
        msg.qos = qos;
        msg.retained = retained;
        msg.duplicate = duplicate;
        return msg;
    }

    /*
    Sends a Paho.MQTT.Message object passed in as an argument.
    */
    sendMessage(msg) {
        this.client.send(msg);
        console.log("MESSAGE SENT");
    }

    /*
    Handles an incoming message sent from the broker by called to appropriate
    handler depending on whether it is a staus message or a text message.
    */
    handleNewMessage(message) {
        const payload = message.payloadString;
        if (payload == "online" || payload == "offline") {
            const { name, status } = MQTTChat.retrieveStatus(message);
            this.statusHandler(name, status);
        } else {
            const msgPayload = JSON.parse(payload);
            this.msgHandler(msgPayload);
        }
    }

    /*
    Gracefully disconnects the client from the MQTT broker.
    */
    disconnect() {
        this.client.disconnect();
    }

    /*
    Retrieves a status message by pulling out and returning the
    name of the sender (found by parsing the topic path) and
    the status (either online or offline).
    */
    static retrieveStatus(message) {
        const status = message.payloadString;
        const name = message.destinationName.substr(44);
        return { name, status }
    }

    /*
    Formats a text message for sending by creating and returning
    a string of a new JSON object with fields for the name and message
    body.
    */
    static formatMsg(nickname, msgText) {
        const msgObj = {"nickname": nickname, "msgText": msgText};
        return JSON.stringify(msgObj);
    }
}
