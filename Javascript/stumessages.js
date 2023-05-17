// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyAfYj2tWB98L7wnzWRv0bFZcW1ppSgxk34",
    authDomain: "studiopick-f6c1f.firebaseapp.com",
    databaseURL: "https://studiopick-f6c1f-default-rtdb.firebaseio.com",
    projectId: "studiopick-f6c1f",
    storageBucket: "studiopick-f6c1f.appspot.com",
    messagingSenderId: "230075033063",
    appId: "1:230075033063:web:3c56a39ea1a84f6f39c942",
    measurementId: "G-9Y07XDWV0W",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Set persistence to session
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);

// Initialize variables
const firestore = firebase.firestore();
const artistUserDb = firestore.collection("/studiopick/artists/users");
const studioUserDb = firestore.collection("/studiopick/studios/users");
const studioDb = firestore.collection("/studiopick/studios/studios");
const stuChats = firestore.collection("/studiopick/studios/chatrooms");
const artChats = firestore.collection("/studiopick/artists/chatrooms");

function loadingScreen() {
    var loadingText = document.getElementById("loading-text");
    loadingText.innerText = "Loading messages. Please wait...";
    var delay = 2300;

    setInterval(() => {
        loadingText.innerText = "Loading messages. Please wait...";
        setInterval(() => {
            loadingText.innerText = "Loading messages. Please wait...";
            setInterval(() => {
                loadingText.innerText = "Loading messages. Please wait...";
                setInterval(() => {
                    loadingText.parentElement.style.display = "none";
                }, delay);
            }, delay);
        }, delay);
    }, delay);
}



document.addEventListener("DOMContentLoaded", () => {
    loadingScreen();



});


const auth = firebase.auth();

//const auth = getAuth();
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        await readData();
        await readStuMessages();
        // ...
    } else {
        window.location.href = "login.html?error";
        alert("No active user please sign or sign up.");
    }
});

let activeChatroomId = null;
let messagesListener = null;

//This reads user data
async function readData() {
    const user = firebase.auth().currentUser;

    //Basic Profile Info
    studioUserDb
        .doc(user.uid)
        .get()
        .then((doc) => {
            if (doc.exists) {


                document.getElementById("userType").innerText = doc.data().role;
                document.getElementById("profile-name").innerText =
                    doc.data().studioName;

                document
                    .getElementById("profileImg")
                    .setAttribute(
                        "src",
                        doc.data().profileImage || "./assets/avatar.jpg"
                    );

                // Set the links based on the user type
                document.getElementById("dashboard-link").href = "studiodash.html";
                document.getElementById("messages-link").href = "stumessages.html";
            }
        })

    artistUserDb
        .doc(user.uid)
        .get()
        .then((doc) => {
            if (doc.exists) {
                console.log("user doc data ===", doc.data());

                document.getElementById("userType").innerText = doc.data().role;
                document.getElementById("profile-name").innerText =
                    doc.data().artistName;

                document
                    .getElementById("profileImg")
                    .setAttribute(
                        "src",
                        doc.data().profileImage || "./assets/avatar.jpg"
                    );

                // Set the links based on the user type
                document.getElementById("dashboard-link").href = "artistdash.html";
                document.getElementById("messages-link").href = "artmessages.html";
            }
        });

}


