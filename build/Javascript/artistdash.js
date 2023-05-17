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
const userDb = firestore.collection("/studiopick/artists/users");
const sessionsDb = firestore.collection("/studiopick/artists/sessions");
const savedStudiosDb = firestore.collection("/studiopick/artists/savedStudios")
const artChats = firestore.collection("/studiopick/artists/chatrooms");
const studiosDb = firebase
  .firestore()
  .collection("/studiopick/studios/studios");


const auth = firebase.auth();

const newSession = document.querySelector(".session-info");
const upcomingSession = document.querySelector(".sessions");

const updateFirestore = firebase.functions().httpsCallable("updateFirestore");

//Authenticate User
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await readData();
    await displayAndManageUpcomingSessions(user);
    await displayPayHistory(user);

    // ...
  } else {
    window.location.href = "login.html?error";
    alert("No active user please sign or sign up.");
  }
});


//This reads user data
async function readData() {
  const user = firebase.auth().currentUser;



  //This reads the current and upcoming events
  sessionsDb
    .where("uid", "==", user.uid)
    .get()
    .then((querySnapshot) => {

      // Check if there are no sessions
      if (querySnapshot.empty) {
        newSession.innerHTML = `
      <div class="card-body">
        <h5 class="card-title text-muted" id="no-sessions"><strong>No Sessions Currently Happening.</strong></h5>
      </div>
    `;
      } else {
        // Handle the latest event
        querySnapshot.forEach((doc) => {
          // Get the first event
          const sessionData = doc.data()

          newSession.innerHTML = `
          <div class="card-body">
            <h5 class="card-title text-muted"><strong>Current Session</strong></h5>
            <div class="current-client">

              <h2 class="currentName">${sessionData.studioName}</h2>
              <h1 class="userTypeLabel text-muted">Studio</h1>

              <div class="currentImg">

                <img id="customerProfile" alt="" src="">

              </div>
            </div>
            
          
            <p class="current-date text-muted">Date:</p>
            <p class="todays-date">${sessionData.selectedDate}</p>
            <p class="current-service text-muted">Service:</p>
            <p class="todays-service">${sessionData.sessionType}</p>
            <p class="current-room text-muted">Room:</p>
            <p class="todays-room">${sessionData.roomName}</p>
            <p class="current-duration text-muted">Duration:</p>
            <p class="todays-duration">${sessionData.duration}</p>
            <p class="current-time-frame text-muted">Time Frame:</p>
            <p class="todays-time-frame">${sessionData.startTime} - ${sessionData.endTime}</p>
            <button class="rescheduleCurrent">Reschedule</button>
            <button class="cancelCurrent">Request Refund</button>
            
          </div>
  
      `;
        });
      }
    });

  // Display past transactions
  var transactionStr = "";
  var index = 0;

  sessionsDb
    .where("artistId", "==", user.uid)
    .orderBy("created", "asc")
    .get()
    .then((querySnapshot) => {
      // Handle the latest event
      querySnapshot.forEach((doc, index) => {
        const sessionData = doc.data();
        const status = sessionData.status;

        let statusStyle = "";
        if (status === "refunded") {
          statusStyle = 'color: #b00000;'; // Red color for refunded sessions
        } else if (status === "accepted") {
          statusStyle = 'color: #0ab11e;'; // Green color for accepted sessions
        } else {
          statusStyle = 'color: #ddd428;'; // Yellow color for pending sessions
        }

        const symbol = status === "accepted" ? "+" : (status === "refunded" ? "-" : "");

        transactionStr += `
        <div class="pending">
          <p class="pending-session-price" style="${statusStyle}">${symbol}$${sessionData.sessionPrice}</p>
          <p class="stripe text-muted">~ Stripe</p>
          <p class="pending-customer-name">${sessionData.artistName}</p>
        </div>
      `;
      });

      document.getElementById("past-transactions").innerHTML = transactionStr;
    })
    .catch((error) => {
      console.log("read past transactions error ===", error);
    });


  // Initialize messageBadge variable in global scope
  const messageBadge = document.createElement("span");
  messageBadge.classList.add("icon-badge");
  messageBadge.classList.add("message-badge");

  // Initially hide the messageBadge
  messageBadge.style.display = "none";
  // Append the badge to the profile icon
  document.querySelector(".action").appendChild(messageBadge);



  // Declare an async function to display the notification badge
  async function displayNotificationBadge() {
    try {
      // Query chatrooms the user is a member of
      const chatroomsSnapshot = await artChats
        .where("artistId", "==", user.uid)
        .get();



      let unreadMessagesCount = 0;

      // Iterate through chatrooms
      for (const chatroomDoc of chatroomsSnapshot.docs) {
        // Query for unread messages in the current chatroom
        const querySnapshot = await chatroomDoc.ref
          .collection("messages")
          .where("status", "==", "unread")
          .where("recipientId", "==", user.uid)
          .get();



        unreadMessagesCount += querySnapshot.size;
      }

      // If there are unread messages, display the badges
      if (unreadMessagesCount > 0) {


        // Update the icon badge
        messageBadge.style.display = "inline-block";
        messageBadge.innerText = unreadMessagesCount;

        // Update the message-link-badge
        const messageLinkBadge = document.querySelector(".message-link-badge");
        messageLinkBadge.style.display = "inline-block";
        messageLinkBadge.innerText = unreadMessagesCount;
      } else {

      }
    } catch (error) {
      console.log("Error checking for unread messages: ", error);
    }
  }

  // Call the async function to display the notification badge
  displayNotificationBadge();




  // Display recent messages
  (async () => {
    // Fetch all chatrooms
    const allChatRoomsSnapshot = await artChats.get();



    let chatStr = "";
    for (const doc of allChatRoomsSnapshot.docs) {
      const chatroom = doc.data();


      if (chatroom.artistId === user.uid) {

        const chatroomId = doc.id;

        // Find the studioId from the members array
        const studioMember = chatroom.members.find(
          (member) => member.role === "studio"
        );
        const studioId = studioMember ? studioMember.id : null;

        let studioName = "";

        if (studioId) {

          // Fetch the artist name and profile picture based on the studioId

          const studioSnapshot = await studiosDb.doc(studioId).get();
          const studioData = studioSnapshot.data();

          studioName = studioData ? studioData.studioName : "Unknown Artist";
        }

        // Fetch the last sent message and timestamp
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

        const message = `
                    <div class="notification-one">
                      <p class="person-one">${studioName}</p>
                      <p class="text-one">${lastMessage}</p>
                      <p class="date-occurred-one">${formattedDate}</p>
                      <p class="time-occurred-one">${formattedTime}</p>
                    </div>
                  `;

        // Add the message HTML to the messages array
        const messagesContainer = document.getElementById("messages");
        messagesContainer.innerHTML += message;
      }
    }
  })()
    .catch((error) => {
      console.log("Error getting chat messages: ", error);
    });


  //Display Saved Studios
  savedStudiosDb
    .get()
    .then(async (querySnapshot) => {
      const processStudio = async (doc, roomCardStr) => {
        const data = doc.data();
        const studioId = data.studioId;

        const studioDoc = await studiosDb.doc(studioId).get();
        const studioData = studioDoc.data();

        roomCardStr += `
      <div class="roomcard col-4" id="roomCard${index}" data-room-id="${doc.id}" style="background: url('${studioData.homeImageURL}'); background-size: cover;">
        <h2 class="roomName" id="roomName${index}">${studioData.studioName}</h2>
        <button type="button" class="roomEdit" id="roomEdit${index}" data-index="${index}" data-studio-id="${studioId}">View</button>
      </div>
    `;

        index++;

        return roomCardStr;
      };

      let roomCardStr = "";
      let index = 0;

      for (const doc of querySnapshot.docs) {
        roomCardStr = await processStudio(doc, roomCardStr);
      }

      document.getElementById("room").innerHTML = roomCardStr;

      // Add event listeners to the "View" buttons
      for (let i = 0; i < querySnapshot.size; i++) {
        const viewButton = document.getElementById(`roomEdit${i}`);
        const studioId = viewButton.getAttribute("data-studio-id");
        viewButton.addEventListener("click", () => viewStudio(studioId));
      }
    })
    .catch((error) => {
      console.log("read services error ===", error);
    });




  //Basic Profile Info
  await userDb
    .doc(user.uid)
    .get()
    .then((doc) => {
      if (doc.exists) {


        //Tab Five Pt. 1
        //Display Studio User Information
        document.getElementById("users-header").innerText = doc.data().artistName;
        document.getElementById("artistName").innerText = doc.data().artistName;
        document.getElementById("userType").innerText = doc.data().role;
        document.getElementById("profile-name").innerText = doc.data().artistName;
        document.getElementById("firstName").innerText = doc.data().firstName;
        document.getElementById("lastName").innerText = doc.data().lastName;
        document.getElementById("lastName").innerText = doc.data().lastName;
        document.getElementById("email").innerText = doc.data().email;
        document.getElementById("phoneNumber").innerText = doc.data().phoneNumber;

        document
          .getElementById("profileImg")
          .setAttribute(
            "src",
            doc.data().profileImage || "./assets/avatar.jpg"
          );
        document
          .getElementById("profile-card")
          .setAttribute(
            "src",
            doc.data().profileImage || "./assets/avatar.jpg"
          );

        // Set the links based on the user type
        document.getElementById("dashboard-link").href = "artistdash.html";
        document.getElementById("messages-link").href = "artmessages.html";

        mobiscroll.setOptions({
          locale: mobiscroll.localeEn,  // Specify language like: locale: mobiscroll.localePl or omit setting to use default
          theme: 'ios',                 // Specify theme like: theme: 'ios' or omit setting to use default
          themeVariant: 'light'         // More info about themeVariant: https://docs.mobiscroll.com/5-20-1/javascript/calendar#opt-themeVariant
        });



        mobiscroll.datepicker('#calendar', {
          controls: ['calendar'],
          display: 'inline',

          //Display booked dates
          onPageLoading: function (event, inst) {
            firebase.firestore().collection('/studiopick/artists/sessions')
              .where("artistId", "==", user.uid)

              .get().then((snapshot) => {
                let labels = [];
                let invalid = [];
                let bDate;
                var pendingCount = 0;

                snapshot.forEach((doc) => {
                  let booking = doc.data();
                  bDate = new Date(booking.selectedDate);
                  pendingCount++;
                  if (booking.status === "pending") {
                    labels.push({
                      start: bDate,
                      title: pendingCount + " BOOKED",
                      textColor: 'red'
                    });

                  } else {
                    invalid.push();

                  }
                });

                inst.setOptions({
                  labels: labels,
                  invalid: invalid
                });
              });
          },

        });

      } else {
        console.log("user doc data ===", doc.data());
      }
    });
}

