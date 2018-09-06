import { MQTTChatView } from "./MQTTChatView.js";

/*
TODO:
    * Investigate how to send images and other media/file formats.
    * Investigate how to store conversations, so that when a new user subscribers,
    * he or she can see what was previously sent.
*/

(function() {
    // Get the modal
    const configModal = document.getElementById('configModal');
    // Get the button that opens the modal
    const configBtn = document.getElementById("config-btn");
    // Get the <span> element that closes the modal
    const configSpan = document.getElementById("configClose");
    
    // When the user clicks the button, open the modal 
    configBtn.onclick = function() {
        configModal.style.display = "block";
    }
    
    // When the user clicks on <span> (x), close the modal
    configSpan.onclick = function() {
        configModal.style.display = "none";
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == configModal) {
            configModal.style.display = "none";
        } else if (event.target == onlineModal) {
            onlineModal.style.display = "none";
        }
    }

    // Set the display for the modal showing the current online users
    // for the subscribed group.
    const onlineModal = document.getElementById("onlineModal");
    const onlineBtn = document.getElementById("online-btn");
    const onlineSpan = document.getElementById("onlineClose");
    onlineBtn.onclick = () => { onlineModal.style.display = "block" };
    onlineSpan.onclick = () => { onlineModal.style.display = "none" };

    // Allow message to be sent by pressing the enter key (to escape, use alt+enter)
    const input = document.getElementById("msg-text");
    input.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            if (!event.altKey) {
                event.preventDefault();
                document.getElementById("send-btn").click();
            } else {
                input.value += "\r\n";
            }
        }
    });

    // Create a new MQTT chat instance and add event listeners
    // for buttons.
    const newChat = new MQTTChatView();
    const configButton = document.getElementById("submit-config");
    configButton.onclick = newChat.configure;
    const sendButton = document.getElementById("send-btn");
    sendButton.onclick = newChat.sendMessage;
})();