// This reads studio messages
async function readStuMessages() {
    try {
        const user = firebase.auth().currentUser;

        // Fetch studioId from studioDb
        const studioQuery = await studioDb.where("uid", "==", user.uid).get();
        if (studioQuery.empty) {
            console.log("No studio found for the current user.");
            return;
        }

        const studioDoc = studioQuery.docs[0]; // Get the first matched document
        const currentStudioId = studioDoc.id; // Use the document ID as the studioId

        // Fetch all chatrooms
        const allChatRoomsSnapshot = await stuChats.get();

        let chatStr = "";
        allChatRoomsSnapshot.forEach(async (doc) => {
            const chatroom = doc.data();

            if (chatroom.studioId === currentStudioId) {
                const chatroomId = doc.id;

                // Find the artistId from the members array
                const artistMember = chatroom.members.find(
                    (member) => member.role === "artist"
                );
                const artistId = artistMember ? artistMember.id : null;

                let artistName = "Unknown Artist";
                let profilePictureURL = "";

                if (artistId) {
                    // Fetch the artist name and profile picture based on the artistId
                    const artistSnapshot = await artistUserDb.doc(artistId).get();
                    const artistData = artistSnapshot.data();
                    artistName = artistData ? artistData.artistName : "Unknown Artist";
                    profilePictureURL = artistData ? artistData.profileImage : "";
                }

                // Fetch the last sent message and timestamp
                const lastMessageSnapshot = await stuChats
                    .doc(chatroomId)
                    .collection("messages")
                    .orderBy("timestamp", "desc")
                    .limit(1)
                    .get();
                const lastMessageData = lastMessageSnapshot.docs[0]?.data();
                const lastMessage = lastMessageData?.message || "No messages yet";
                const lastMessageTimestamp = lastMessageData?.timestamp;

                // Format the timestamp
                let formattedTime = "";
                let formattedDate = "";
                if (lastMessageTimestamp) {
                    const timestampDate = lastMessageTimestamp.toDate();
                    const timeFormatter = new Intl.DateTimeFormat("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true, // or false, depending on whether you want 12-hour or 24-hour format
                    });
                    const dateFormatter = new Intl.DateTimeFormat("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "2-digit",
                    });
                    formattedTime = timeFormatter.format(timestampDate);
                    formattedDate = dateFormatter.format(timestampDate);
                }

                // Fetch the number of unread messages
                const unreadMessagesSnapshot = await stuChats
                    .doc(chatroomId)
                    .collection("messages")
                    .where("status", "==", "unread")
                    .where("recipientId", "==", currentStudioId)
                    .get();

                const unreadMessageCount = unreadMessagesSnapshot.size;
 

                if (unreadMessageCount > 0) {
    
                }

                const chatroomElement = document.getElementById(`chatroom-${chatroomId}`);
                if (chatroomElement) {
                    chatroomElement.querySelector(".unread-badge").style.display = unreadMessageCount > 0 ? "block" : "none";
                }

                chatStr += `
                <div class="discussion" data-id="${chatroomId}" id="chatroom-${chatroomId}">
                <span class="unread-badge" style="display: ${unreadMessageCount > 0 ? "block" : "none"} !important;"></span>
                <div class="photo" style="background-image: url(${profilePictureURL}); background-size: contain;">
                    <div class="online"></div>
                </div>
                <div class="desc-contact">
                    <p class="name">${artistName}</p>
                    <p class="message">${lastMessage}</p>
                    <p class="date">${formattedDate}</p>
                    <p class="time">${formattedTime}</p>
                </div>
                </div>
                `;


                // Clear the previous chat room HTML
                document.getElementById("chatRooms").innerHTML = "";

                // Add the new chat room HTML
                document.getElementById("chatRooms").innerHTML = chatStr;

            }
        });



    } catch (error) {

    }
}

document.addEventListener('DOMContentLoaded', () => {
    readStuMessages();
});



// Display messages for selected chatroom only
document.addEventListener("click", async function (event) {
    const discussionElement = event.target.closest(".discussion");
    if (discussionElement) {
        activeChatroomId = discussionElement.getAttribute("data-id");
        await displayChatroomMessages(activeChatroomId);

        const chatRoomSnapshot = await stuChats.doc(activeChatroomId).get();
        const chatRoomData = chatRoomSnapshot.data();

    }


});


async function displayChatroomMessages(chatroomId) {
    try {
        const messageWindow = document.getElementById("messageWindow");
        messageWindow.innerHTML = "";

        const scrollToBottom = () => {
            messageWindow.scrollTop = messageWindow.scrollHeight;
        };

        if (messagesListener) {
            messagesListener();
        }

        if (chatroomId) {
            const messagesQuery = stuChats.doc(chatroomId).collection("messages").orderBy("timestamp", "asc");

            messagesListener = messagesQuery.onSnapshot((querySnapshot) => {
                querySnapshot.docChanges().forEach(async (change) => {
                    if (change.type === "added") {
                        // Display the message
                        const messageData = change.doc.data();
                        const message = document.createElement("div");
                        message.classList.add("message");

                        if (messageData.senderId === firebase.auth().currentUser.uid) {
                            message.classList.add("outgoing");
                            message.innerHTML = `
                            <p>${messageData.message}</p>
                            <span class="timestamp">${messageData.timestamp ? messageData.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                            `;
                        } else {
                            message.classList.add("incoming");

                            message.innerHTML = `
                            <p>${messageData.message}</p>
                            <span class="timestamp">${messageData.timestamp ? messageData.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                            `;
                        }

                        messageWindow.appendChild(message);
                        scrollToBottom();
                    }

                });

                markMessagesAsRead(chatroomId, firebase.auth().currentUser);
            });

        }
    } catch (error) {
        console.error("Error displaying messages:", error);
    }
}