//Display payment history
async function displayPayHistory(user) {
  const sessionsDb = firebase.firestore().collection("/studiopick/artists/sessions");

  try {
    // Retrieve the session data from Firestore
    const snapshot = await sessionsDb
      .where("artistId", "==", user.uid)
      .orderBy("created", "asc")
      .get();

    // Render the first page of transactions
    const currentPage = 1;
    const itemsPerPage = 7;
    renderTransactions(snapshot.docs, currentPage, itemsPerPage);
  } catch (error) {
    console.log("read past transactions error ===", error);
  }
}


function renderTransactions(querySnapshot, currentPage, itemsPerPage) {
  const table = document.getElementById("payHistoryTable").getElementsByTagName("tbody")[0];
  table.innerHTML = "";

  var totalIncome = 0;
  var fTransactionStr = ""; // define fTransactionStr before using it
  querySnapshot.forEach((doc, index) => {
    if (index >= (currentPage - 1) * itemsPerPage && index < currentPage * itemsPerPage) {
      const sessionData = doc.data();

      const status = sessionData.status;
      let statusStyle = "";
      if (status === "refunded") {
        statusStyle = 'color: red;'; // Red color for refunded sessions
      } else if (status === "accepted") {
        statusStyle = 'color: green;'; // Green color for accepted sessions
      } else {
        statusStyle = 'color: yellow;'; // Yellow color for pending sessions
      }

      const symbol = status === "accepted" ? "+" : (status === "refunded" ? "-" : "");

      // Adjust totalIncome based on session status
      if (status === "refunded") {
        totalIncome -= parseFloat(sessionData.sessionPrice);
      } else if (status === "accepted") {
        totalIncome += parseFloat(sessionData.sessionPrice);
      }

      // Ensure total income does not go below zero
      totalIncome = Math.max(0, totalIncome);

      fTransactionStr += `
        <tr>
          <td scope="row"><span class="fa fa-briefcase mr-1">${sessionData.artistName}</span></td>
          <td><span class="fa fa-cc-mastercard">${sessionData.sessionType}</span></td>
          <td class="text-muted">${sessionData.selectedDate}, ${sessionData.startTime}</td>
          <td style="${statusStyle}"><span class="fa fa-long-arrow-up mr-1"></span> ${symbol}$${sessionData.sessionPrice} </td>
        </tr>
      `;
    }
  });

  // Update the table with the transaction strings
  table.innerHTML = fTransactionStr;

  // Update the total income in the UI
  document.getElementById("totalIncome").innerHTML = totalIncome.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).toString();

  // Update the transaction body with the filtered transactions
  document.getElementById("transaction-body").innerHTML = fTransactionStr;

  // Update the page number in the UI
  var startItem = (currentPage - 1) * itemsPerPage + 1;
  var endItem = Math.min(currentPage * itemsPerPage, querySnapshot.size || 0); // add a null check here
  var totalItems = querySnapshot.size || 0; // add a null check here

  document.querySelector('.results b').textContent = `${startItem}-${endItem} of ${totalItems}`;

  // Disable the previous and next buttons if necessary
  var prevBtn = document.querySelector('.pagination li:first-child');
  var nextBtn = document.querySelector('.pagination li:last-child');
  if (currentPage === 1) {
    prevBtn.classList.add('disabled');
  } else {
    prevBtn.classList.remove('disabled');
  }
  if (currentPage === Math.ceil(querySnapshot.size / itemsPerPage)) {
    nextBtn.classList.add('disabled');
  } else {
    nextBtn.classList.remove('disabled');
  }

  // Add event listeners to the pagination buttons
  prevBtn.addEventListener('click', function () {
    if (currentPage > 1) {
      currentPage--;
      renderTransactions(querySnapshot, currentPage, itemsPerPage);
    }
  });

  document.querySelector('.results b').textContent = `${startItem}-${endItem} of ${totalItems}`;


  nextBtn.addEventListener('click', function () {
    if (currentPage < Math.ceil(querySnapshot.size / itemsPerPage)) {
      currentPage++;
      renderTransactions(querySnapshot, currentPage, itemsPerPage);
    }
  });
}

