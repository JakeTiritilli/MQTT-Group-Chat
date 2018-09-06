import { MQTTChat } from "./MQTTChat.js";

export class MQTTChatView {

  /*
  Constructs a new MQTTChatView object.
  */
  constructor() {
    this.pullConfigData = this.pullConfigData.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.displayMessage = this.displayMessage.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.receiveStatus = this.receiveStatus.bind(this);
    this.initChat = this.initChat.bind(this);
    this.configure = this.configure.bind(this);
    this.disconnectChat = this.disconnectChat.bind(this);
    this.updateStatusDisplay = this.updateStatusDisplay.bind(this);

    this.onlineList = new Set();
    this.baseTopic = "chat/onboard/bus/";
  }

  /*
  Pulls and returns that selection by the user in the configuration modal,
  consisting of a nickname (text input) and a group/bus line number (dropdown selection).
  */
  pullConfigData() {
    const nickname = document.getElementById("nick").value;
    const selectElement = document.getElementById("bus-lines");
    const groupSelection = selectElement.options[selectElement.selectedIndex].value;
    return { nickname, groupSelection };
  }

  /*
  Initializes a new MQTTChat instance, sets handlers for receiving messages, and updates
  the status display of online users. If there was already a previous MQTTChat instance
  created, then it is disconnected from the server after sending a retained message of
  "offline" to its previous group.
  */
  initChat() {
    if (typeof this.mqttChat != "undefined") {
      const status = this.mqttChat.statusMessage("offline", true);
      this.mqttChat.sendMessage(status);
      this.mqttChat.disconnect();
    }
    console.log("Creating new connection");
    this.mqttChat = new MQTTChat("iot.eclipse.org", Number(443), "/ws", "client-94068-nick-" + this.nickname, this.groupSelection);
    this.mqttChat.setEventHandlers(this.receiveMessage, this.receiveStatus);
    this.mqttChat.connect();
    this.onlineList.clear();
    this.updateStatusDisplay();
  }

  /*
  Handler to receive incoming messages sent from the server. This handler is called when a text message is sent with
  a name and a payload (i.e., not a status messages that has only two forms: "offline" or "online").
  */
  receiveMessage(msgPayload) {
    if (msgPayload.nickname != this.nickname) {
      this.displayMessage(msgPayload.msgText, "received", msgPayload.nickname)
    }
  }

  /*
  Handler to receive incoming status message sent from the server. These messages represent when a client has gone
  from being online to offline and vice verse. This method updates both the internal set of online users and the
  page displaying the online users to the client.
  */
  receiveStatus(name, status) {
    if (name != this.nickname) {
      if (!this.onlineList.has(name) && status == "online") {
        this.onlineList.add(name);
        this.updateStatusDisplay();
      } else if (this.onlineList.has(name) && status == "offline") {
        this.onlineList.delete(name);
        this.updateStatusDisplay();
      }
    }
  }

  /*
  Updates the display showing which users are currenly online in the given group
  that the client is subscribed to, by creating new list elements for each of the people
  in the onlineList set.
  */
  updateStatusDisplay() {
    const onlineView = document.getElementById("statusList");
    onlineView.innerHTML = "";
    for (name of this.onlineList) {
      const nameItem = document.createElement("LI");
      nameItem.appendChild(document.createTextNode(name));
      nameItem.classList.add("online-name");
      onlineView.appendChild(nameItem);
    }
  }

  /*
  Configures a new chat group instance. This method is called every time that the chat is configured
  or reconfigured (i.e., by the user opening up the configuration modal and pressing the "done" button).
  If the group selection was changed, then the previous messages are cleared and a new chat instance is
  created with the new group.
  */
  configure() {
    const { nickname, groupSelection } = this.pullConfigData();
    this.nickname = nickname;

    if (this.nickname === "") {
      alert("You must enter a nickname to use the chat.");
      return;
    }
    
    if (groupSelection !== this.groupSelection) {
      console.log("Chnaging to group: " + groupSelection);
      this.groupSelection = groupSelection;
      this.initChat();
      this.mqttChat.changeGroup(this.groupSelection);
      document.getElementById('configModal').style.display = "none";
      document.getElementById("msg-text").disabled = false;
      document.getElementById("msg-view").innerHTML = "";
      const groupBanner = document.getElementById("group-name");
      groupBanner.innerHTML = "<b>Connected to group:</b> " + this.groupSelection;
      groupBanner.style.display = "block";
    }
  }

  /*
  Sends a message typed into the message box when the "send" button is pressed.
  The name of the sender, along with the message text and the destination path are
  sent.
  */
  sendMessage() {
    let msgText = document.getElementById("msg-text").value;
    if (msgText !== "") {
      this.displayMessage(msgText, "sent", this.nickname);
      const msg = this.mqttChat.createMessage(this.nickname, msgText, this.baseTopic + this.groupSelection);
      this.mqttChat.sendMessage(msg);
      document.getElementById("msg-text").value = "";
    }
  }

  /*
  Displays a given message to the screen by adding a new text bubble. Blue bubbles
  represent sent messages and gray bubbles represent received messages. The sender
  class parameter must take an argument with value of either "sent" or "received".
  */
  displayMessage(msgText, senderClass, nickname) {
    const msg = document.createElement("DIV");
    msg.classList.add("message", senderClass);
    const text = document.createElement("P");
    text.appendChild(document.createTextNode(msgText));
    msg.appendChild(text);
    const name = document.createElement("SPAN");
    name.innerHTML = nickname;
    name.classList.add("msg-name");
    msg.appendChild(name);
    const msgBox = document.getElementById("msg-view");
    msgBox.appendChild(msg);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  /*
  Gracefully disconnects the client from the MQTT server.
  */
  disconnectChat() {
    alert("Disconnecting");
    this.mqttChat.disconnect();
  }
}