//Mark Message As Read
async function markMessagesAsRead(chatroomId, user) {
    try {
        // Fetch studioId from studioDb
        const studioQuery = await studioDb.where("uid", "==", user.uid).get();
        if (studioQuery.empty) {
            console.log("No studio found for the current user.");
            return;
        }

        const studioDoc = studioQuery.docs[0]; // Get the first matched document
        const currentStudioId = studioDoc.id; // Use the document ID as the studioId

        const unreadMessagesSnapshot = await stuChats
            .doc(chatroomId)
            .collection("messages")
            .where("status", "==", "unread")
            .where("recipientId", "==", currentStudioId)
            .get();

        const batch = firestore.batch();

        unreadMessagesSnapshot.docs.forEach((doc) => {
            const messageRef = stuChats.doc(chatroomId).collection("messages").doc(doc.id);
            batch.update(messageRef, { status: "read" });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error updating message status:", error);
    }
}


//Highlight Selected Chat
function highlightSelectedChatroom(chatroomId) {
    const chatRooms = document.querySelectorAll(".discussion");

    chatRooms.forEach((chatRoom) => {
        if (chatRoom.getAttribute("data-id") === chatroomId) {
            chatRoom.classList.add("selected");
        } else {
            chatRoom.classList.remove("selected");
        }
    });
}

document.addEventListener("click", async function (event) {
    const discussionElement = event.target.closest(".discussion");
    if (discussionElement) {
        activeChatroomId = discussionElement.getAttribute("data-id");
        await displayChatroomMessages(activeChatroomId);
        highlightSelectedChatroom(activeChatroomId);

        const chatRoomSnapshot = await artChats.doc(activeChatroomId).get();
        const chatRoomData = chatRoomSnapshot.data();

        console.log("selected Chat Room Data:", chatRoomData);
    }
});



// Messaging Function
document.querySelector(".send-message").addEventListener("click", async function () {
    try {
        const messageInput = document.querySelector(".write-message");
        const message = messageInput.value.trim();

        if (message === "") {
            return;
        }

        const user = firebase.auth().currentUser;
        const senderId = user.uid;

        // Get reference to the chatroom for the current user
        const chatroomId = activeChatroomId;

        if (!chatroomId) {
            console.error("Chat room ID is null.");
            return;
        }

        // Get the chatroom data
        const chatroomSnapshot = await stuChats.doc(chatroomId).get();
        const chatroomData = chatroomSnapshot.data();

        console.log('chatroomSnapshot:', chatroomSnapshot);
        console.log('chatroomData:', chatroomData);

        // Get the recipient ID based on the current user's ID and the chatroom members
        if (!chatroomData || !chatroomData.members) {
            console.error("Chat room data or members is missing.");
            return;
        }

        const recipientId = chatroomData.members.find(member => member.id !== senderId)?.id;
        const senderRole = chatroomData.members.find(member => member.id === senderId)?.role || 'unknown';
        const recipientRole = chatroomData.members.find(member => member.id === recipientId)?.role || 'unknown';

        if (!recipientId) {
            console.error("Recipient ID is not found.");
            return;
        }

        const senderChatroomRef = senderRole === "artist" ? artChats.doc(chatroomId) : stuChats.doc(chatroomId);
        const recipientChatroomRef = recipientRole === "artist" ? artChats.doc(chatroomId) : stuChats.doc(chatroomId);

        // Create message data object
        const messageData = {
            message: message,
            senderId: senderId,
            recipientId: recipientId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: "unread" // Set the status to unread when the message is created
        };


        // Add message data to the chatroom's messages subcollection for sender and recipient
        const senderMessageRef = await senderChatroomRef.collection("messages").add(messageData);
        const recipientMessageRef = await recipientChatroomRef.collection("messages").add(messageData);

        // Clear message input field
        messageInput.value = "";

        // Update the UI with the new message
        await displayChatroomMessages(activeChatroomId);

        // Scroll to bottom of message window
        const messageWindow = document.getElementById("messageWindow");
        messageWindow.scrollTop = messageWindow.scrollHeight;

    } catch (error) {
        console.error("Error sending message:", error);
    }
});