//Display and Mangage Sessions
async function displayAndManageUpcomingSessions(user) {
  // Create an artistSessions object
  const artistSessions = {};

  sessionsDb
    .where("artistId", "==", user.uid)
    .orderBy("created", "asc")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const sessionData = doc.data();
        artistSessions[doc.id] = {
          ...sessionData,
          id: doc.id,
        };
      });

      // Get current date
      const currentDate = new Date();

      // Filter only upcoming sessions using artistSessions object
      const upcomingSessions = Object.values(artistSessions).filter((session) => {
        const sessionDate = new Date(session.selectedDate);
        return sessionDate >= currentDate;
      });

      let upcomingStr = "";

      upcomingSessions.forEach((session) => {


        // Format date
        const formattedDate = new Date(session.selectedDate).toLocaleDateString();

        // Update the innerHTML with the session's data
        upcomingStr += `
          <div class="col-md-6">
            <div class="session-card">
              <div class="sbody">
                <div class="upcoming-session-data">
                  <div class="upcoming-info">
                    <p>
                      <span class="manage-name text-muted"
                        style="width: 50px !important;">Customer:</span>
                      <span class="manage-upcoming-name">${session.artistName}</span>
                    </p>
                    <p>
                      <span class="manage-date text-muted">Date:</span>
                      <span class="manage-upcoming-date"
                        style="margin-left: 38px;">${formattedDate}</span>
                    </p>
                    <p>
                      <span class="manage-service text-muted">Service:</span>
                      <span class="manage-upcoming-service">${session.service}</span>
                    </p>
                  </div>
                  <div class="manage-info">
                    <p>
                      <span class="manage-room text-muted"
                        style="margin-left: 80px;">Room:</span>
                        <span class="manage-upcoming-room">${session.roomName}</span>
                    </p>
                    <p>
                      <span class="manage-duration text-muted"
                        style="margin-left: 80px;">Duration:</span>
                      <span class="manage-duration">${session.duration} hours</span>
                    </p>
                    <p>
                      <span class="manage-frame text-muted">Time Frame:</span>
                      <span class="manage-upcoming-frame">${session.startTime} - ${session.endTime}</span>
                    </p>
                    <p>
                      <span class="manage-cprice text-muted">Price:</span>
                      <span class="manage-upcoming-cprice">$${session.sessionPrice}</span>
                    </p>
                  </div>
                  
                  <button class="sendMessage">Send Message</button>
                </div>
              </div>
            </div>
          </div>
        `;
      });


      document.getElementById("manage-body").innerHTML = upcomingStr;
      if (!upcomingStr) {
        upcomingStr = '<p>No sessions booked</p>';
      }

    })

    .catch((error) => {
      console.log("read services error ===", error);
    });
}





