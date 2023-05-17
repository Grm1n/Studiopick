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


const auth = firebase.auth();

//const auth = getAuth();
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await readData();
    await readArtMessages();
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
        console.log("user doc data ===", doc.data());

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

// This reads artist messages
async function readArtMessages() {
  try {
    const user = firebase.auth().currentUser;

    // Display chat rooms for artists only
    const chatRoomsSnapshot = await artChats.where("artistId", "==", user.uid).get();

    let chatStr = "";
    for (const doc of chatRoomsSnapshot.docs) {


      const chatroom = doc.data();
      const chatroomId = doc.id;

      // Find the studioId from the members array
      const studioMember = chatroom.members.find(member => member.role === "studio");
      const studioId = studioMember ? studioMember.id : null;



      let studioName = "Unknown Studio";
      let studioProfileImage = '';
      if (studioId) {
        // Fetch the studio name based on the studioId
        const studioSnapshot = await studioDb.doc(studioId).get();
        const studioData = studioSnapshot.data();
        studioName = studioData ? studioData.studioName : '';
        studioProfileImage = studioData ? studioData.profileImage : '';
      }



      // Fetch the last sent message
      const lastMessageSnapshot = await artChats
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
          hour12: true,
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
      const unreadMessagesSnapshot = await artChats
        .doc(chatroomId)
        .collection("messages")
        .where("status", "==", "unread")
        .where("recipientId", "==", user.uid)
        .get();

      const unreadMessageCount = unreadMessagesSnapshot.size;

      const unreadBadge = unreadMessageCount > 0 ? '<span class="unread-badge"></span>' : "";

      if (unreadMessageCount > 0) {

      }


      chatStr += `
        <div class="discussion" data-id="${chatroomId}">
        ${unreadBadge}
          <div class="photo">
            <img src="${studioProfileImage}" alt="Studio Profile Image">
          </div>
          <div class="desc-contact">
            <p class="name">${studioName}</p>
            <p class="message">${lastMessage}</p>
            <p class="date">${formattedDate}</p>
            <p class="time">${formattedTime}</p>
          </div>
        </div>
      `;
    }

    // Clear the previous chat room HTML
    document.getElementById("chatRooms").innerHTML = "";

    // Add the new chat room HTML
    document.getElementById("chatRooms").innerHTML = chatStr;
  } catch (error) {
    console.log("read chats error ===", error);
  }
}



// Display messages for selected chatroom only
document.addEventListener("click", async function (event) {
  const discussionElement = event.target.closest(".discussion");
  if (discussionElement) {
    activeChatroomId = discussionElement.getAttribute("data-id");
    await displayChatroomMessages(activeChatroomId);

    const chatRoomSnapshot = await artChats.doc(activeChatroomId).get();
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
      const messagesQuery = artChats.doc(chatroomId).collection("messages").orderBy("timestamp");

      messagesListener = messagesQuery.onSnapshot((querySnapshot) => {
        querySnapshot.forEach(messageDoc => {
          const messageData = messageDoc.data();
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
        });

        markMessagesAsRead(chatroomId); // Mark messages as read
      });

    }
  } catch (error) {
    console.error("Error displaying messages:", error);
  }
}



//Mark Message As Read
async function markMessagesAsRead(chatroomId) {
  try {
    const unreadMessagesSnapshot = await artChats
      .doc(chatroomId)
      .collection("messages")
      .where("status", "==", "unread")
      .where("recipientId", "==", firebase.auth().currentUser.uid)
      .get();

    const batch = firestore.batch();

    unreadMessagesSnapshot.docs.forEach((doc) => {
      const messageRef = artChats.doc(chatroomId).collection("messages").doc(doc.id);
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
    const chatroomSnapshot = await artChats.doc(chatroomId).get();
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
      status: "unread", // Set the status to unread when the message is created
    };

    // Add message data to the chatroom's messages subcollection for sender and recipient
    const senderMessageRef = await senderChatroomRef.collection("messages").add(messageData);
    const recipientMessageRef = await recipientChatroomRef.collection("messages").add(messageData);

    // Clear message input field
    messageInput.value = "";

    // Scroll to bottom of message window
    const messageWindow = document.getElementById("messageWindow");
    messageWindow.scrollTop = messageWindow.scrollHeight;

  } catch (error) {
    console.error("Error sending message:", error);
  }
});