//Dashboard Functions

//Edit Profile Functions

//First Name
document.getElementById("save").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var firstName = document.getElementById("inputFirst").value;
  console.log("edit click ===", firstName);
  firstName &&
    userDb
      .doc(user.uid)
      .update({
        firstName: firstName,
      })
      .then(function (docRef) {
        console.log("Document written with ID: ", docRef);
        document.getElementById("firstName").innerText = firstName;
      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
});

//Last Name
document.getElementById("save2").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var lastName = document.getElementById("inputLast").value;
  console.log("edit click ===", lastName);
  lastName &&
    userDb
      .doc(user.uid)
      .update({
        lastName: lastName,
      })
      .then(function (docRef) {
        console.log("Document written with ID: ", docRef);
        document.getElementById("lastName").innerText = lastName;
      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
});

//Email
document.getElementById("save3").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var email = document.getElementById("inputEmail").value;
  console.log("edit click ===", email);
  email &&
    userDb
      .doc(user.uid)
      .update({
        email: email,
      })
      .then(function (docRef) {
        console.log("Document written with ID: ", docRef);
        document.getElementById("email").innerText = email;
      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
});

//Artist Name
document.getElementById("save4").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var artistName = document.getElementById("inputName").value;
  console.log("edit click ===", artistName);
  artistName &&
    userDb
      .doc(user.uid)
      .update({
        artistName: artistName,
      })
      .then(function (docRef) {
        console.log("Document written with ID: ", docRef);
        document.getElementById("artistName").innerText = artistName;
      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
});

//Phone Number
document.getElementById("save5").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var phoneNumber = document.getElementById("inputPhone").value;
  console.log("edit click ===", phoneNumber);
  phoneNumber &&
    userDb
      .doc(user.uid)
      .update({
        phoneNumber: phoneNumber,
      })
      .then(function (docRef) {
        console.log("Document written with ID: ", docRef);
        document.getElementById("phoneNumber").innerText = phoneNumber;
      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
});



//Artist Profile Picture
function uploadImage() {
  var type = "image";
  var storage = firebase.storage();
  var file = document.getElementById("files").files[0];
  var storageref = storage.ref();
  var thisref = storageref.child(type).child(file.name).put(file);
  thisref.on(
    "state_changed",
    function (snapshot) { },
    function (error) { },
    function () {
      // Uploaded completed successfully, now we can get the download URL
      thisref.snapshot.ref.getDownloadURL().then(function (downloadURL) {
        //getting url of image
        document.getElementById("url").value = downloadURL;
        alert("uploaded successfully");
        saveProfilePictureUrl(downloadURL);
        document
          .getElementById("profile-card")
          .setAttribute("src", downloadURL);
        document
          .getElementById("profileImg")
          .setAttribute("src", downloadURL);
      });
    }
  );


}

function saveProfilePictureUrl(url) {
  const user = firebase.auth().currentUser;
  userDb
    .doc(user.uid)
    .update({
      profileImage: url,
    })
    .then(function (docRef) {

    })
    .catch(function (error) {
      console.error("Error profileImage update document: ", error);
    });
}



// Function to get get form values
function getInputVal(id) {
  return document.getElementById(id).value;
}

//Functions to switch tabs
function switchTabs() {
  document.querySelectorAll(".tab-button").forEach((link) => {
    link.addEventListener("click", () => {
      const menuBar = link.parentElement;
      const tabsContainer = menuBar.parentElement;
      const tabNumber = link.dataset.forTab;
      const tabToActivate = tabsContainer.querySelector(
        `[data-tab="${tabNumber}"]`
      );

      menuBar.querySelectorAll(".tab-button").forEach((link) => {
        link.classList.remove("tab-button-active");
      });

      tabsContainer.querySelectorAll(".content").forEach((tab) => {
        tab.classList.remove("content-active");
      });
      link.classList.add("tab-button-active");

      tabToActivate.classList.add("content-active");
    });
  });


}

document.addEventListener("DOMContentLoaded", () => {
  switchTabs();

  document.querySelectorAll(".content").forEach((tabsContainer) => {
    document.querySelector(".horizontal-tabs .tab-button").click();
  });
});


//Edit button click dropdown
$(document).ready(function () {
  //First Name Save
  $("#edit").on("click", function () {
    $(this).hide();
    $("#save, #cancel, #inputFirst").show();
  });
  $("#save").on("click", function () {
    $("#edit").show();
    $("#save, #cancel, #inputFirst").hide();
  });

  $("#cancel").on("click", function () {
    $("#edit").show();
    $("#save, #cancel, #inputFirst").hide();
  });

  //Last Name Save
  $("#edit2").on("click", function () {
    $(this).hide();
    $("#save2, #cancel2, #inputLast").show();
  });
  $("#save2").on("click", function () {
    $("#edit2").show();
    $("#save2, #cancel2, #inputLast").hide();
  });

  $("#cancel2").on("click", function () {
    $("#edit2").show();
    $("#save2, #cancel2, #inputLast").hide();
  });

  //Email Save
  $("#edit3").on("click", function () {
    $(this).hide();
    $("#save3, #cancel3, #inputEmail").show();
  });
  $("#save3").on("click", function () {
    $("#edit3").show();
    $("#save3, #cancel3, #inputEmail").hide();
  });

  $("#cancel3").on("click", function () {
    $("#edit3").show();
    $("#save3, #cancel3, #inputEmail").hide();
  });

  //Studio Name Save
  $("#edit4").on("click", function () {
    $(this).hide();
    $("#save4, #cancel4, #inputName").show();
  });
  $("#save4").on("click", function () {
    $("#edit4").show();
    $("#save4, #cancel4, #inputName").hide();
  });

  $("#cancel4").on("click", function () {
    $("#edit4").show();
    $("#save4, #cancel4, #inputName").hide();
  });

  //Phone Save
  $("#edit5").on("click", function () {
    $(this).hide();
    $("#save5, #cancel5, #inputPhone").show();
  });
  $("#save5").on("click", function () {
    $("#edit5").show();
    $("#save5, #cancel5, #inputPhone").hide();
  });

  $("#cancel5").on("click", function () {
    $("#edit5").show();
    $("#save5, #cancel5, #inputPhone").hide();
  });



  //Profile Pic Save
  $("#edit10").on("click", function () {
    $(this).hide();
    $("#saveImg, #cancel10, #upload, #files").show();
  });
  $("#saveImg").on("click", function () {
    $("#edit10").show();
    $("#saveImg, #cancel10, #upload, #files").hide();
  });

  $("#cancel10").on("click", function () {
    $("#edit10").show();
    $("#saveImg, #cancel10, #upload, #files").hide();
  });


});

//Go to messages
function goToStuMessages() {
  window.location.href = 'stumessages.html';
}

document.getElementById('viewMessagesButton').addEventListener('click', goToStuMessages);

//Go to payment history
const viewPaymentBtn = document.getElementById("pay-history-button");
viewPaymentBtn.addEventListener("click", () => {
  const payHistoryLink = document.getElementById("payment-history-link");
  payHistoryLink.click();
});

//Go to saved studio page
function viewStudio(studioId) {
  window.location.href = `studiopage.html?studioId=${studioId}`;
}
