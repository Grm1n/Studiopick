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
const auth = firebase.auth();
const firestore = firebase.firestore();
const userDb = firestore.collection("/studiopick/studios/users");
const serviceDb = firestore.collection("/studiopick/studios/services");
const roomDb = firestore.collection("/studiopick/studios/rooms");
const reviewDb = firestore.collection("studiopick/studios/reviews")
const stuChats = firestore.collection("/studiopick/studios/chatrooms");
const artDb = firestore.collection("/studiopick/artists/users")
const studiosDb = firebase
  .firestore()
  .collection("/studiopick/studios/studios");
const sessionsDb = firebase
  .firestore()
  .collection("/studiopick/studios/sessions");

const currentSession = document.querySelector(".current-session .session-body");
const upcomingSession = document.querySelector(".upcoming-sessions .session-body");

const updateFirestore = firebase.functions().httpsCallable("updateFirestore");

var roomIdChosen = undefined;

const studioData = {
  rooms: {},
  sessions: {},
};

//Authenticate user
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await readData();
    checkStudioData(studioData);
    await displayAndManageUpcomingSessions(studioData, user);
    await displayPayHistory();
    // ...

    // Add the event listener here
    document.getElementById("confirmPay").addEventListener("click", () => handlePayout(user));

    // Move the call to toggleAddNewAccountButtonVisibility here
    toggleAddNewAccountButtonVisibility(user);

  } else {
    window.location.href = "login.html?error";
    alert("No active user please sign or sign up.");
  }
});



//This reads user data
async function readData() {

  const user = firebase.auth().currentUser;

  //Get Studio Data
  await studiosDb
    .where("uid", "==", user.uid)
    .get()
    .then((querySnapshot) => {
      const studioId = querySnapshot.docs[0].id;
      const studioTmpData = querySnapshot.docs[0].data()
      studioData.id = studioId;


      document.getElementById("stuAddress").innerText = studioTmpData.stuAddress;
      document.getElementById("stuCity").innerText = studioTmpData.stuCity;
      document.getElementById("stuState").innerText = studioTmpData.stuState;
      document.getElementById("stuZip").innerText = studioTmpData.stuZip;

      document
        .getElementById("hprofile-card")
        .setAttribute(
          "src",
          studioTmpData.homeImageURL || "./assets/avatar.jpg"
        );

      mobiscroll.setOptions({
        locale: mobiscroll.localeEn,  // Specify language like: locale: mobiscroll.localePl or omit setting to use default
        theme: 'ios',                 // Specify theme like: theme: 'ios' or omit setting to use default
        themeVariant: 'light'         // More info about themeVariant: https://docs.mobiscroll.com/5-20-1/javascript/calendar#opt-themeVariant
      });


      //Dashboard calendar
      mobiscroll.datepicker('#calendar', {
        controls: ['calendar'],
        display: 'inline',
        moreEventsText: '{count} BOOKED',
        moreEventsPluralText: '{count} BOOKED',

        //Display booked dates
        onPageLoading: function (event, inst) {
          firebase.firestore().collection('/studiopick/studios/sessions')
            .where("studioId", "==", studioData.id)

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
    });


  //Reschedule Session
  let timePicker = null;
  let rdatePicker = null;

  let bookingCount = {};
  const maxBookings = 10;

  timePicker = mobiscroll.datepicker('#time', {
    controls: ['timegrid'],
    display: 'inline',
    select: 'range',
    showRangeLabels: true,
    minRange: 7200000,
    maxRange: 43200000,

    onPageLoading: function (event, inst) {
      let selectedDate = rdatePicker.getVal();

      firebase.firestore().collection('/studiopick/studios/sessions')
        .where("studioId", "==", studioData.id)
        .get().then((snapshot) => {
          let invalid = [];
          snapshot.forEach((doc) => {
            let booking = doc.data();

            // Parse the startTime and endTime values into a proper date and time format
            let date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            let [startHours, startMinutes] = booking.startTime.split(":");
            let [endHours, endMinutes] = booking.endTime.split(":");
            let [startAMPM] = booking.startTime.split(" ");
            let [endAMPM] = booking.endTime.split(" ");
            startHours = startAMPM === "AM" ? startHours : parseInt(startHours, 10) + 12;
            endHours = endAMPM === "AM" ? endHours : parseInt(endHours, 10) + 12;
            let startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHours, startMinutes);
            let endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHours, endMinutes);

            // Check if the booking date matches the selected date
            if (selectedDate.getTime() === startTime.getTime()) {
              invalid.push({
                start: startTime,
                end: endTime
              });
            }
          });
          inst.setOptions({
            invalid: [{
              time: invalid
            }],
          });

        });
    },
    onChange: (event) => {
      let selectedTimeRange = timePicker.getVal();
      localStorage.setItem("user_selected_timeframe", selectedTimeRange);
      
    }
  });

  rdatePicker = mobiscroll.datepicker('#rescheduleCalendar', {
    controls: ['calendar'],
    display: 'inline',
    moreEventsText: '{count} BOOKED',
    moreEventsPluralText: '{count} BOOKED',

    //Display booked dates
    onPageLoading: function (event, inst) {
      firebase.firestore().collection('/studiopick/studios/sessions')
        .where("studioId", "==", studioData.id)
        .get().then((snapshot) => {
          let labels = [];
          let invalid = [];
          snapshot.forEach((doc) => {
            let booking = doc.data();
            let bDate = new Date(booking.selectedDate);
            let dateKey = bDate.toDateString();
            if (!bookingCount[dateKey]) {
              bookingCount[dateKey] = 1;
            } else {
              bookingCount[dateKey]++;
            }
            if (booking.status === "pending") {
              labels.push({
                start: bDate,
                title: bookingCount[dateKey] + " BOOKED",
                textColor: 'red'
              });
            }
            if (bookingCount[dateKey] >= maxBookings) {
              invalid.push(bDate);
            }
          });
          inst.setOptions({
            labels: labels,
            invalid: invalid
          });
        });
    },

    //Get selected date values
    onChange: (event, inst) => {
      let selectedDate = rdatePicker.getVal();
      localStorage.setItem("user_selected_date", selectedDate);
      timePicker.setVal(selectedDate); // pass the selected date to the time picker
    }
  });




  //Display Room Selections
  await roomDb
    .get()
    .then((querySnapshot) => {
      roomStr = `<select class="form-select" id="roomSelector" aria-label="Default select example">
        <option value="">Select a room:</option>`;
      querySnapshot.forEach((doc) => {
        studioData.rooms[doc.id] = {
          ...doc.data(),
          services: {},
        };

        const data = doc.data();
        roomStr += `<option value="${doc.id}">${data.roomName}</option>`;
      });

      roomStr += `</select>`;


      document.getElementById("roomSelect").innerHTML = roomStr;
      $("#roomSelector").on("change", function (event) {
        roomIdChosen = event.target.value;
      });
    })
    .catch((error) => {
      console.log("read services error ===", error);
    });



  //Upcoming and current sessions
  sessionsDb
    .where("studioId", "==", studioData.id)
    .orderBy("created", "asc")
    .get()
    .then((querySnapshot) => {

      // Handle the latest event
      querySnapshot.forEach((doc) => {
        // Get the first event
        const sessionData = doc.data();
        studioData.sessions[doc.id] = {
          ...sessionData,
          id: doc.id,
        };
      });

      function isSessionUpcoming(sessionDate) {
        const now = new Date();
        return sessionDate > now;
      }

      function hasSessionHappened(endTime) {
        const now = new Date();
        return endTime < now;
      }


      const now = new Date();

      const filteredSessions = Object.values(studioData.sessions).filter((session) => {
        const sessionStartDateTime = new Date(`${session.selectedDate} ${session.startTime}`);
        const sessionEndDateTime = new Date(`${session.selectedDate} ${session.endTime}`);
        return (
          !hasSessionHappened(sessionEndDateTime) &&
          session.status !== 'refunded' &&
          session.status !== 'completed' // Add this condition
        );
      });


      const currentSessionData = filteredSessions.find((session) =>
        isSessionCurrentlyHappening(
          new Date(`${session.selectedDate} ${session.startTime}`),
          new Date(`${session.selectedDate} ${session.endTime}`)
        )
      );

      const upcomingSessionData = filteredSessions.find((session) => {
        const sessionStartDateTime = new Date(`${session.selectedDate} ${session.startTime}`);
        return (
          isSessionUpcoming(sessionStartDateTime) &&
          (currentSession ? session.id !== currentSession.id : true)
        );
      });

      if (upcomingSessionData && !upcomingSessionData.refunded) {


        upcomingSession.innerHTML = `
          <div class="upcoming-session-data">
            <div class="upcoming-info">
              <p>
              <span class="upcoming-name text-muted" style="width: 50px !important;">Customer Name:</span>
                <span class="todays-upcoming-name">${upcomingSessionData.artistName}</span>
              </p>
              <p>
                <span class="upcoming-date text-muted">Date:</span>
                <span class="todays-upcoming-date" style="margin-left: 4px;">${upcomingSessionData.selectedDate}</span>
              </p>
              <p>
                <span  class="upcoming-service text-muted">Service:</span>
                <span  class="todays-upcoming-service">${upcomingSessionData.sessionType}</span>
              </p>
            </div>
            <div class="upcoming-info">
              <p>
                <span class="upcoming-room text-muted" style="margin-left: 80px;">Room:</span>
                <span class="todays-upcoming-room">${upcomingSessionData.roomName}</span>
              </p>
              <p>
                <span class="current-duration text-muted" style="margin-left: 80px;">Duration:</span>
                <span  class="todays-duration">${upcomingSessionData.duration} hours</span>
              </p>
              <p>
                <span  class="upcoming-frame text-muted">Time Frame:</span>
                <span  class="todays-upcoming-frame">${upcomingSessionData.startTime} - ${upcomingSessionData.endTime}</span>
              </p>
            </div>
         </div>
        `
        const upcomingSessionActions = document.querySelector(".upcoming-session-actions");
        upcomingSessionActions.innerHTML = `
    <div>
      <div class="session-price">$${upcomingSessionData.sessionPrice}</div>
    </div>
    <div class="actions">
      ${upcomingSessionData.status === 'accepted' // Check if the session has been accepted
            ? '' // If it has, don't show the accept button
            : `<button class="acceptCurrent" onclick="acceptSession('${upcomingSessionData.id}')">Accept</button>`
          }
          <button id="rescheduleButton" class="rescheduleCurrent open-reschedule-calendar" data-bs-toggle="modal" data-bs-target="#calendarModal" data-session='${JSON.stringify(upcomingSessionData)}' data-start-time="${upcomingSessionData.startTime}" data-end-time="${upcomingSessionData.endTime}">Reschedule</button>
      <button class="cancelCurrent" onclick="refundAndCancelSession('${upcomingSessionData.id}', '${upcomingSessionData.chargeId}')">Refund</button>
    </div>
  `;
      } else {
        upcomingSession.innerHTML = `
    <div class="no-upcoming-sessions">
      <h3 class="text-muted" id="noUpcoming">No Upcoming Sessions</h3>
    </div>
  `;
      }

      //Current Session
      if (currentSessionData) {
        currentSession.innerHTML = `
    <div class="current-session-data">
      <p>
        <span class="current-date text-muted">Date:</span>
        <span class="todays-date">${currentSessionData.selectedDate}</span>
      </p>
      <p>
        <span  class="current-service text-muted">Service:</span>
        <span  class="todays-service">${currentSessionData.sessionType}</span>
      </p>
      <p>
        <span  class="current-room text-muted">Room:</span>
        <span class="todays-room">${currentSessionData.roomName}</span>
      </p>
      <p>
        <span  class="current-duration text-muted">Duration:</span>
        <span  class="todays-duration">${currentSessionData.duration} hours</span>
      </p>
      <p>
        <span  class="current-frame text-muted">Duration:</span>
        <span  class="todays-frame">${currentSessionData.startTime} - ${currentSessionData.endTime}</span>
      </p>
    </div>
    <div class="current-client">
      <div class="currentImg">
        <img id="customerProfile" alt="" src="/Images/cam.jpg">
      </div>
      <div class="current-client-artist">
        <h2 class="currentName">${currentSessionData.artistName}</h2>
        <h1 class="userTypeLabel text-muted">Artist</h1>
      </div>
    </div>
  `;

        const currentSessionActions = document.querySelector(
          ".current-session-actions"
        );
        currentSessionActions.innerHTML = `
    <button id="rescheduleButton" class="rescheduleCurrent open-reschedule-calendar" data-bs-toggle="modal" data-bs-target="#calendarModal" data-session='${JSON.stringify(currentSessionData)}' data-start-time="${currentSessionData.startTime}" data-end-time="${currentSessionData.endTime}">Reschedule</button>
    <button id="completeCurrent" class="completeCurrent">Complete Session</button>
    <button class="cancelCurrent" onclick="refundAndCancelSession('${currentSessionData.id}', '${currentSessionData.chargeId}')">Refund</button>
  `;


        document.querySelector("#completeCurrent").addEventListener("click", () => completeSession(currentSessionData));
      } else {
        currentSession.innerHTML = `
    <div class="current-session-data">
      <p class="text-muted" id="notCurrent">No Session Currently Happening</p>
    </div>
  `;
      }

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
      const chatroomsSnapshot = await stuChats
        .where("studioId", "==", studioData.id)
        .get();



      let unreadMessagesCount = 0;

      // Iterate through chatrooms
      for (const chatroomDoc of chatroomsSnapshot.docs) {
        // Query for unread messages in the current chatroom
        const querySnapshot = await chatroomDoc.ref
          .collection("messages")
          .where("status", "==", "unread")
          .where("recipientId", "==", studioData.id)
          .get();



        unreadMessagesCount += querySnapshot.size;
      }

      // If there are unread messages, display the badges
      if (unreadMessagesCount > 0) {
        console.log("Unread messages found:", unreadMessagesCount);

        // Update the icon badge
        messageBadge.style.display = "inline-block";
        // Remove the following line to remove the number of notifications from the badge
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
    const allChatRoomsSnapshot = await stuChats.get();

    let chatStr = "";
    for (const doc of allChatRoomsSnapshot.docs) {
      const chatroom = doc.data();

      if (chatroom.studioId === studioData.id) {
        const chatroomId = doc.id;

        // Find the artistId from the members array
        const artistMember = chatroom.members.find(
          (member) => member.role === "artist"
        );
        const artistId = artistMember ? artistMember.id : null;

        let artistName = "";

        if (artistId) {
          // Fetch the artist name and profile picture based on the artistId
          const artistSnapshot = await artDb.doc(artistId).get();
          const artistData = artistSnapshot.data();
          artistName = artistData ? artistData.artistName : "Unknown Artist";
          profilePictureURL = artistData ? artistData.profileImage : profilePictureURL;
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

        const message = `
                    <div class="notification-one">
                      <p class="person-one">${artistName}</p>
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



  // Display past transactions
  var transactionStr = "";
  var index = 0;

  sessionsDb
    .where("studioId", "==", studioData.id)
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





  //Display studio rooms
  var roomCardStr = "";
  var index = 0;
  roomDb
    .where("studioId", "==", studioData.id)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {


        const data = doc.data();

        roomCardStr += `

          <div class="roomcard col-4" id="roomCard${index}" data-room-id="${doc.id}" style="background: url('${data.roomImage}'); background-size: cover;">
            <h2 class="roomName" id="roomName${index}">${data.roomName}</h2>
            <div class="col-auto">
              <input type="text" id="inputRoomName${index}" class="inputRoomName" data-index="${index}">
            </div>

            <!---Change Room Name--->
            <button type="button" class="exit-name" id="exit-name${index}" data-index="${index}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="exit"  viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z">
                </path>
                <path
                  d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z">
                </path>
              </svg>
            </button>
            <button type="button" class="editRoomName" id="editRoomName${index}" data-index="${index}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="bi bi-pencil-square" id="pencil${index}" viewBox="0 0 16 16">
                <path
                  d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z">
                </path>
                <path fill-rule="evenodd"
                  d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z">
                </path>
              </svg>
            </button>
            <!---Change Room Name--->

            <!---Change Room Background--->
            <button type="button" class="exit-bckg" id="exit-bckg${index}" data-index="${index}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="bi bi-x-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z">
                </path>
                <path
                  d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z">
                </path>
              </svg>
            </button>
            <button type="button" class="editBckg" id="editBckg${index}" data-index="${index}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="bi bi-image" id="picture" viewBox="0 0 16 16">
                <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"></path>
                <path
                  d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z">
                </path>
              </svg>
            </button>
            <input class="uploadBckg" type="file" name="files" id="uploadBckg${index}" required />
            <input type="hidden" name="url" id="url${index}" />
            <!---Change Room Background--->

            <button type="button" class="roomEdit" id="roomEdit${index}" data-index="${index}">Edit</button>
            <button type="button" class="roomSave" id="roomSave${index}" data-index="${index}">Save</button>
            <button type="button" class="roomSave" id="roomNameSave${index}" data-index="${index}" onclick="updateRoomName(${index}, '${doc.id}')">Save</button>
            <button type="button" class="roomSave" id="roomBckgSave${index}" data-index="${index}" onclick="updateRoomBckg(${index}, '${doc.id}')">Save</button>
            <button type="button" class="roomCancel" id="roomCancel${index}" data-index="${index}">Cancel</button>
            
          </div>

        `;
        index++;
      });

      // Update room cards or display "No rooms" message
      var roomRow = document.getElementById("room-row");
      if (roomCardStr === "") {
        roomRow.innerHTML = "<p class='text-muted' style='position: relative; left: 10px; top: 91px;'>No rooms</p>";
      } else {
        roomRow.innerHTML = roomCardStr;
      }
    })
    .catch((error) => {
      console.log("read services error ===", error);
    });

  //Display studio services
  var serviceStr = "";
  var index = 0;
  serviceDb
    .where("studioId", "==", studioData.id)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const serviceData = doc.data();
        studioData.rooms[serviceData.roomId].services[doc.id] = serviceData;

        const data = doc.data();
        serviceStr += `
              <div class="servicecard col-4">
                <div class="service-content">
                  <h2 class="service-roomName">${studioData.rooms[serviceData.roomId].roomName}<br>Services</h2>
                  <div class="service-content">
                    <div class="service">
                      <button class="serviceEdit" id="edit${doc.id}" value="${doc.id}">edit</button>
                      <button class="serviceSave" type="button" onclick="saveService('${doc.id}')" id="save${doc.id}" value="${doc.id}">Save</button>
                      <button class="serviceCancel" id="cancel${doc.id}" value="${doc.id}">Cancel</button>
                      <p class="serviceInfo" id="serviceInfo${doc.id}">${data.serviceType}</p>
                      <div class="col-auto">
                        <input type="text" id="editService${doc.id}" class="editService">
                      </div>
                      <div id="moneySet${doc.id}">
                        <button class="priceEdit" id="moneyedit${doc.id}" value="${doc.id}">edit</button>
                        <button class="priceSave" type="button" onclick="savePrice('${doc.id}')" id="moneysave${doc.id}" value="${doc.id}">Save</button>
                        <button class="priceCancel" id="moneycancel${doc.id}" value="${doc.id}">Cancel</button>
                        <p class="servicemoney">$</p>
                        <p class="servicePrice" id="servicePrice${doc.id}">${data.servicePrice}</p>
                        <p class="slash">/</p>
                        <p class="time">Hr</p>
                        <div class="center" id="plus-minusInput${doc.id}">
                          <button type="button" class="minus">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash" viewBox="0 0 16 16">
                              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"></path>
                            </svg>
                          </button>
                          <input type="text" value="1" id="numberInput${doc.id}" style="width: 87px; position: relative; top: 17px;"/>
                          <button type="button" class="plus">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16">
                              <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"></path>
                            </svg>
                          </button>
                          <p class="button-text text-muted">Change Price Value</p>
                        </div>
                      </div>


                    </div>
                  </div>
                </div>
              </div>
          `;
        index++;
      });

      // Update service cards or display "No services" message
      var serviceDiv = document.getElementById("service");
      if (serviceStr === "") {
        serviceDiv.innerHTML = "<p class='text-muted' style='position: relative; left: -73px; top: 91px;'>No services</p>";
      } else {
        serviceDiv.innerHTML = serviceStr;
      }
    })
    .catch((error) => {
      console.log("read services error ===", error);
    });

  // Saved Payment Methods
  userDb
    .doc(user.uid)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().hasOwnProperty('connectedAccountId') && doc.data().hasOwnProperty('last4')) {
        const data = doc.data();
        const stripeId = data.connectedAccountId;
        const last4 = data.last4;

        var cardStr = `
        <h1 class="card1-head text-muted">Payment One</h1>
        <!-- Card One -->
        <div class="stuBank">
          <p>Stripe:</p>
          <p class="bankName">${stripeId}</p>
          <h2 style="font-size: 14px;position: relative;top: -27px;">Card:</h2>
          <p class="routingNum">**** **** **** ${last4}</p>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            class="bank-icon" viewBox="0 0 16 16">
            <path
            d="m8 0 6.61 3h.89a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H15v7a.5.5 0 0 1 .485.38l.5 2a.498.498 0 0 1-.485.62H.5a.498.498 0 0 1-.485-.62l.5-2A.501.501 0 0 1 1 13V6H.5a.5.5 0 0 1-.5-.5v-2A.5.5 0 0 1 .5 3h.89L8 0ZM3.777 3h8.447L8 1 3.777 3ZM2 6v7h1V6H2Zm2 0v7h2.5V6H4Zm3.5 0v7h1V6h-1Zm2 0v7H12V6H9.5ZM13 6v7h1V6h-1Zm2-1V4H1v1h14Zm-.39 9H1.39l-.25 1h13.72l-.25-1Z">
            </path>
          </svg>
        </div>
        <!-- Card One -->
      `;
        index++;
        document.getElementById("bankGrid").innerHTML = cardStr;
      } else {
        document.getElementById("bankGrid").innerHTML = '<h3 class="text-muted" id="noSavedCard">No saved cards</h3>';
      }
    });


  //Basic Profile Info
  userDb
    .doc(user.uid)
    .get()
    .then((doc) => {
      if (doc.exists) {


        //Tab Five Pt. 1
        //Display Studio User Information
        document.getElementById("users-header").innerText =
          doc.data().studioName;
        document.getElementById("studioName").innerText = doc.data().studioName;
        document.getElementById("userType").innerText = doc.data().role;
        document.getElementById("profile-name").innerText =
          doc.data().studioName;
        document.getElementById("firstName").innerText = doc.data().firstName;
        document.getElementById("lastName").innerText = doc.data().lastName;
        document.getElementById("lastName").innerText = doc.data().lastName;
        document.getElementById("email").innerText = doc.data().email;
        document.getElementById("phoneNumber").innerText =
          doc.data().phoneNumber;

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
        document.getElementById("dashboard-link").href = "studiodash.html";
        document.getElementById("messages-link").href = "stumessages.html";

      } else {

      }
    });

  //Review Reviews and display average
  reviewDb
    .where("studioId", "==", studioData.id)
    .get()
    .then((snapshot) => {
      let sum = 0;
      let count = 0;

      snapshot.forEach((doc) => {
        sum += doc.data().starRating;
        count++;
      });

      let averageRating = Math.round(sum / count * 10) / 10;

      document.getElementById("current-rating").innerText = averageRating || 'N/A';
    })
    .catch((error) => {
      console.error("Error getting document:", error);
    });



}

//Display payment history
async function displayPayHistory() {
  const sessionsDb = firebase.firestore().collection("/studiopick/studios/sessions");

  try {
    // Retrieve the session data from Firestore
    const snapshot = await sessionsDb
      .where("studioId", "==", studioData.id)
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
async function displayAndManageUpcomingSessions(studioData, user) {

  sessionsDb
    .where("studioId", "==", studioData.id)
    .orderBy("created", "asc")
    .get()
    .then((querySnapshot) => {

      // Handle the latest event
      querySnapshot.forEach((doc) => {
        // Get the first event
        const sessionData = doc.data();
        studioData.sessions[doc.id] = {
          ...sessionData,
          id: doc.id,
        };
      });

      // Get current date
      const currentDate = new Date();

      // Filter only upcoming sessions
      const upcomingSessions = Object.values(studioData.sessions).filter((session) => {
        const sessionDate = new Date(session.selectedDate);
        return sessionDate >= currentDate && session.status !== 'refunded';
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
                      <span class="manage-upcoming-service">${session.sessionType}</span>
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
                  <div class="manage-actions">
                    ${session.status === 'accepted' ? '' : `<button class="acceptCurrent" onclick="acceptSession('${session.id}')">Accept</button>`}
                    <button class="rescheduleManage">Reschedule</button>
                    <button class="cancelManage">Refund</button>
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
        document.getElementById("manage-body").innerHTML = '<p class="text-muted" id="noBooked">No Active Sessions</p>';
      }
    })
    .catch((error) => {
      console.log("read services error ===", error);
    });
}

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

//Studio Name
document.getElementById("save4").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var studioName = document.getElementById("inputName").value;
  studiosDb
    .where("uid", "==", user.uid)
    .get()
    .then((querySnapshot) => {
      const studioId = querySnapshot.docs[0].id;

      studioName &&
        studiosDb
          .doc(studioId)
          .set(
            {
              studioName: studioName,
            },
            { merge: true }
          )
          .then(function (docRef) {
            console.log("Document written with ID: ", docRef);
            document.getElementById("studioName").innerText = studioName;
          })
          .catch(function (error) {
            console.error("Error adding document: ", error);
          });
    });
});

//Phone Number
document.getElementById("save5").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var phoneNumber = document.getElementById("inputNumber").value;
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

//Edit Studio Location

//Studio Address
document.getElementById("save6").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var stuAddress = document.getElementById("inputAddress").value;
  console.log("edit click ===", stuAddress);

  // Use the geocoding service to get the latitude and longitude of the address
  axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address: stuAddress,
      key: 'AIzaSyBdpdzNdY9iXLvzgXeauKmQTZYcVfbmQKI'
    }
  })
    .then(function (response) {
      console.log(response.data);
      var lat = response.data.results[0].geometry.location.lat;
      var lng = response.data.results[0].geometry.location.lng;
      var addresslocation = new firebase.firestore.GeoPoint(lat, lng);


      studiosDb
        .where("uid", "==", user.uid)
        .get()
        .then((querySnapshot) => {
          const studioId = querySnapshot.docs[0].id;
          addresslocation && stuAddress &&
            studiosDb
              .doc(studioId)
              .set(
                {
                  stuAddress: stuAddress,
                  addresslocation: addresslocation,
                },
                { merge: true }
              )
              .then(function (docRef) {
                console.log("Document written with ID: ", docRef);
                document.getElementById("stuAddress").innerText = stuAddress;
              })
              .catch(function (error) {
                console.error("Error adding document: ", error);
              });
        });
    })
    .catch(function (error) {
      console.log(error);
    });
});


//Studio City
document.getElementById("save7").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var stuCity = document.getElementById("inputCity").value;
  console.log("City entered is: ===", stuCity);



  studiosDb
    .where("uid", "==", user.uid)
    .get()
    .then((querySnapshot) => {
      const studioId = querySnapshot.docs[0].id;

      // Save the GeoPoint object to the Firestore document
      stuCity &&
        studiosDb
          .doc(studioId)
          .set(
            {
              stuCity: stuCity,
            },
            { merge: true })
          .then(function (docRef) {
            console.log("Document written with ID: ", docRef);
            document.getElementById("stuCity").innerText = stuCity;
          })
          .catch(function (error) {
            console.error("Error adding document: ", error);
          });
    });
});


//Studio State
document.getElementById("save8").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;
  var stuState = document.getElementById("inputState").value;
  console.log("edit click ===", stuState);

  // Obtain latitude and longitude of the state
  const API_KEY = "AIzaSyBdpdzNdY9iXLvzgXeauKmQTZYcVfbmQKI";

  // Make a GET request to the Google Maps Geocoding API
  fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${stuState},%20USA&key=${API_KEY}`)
    .then((response) => response.json())
    .then((data) => {

      console.log(data); // Log the API response


      // Extract the latitude and longitude from the response
      const latitude = data.results[0].geometry.location.lat;
      const longitude = data.results[0].geometry.location.lng;
      console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

      var stateLocation = new firebase.firestore.GeoPoint(latitude, longitude);

      studiosDb
        .where("uid", "==", user.uid)
        .get()
        .then((querySnapshot) => {
          const studioId = querySnapshot.docs[0].id;

          stuState &&
            studiosDb
              .doc(studioId)
              .set(
                {
                  stuState: stuState,
                  statelocation: stateLocation
                },
                { merge: true }
              )
              .then(function () {
                console.log("Document written with ID: ", studioId); // Use studioId here instead of docRef
                document.getElementById("stuState").innerText = stuState;
              })
              .catch(function (error) {
                console.error("Error adding document: ", error);
              });
        });
    })
    .catch((error) => console.error(error));

  console.log("User id is: ", user.uid);
});



//Studio Zip Code
document.getElementById("save9").addEventListener("click", function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var stuZip = document.getElementById("inputZip").value;
  console.log("edit click ===", stuZip);

  // Make request to Geocoding API
  fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${stuZip}&key=AIzaSyBdpdzNdY9iXLvzgXeauKmQTZYcVfbmQKI`)
    .then(response => response.json())
    .then(data => {
      // Extract latitude and longitude from response
      const latitude = data.results[0].geometry.location.lat;
      const longitude = data.results[0].geometry.location.lng;
      // Create GeoPoint object
      const location = new firebase.firestore.GeoPoint(latitude, longitude);

      studiosDb
        .where("uid", "==", user.uid)
        .get()
        .then((querySnapshot) => {
          const studioId = querySnapshot.docs[0].id;
          location && stuZip &&
            studiosDb
              .doc(studioId)
              .set(
                {
                  stuZip: stuZip,
                  zipLocation: location,
                },
                { merge: true }
              )
              .then(function (docRef) {
                console.log("Document written with ID: ", docRef);
                document.getElementById("stuZip").innerText = stuZip;
              })
              .catch(function (error) {
                console.error("Error adding document: ", error);
              });
        });
    });
});


//Studio Profile Picture
function uploadimage() {
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
          .getElementById("profileImg")
          .setAttribute("src", downloadURL);
        document
          .getElementById("profile-card")
          .setAttribute("src", downloadURL);
      });
    }
  );
}

function saveProfilePictureUrl(url) {
  const user = firebase.auth().currentUser;
  studiosDb
    .doc(studioData.id)
    .update({
      profileImage: url,
    })
    .then(function (docRef) {
      // Handle success
    })
    .catch(function (error) {
      console.error("Error profileImage update document: ", error);
    });

  userDb
    .doc(user.uid)
    .update({
      profileImage: url,
    })
    .then(function (docRef) {
      // Handle success
    })
    .catch(function (error) {
      console.error("Error profileImage update document: ", error);
    });
}


function uploadHomeImage() {
  var type = "image";
  var storage = firebase.storage();
  var file = document.getElementById("hfiles").files[0];
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
        document.getElementById("hurl").value = downloadURL;
        alert("uploaded successfully");
        saveHomePictureUrl(downloadURL);
        var homeImageURL = downloadURL;
        document
          .getElementById("hprofile-card")
          .setAttribute("src", homeImageURL);

      });
    }
  );
}

function saveHomePictureUrl(url) {
  studiosDb
    .doc(studioData.id)
    .set(
      {
        homeImageURL: url,
      },
      { merge: true }
    )
    .then(function (docRef) {

    })
    .catch(function (error) {
      console.error("Error adding document: ", error);
    });
}

//Edit rooms and services functions

//Add a new room
function addNewRoom() {
  console.log("add new room ===");

  //Declare Variables
  const user = firebase.auth().currentUser;

  var roomName = document.getElementById("inputRmName").value;
  console.log("inputService value ===", roomName);

  studiosDb
    .where("uid", "==", user.uid)
    .get()
    .then((querySnapshot) => {
      const studioId = querySnapshot.docs[0].id;
      roomName &&
        roomDb
          .add({
            studioId: studioId,
            roomName: roomName,
            uid: user.uid,
          })
          .then(function (docRef) {
            console.log("Document written with ID: ", docRef);
            readData();
          })
          .catch(function (error) {
            console.error("Error adding document: ", error);
          });
    });
}

//Update Room
function updateRoomName(id) {
  console.log("update room click ===");
  //Declare Variables
  const user = firebase.auth().currentUser;

  var roomName = document.getElementById(`inputRoomName${id}`).value;
  console.log("edit click ===", roomName);
  roomName && userDb;
  roomDb
    .doc(user.uid)
    .set(
      {
        roomName: roomName,
        uid: user.uid,
      },
      { merge: true }
    )
    .then(function (docRef) {
      console.log("Document written with ID: ", docRef);
      console.log(id);
      document.getElementById(`roomName${id}`).innerText = roomName;
    })
    .catch(function (error) {
      console.error("Error adding document: ", error);
    });
}

function updateRoomBckg(id, roomDatabaseId) {
  var type = "image";
  var storage = firebase.storage();
  var file = document.getElementById(`uploadBckg${id}`).files[0];
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
        document.getElementById(`roomCard${id}`).style[
          "background"
        ] = `url('${downloadURL}')`;
        alert("uploaded successfully");
        saveRoomBckgUrl(downloadURL, roomDatabaseId);
      });
    }
  );

}

function saveRoomBckgUrl(url, roomDatabaseId) {
  const user = firebase.auth().currentUser;
  roomDb
    .doc(roomDatabaseId)
    .update({
      roomImage: url,
      uid: user.uid,
    })
    .then(function (docRef) {
      console.log("Document profileImage update with ID: ", docRef);
    })
    .catch(function (error) {
      console.error("Error profileImage update document: ", error);
    });
}

//Add a new service
function newServiceValueSelected(event) { }
function addNewService() {
  console.log("add new service ===");
  //Declare Variables
  const user = firebase.auth().currentUser;

  var serviceType = document.getElementById("inputService").value;
  console.log("inputService value ===", serviceType);
  var servicePrice = document.getElementById("inputPrice").value;
  console.log("inputPrice value ===", servicePrice);
  serviceType &&
    servicePrice &&
    serviceDb
      // .doc(user.uid)
      // .collection("services")
      .add({
        serviceType: serviceType,
        servicePrice: servicePrice,
        uid: user.uid,
        studioId: studioData.id,
        roomId: roomIdChosen,
      })
      .then(function (docRef) {
        console.log("Document written with ID: ", docRef);
        readData();
      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
}

function saveService(id) {
  // Declare Variables
  const user = firebase.auth().currentUser;

  var serviceType = document.getElementById(`editService${id}`).value;
  console.log("edit click ===", serviceType);

  const serviceRef = serviceDb.doc(id); // <-- use the ID to get the document reference

  serviceRef.set(
    {
      serviceType: serviceType,
    },
    { merge: true }
  )
    .then(() => {
      console.log("Service updated successfully");
      document.getElementById(`serviceInfo${id}`).innerText = serviceType;
    })
    .catch((error) => {
      console.error("Error updating service: ", error);
      alert("An error occurred while updating the service. Please try again later.");
    });
}

function savePrice(id) {
  // Declare Variables
  const user = firebase.auth().currentUser;

  var servicePrice = document.getElementById(`numberInput${id}`).value;
  console.log("edit click ===", servicePrice);

  const serviceRef = serviceDb.doc(id); // <-- use the ID to get the document reference

  serviceRef.set(
    {
      servicePrice: servicePrice,
    },
    { merge: true }
  )
    .then(() => {
      console.log("Service updated successfully");
      document.getElementById(`servicePrice${id}`).innerText = servicePrice;
    })
    .catch((error) => {
      console.error("Error updating service: ", error);
      alert("An error occurred while updating the service. Please try again later.");
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



  document.querySelectorAll(".vtab-button").forEach((link) => {
    link.addEventListener("click", () => {
      const menuBar = link.parentElement;
      const menuTab = menuBar.parentElement;
      const tabsContainer = menuTab.parentElement;
      const tabNumber = link.dataset.forTab;
      const tabToActivate = tabsContainer.querySelector(
        `[data-tab="${tabNumber}"]`
      );

      menuBar.querySelectorAll(".vtab-button").forEach((link) => {
        link.classList.remove(".vtab-button-active");
      });

      tabsContainer.querySelectorAll(".myroom-content-main").forEach((tab) => {
        tab.classList.remove("myroom-content-main-active");
      });
      link.classList.add("vtab-button-active");

      tabToActivate.classList.add("myroom-content-main-active");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  switchTabs();

  document.querySelectorAll(".content").forEach((tabsContainer) => {
    document.querySelector(".horizontal-tabs .tab-button").click();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  switchTabs();

  document.querySelectorAll(".myroom-content-main").forEach((tabsContainer) => {
    document.querySelector(".vertical-tabs .vtab-button").click();
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
    $("#save5, #cancel5, #inputNumber").show();
  });
  $("#save5").on("click", function () {
    $("#edit5").show();
    $("#save5, #cancel5, #inputNumber").hide();
  });

  $("#cancel5").on("click", function () {
    $("#edit5").show();
    $("#save5, #cancel5, #inputNumber").hide();
  });

  //Studio Address Save
  $("#edit6").on("click", function () {
    $(this).hide();
    $("#save6, #cancel6, #inputAddress").show();
  });
  $("#save6").on("click", function () {
    $("#edit6").show();
    $("#save6, #cancel6, #inputAddress").hide();
  });

  $("#cancel6").on("click", function () {
    $("#edit6").show();
    $("#save6, #cancel6, #inputAddress").hide();
  });

  //City Save
  $("#edit7").on("click", function () {
    $(this).hide();
    $("#save7, #cancel7, #inputCity").show();
  });
  $("#save7").on("click", function () {
    $("#edit7").show();
    $("#save7, #cancel7, #inputCity").hide();
  });

  $("#cancel7").on("click", function () {
    $("#edit7").show();
    $("#save7, #cancel7, #inputCity").hide();
  });

  //State Save
  $("#edit8").on("click", function () {
    $(this).hide();
    $("#save8, #cancel8, #inputState").show();
  });
  $("#save8").on("click", function () {
    $("#edit8").show();
    $("#save8, #cancel8, #inputState").hide();
  });

  $("#cancel8").on("click", function () {
    $("#edit8").show();
    $("#save8, #cancel8, #inputState").hide();
  });

  //Zip Code Save
  $("#edit9").on("click", function () {
    $(this).hide();
    $("#save9, #cancel9, #inputZip").show();
  });
  $("#save9").on("click", function () {
    $("#edit9").show();
    $("#save9, #cancel9, #inputZip").hide();
  });

  $("#cancel9").on("click", function () {
    $("#edit9").show();
    $("#save9, #cancel9, #inputZip").hide();
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

  //Home Profile Pic Save
  $("#edit11").on("click", function () {
    $(this).hide();
    $("#saveImg2, #cancel11, #upload, #hfiles").show();
  });
  $("#saveImg").on("click", function () {
    $("#edit11").show();
    $("#saveImg2, #cancel11, #upload, #hfiles").hide();
  });

  $("#cancel11").on("click", function () {
    $("#edit11").show();
    $("#saveImg2, #cancel11, #upload, #hfiles").hide();
  });

  // edit11, save11, etc 11 => add ${this.value}
  // edit12, save12, etc 12 => money...${this.value}

  //Room Buttons
  $(document).on("click", ".roomEdit", function () {
    var dataIndex = $(this).attr("data-index");
    console.log("this ===", this, this.id, this.value);

    $(this).hide();
    $(
      `#roomSave${dataIndex}, #roomCancel${dataIndex}, #editRoomName${dataIndex}, #editBckg${dataIndex}`
    ).show();
  });

  $(document).on("click", ".roomSave", function () {
    var dataIndex = $(this).attr("data-index");
    $(this).hide();
    $(`#roomEdit${dataIndex}`).show();
    $(
      `#roomCancel${dataIndex}, #editRoomName${dataIndex}, #editBckg${dataIndex}`
    ).hide();
  });

  $(document).on("click", ".roomCancel", function () {
    var dataIndex = $(this).attr("data-index");
    $(this).hide();
    $(`#roomEdit${dataIndex}`).show();
    $(
      `#roomSave${dataIndex}, #editRoomName${dataIndex}, #editBckg${dataIndex}, #uploadBckg${dataIndex}, #roomBckgSave${dataIndex} `
    ).hide();
  });

  //Save Room Name
  $(document).on("click", ".editRoomName", function () {
    var dataIndex = $(this).attr("data-index");
    $(this).hide();
    $(
      `#editBckg${dataIndex}, #roomSave${dataIndex}, #roomCancel${dataIndex}`
    ).hide();
    $(
      `#inputRoomName${dataIndex}, #exit-name${dataIndex}, #roomNameSave${dataIndex}`
    ).show();
  });

  $(document).on("click", "#roomNameSave", function () {
    var dataIndex = $(this).attr("data-index");
    $(this).hide();
    $(
      `#inputRoomName${dataIndex}, #roomNameSave${dataIndex}, #exit-name${dataIndex}}`
    ).hide();
    $(`#roomEdit${dataIndex}`).show();
  });

  $(document).on("click", ".exit-name", function () {
    var dataIndex = $(this).attr("data-index");
    $(this).hide();
    $(`#inputRoomName${dataIndex}, #roomNameSave${dataIndex}`).hide();
    $(
      `#editRoomName${dataIndex}, #editBckg${dataIndex}, #editBckg${dataIndex}, #roomSave${dataIndex}, #roomCancel${dataIndex}`
    ).show();
  });

  //Save Room Background
  $(document).on("click", ".editBckg", function () {
    var dataIndex = $(this).attr("data-index");
    $(this).hide();
    $(`#roomSave${dataIndex}, #editRoomName${dataIndex}`).hide();
    $(`#uploadBckg${dataIndex}, #roomBckgSave${dataIndex}`).show();
  });

  //Service Buttons
  $(document).on("click", ".serviceEdit", function () {
    console.log("this ===", this, this.id, this.value);
    $(this).hide();
    $(`#moneyedit${this.value}, #moneySet${this.value}`).hide();
    $(
      `#save${this.value}, #cancel${this.value}, #moneyedit${this.value}, #editService${this.value}`
    ).show();
  });

  $(document).on("click", ".serviceSave", function () {
    $(`#edit${this.value}, #moneySet${this.value}`).show();
    $(
      `#save${this.value}, #cancel${this.value}, #editService${this.value}`
    ).hide();
  });

  $(document).on("click", ".serviceCancel", function () {
    $(
      `#edit${this.value}, #moneyedit${this.value}, #moneySet${this.value}`
    ).show();
    $(
      `#save${this.value}, #cancel${this.value}, #editService${this.value}`
    ).hide();
  });

  //Service Button Set 2
  $(document).on("click", ".priceEdit", function () {
    console.log("priceEdit ===", this);
    $(this).hide();
    $(`#plus-minusInput${this.value}`).show();
    $(`#moneysave${this.value}, #moneycancel${this.value}`).show();
  });
  $(document).on("click", ".priceSave", function () {
    $(`#moneyedit${this.value}`).show();
    $(
      `#moneysave${this.value}, #moneycancel${this.value}, #plus-minusInput${this.value}`
    ).hide();
  });

  $(document).on("click", ".priceCancel", function () {
    $(`#moneyedit${this.value}`).show();
    $(
      `#moneysave${this.value}, #moneycancel${this.value}, #plus-minusInput${this.value}`
    ).hide();
  });
});


function editAndSave() {
  document.getElementById("serviceInfo").contentEditable = true;
}

function isSessionCurrentlyHappening(sessionDate) {
  const todaysDate = new Date();

  if (
    todaysDate.getYear() === sessionDate.getYear() &&
    todaysDate.getMonth() === sessionDate.getMonth() &&
    todaysDate.getDay() === sessionDate.getDay() &&
    todaysDate.getHours() === sessionDate.getHours()
  ) {
    return true;
  }
  return false;
}

function isSessionHappeningToday(sessionDate) {
  const todaysDate = new Date();

  if (
    todaysDate.getYear() === sessionDate.getYear() &&
    todaysDate.getMonth() === sessionDate.getMonth() &&
    todaysDate.getDay() === sessionDate.getDay()
  ) {
    return true;
  }
  return false;
}




// Accept and send confirmation email
function acceptSession(id) {
  console.log("clicked");

  // Update the session status in Firestore
  sessionsDb.doc(id).update({
    status: 'accepted',
    accepted: true, // add this line to set the accepted status
  })

    .then(() => {
      console.log("Session status updated successfully");
      // Retrieve the session data
      return sessionsDb.doc(id).get();
    })
    .then((doc) => {
      const sessionData = doc.data();
      console.log(sessionData);

      // Retrieve the studio data
      return studiosDb.where('studioName', '==', sessionData.studioName).get()
        .then((snapshot) => {
          const studioData = snapshot.docs[0].data();
          console.log(studioData.stuAddress); // add this line to check the value
          console.log(studioData);

          const data = {
            to: sessionData.artistEmail,
            artistName: sessionData.artistName,
            studioName: sessionData.studioName,
            stuAddress: studioData.stuAddress,
            selectedDate: sessionData.selectedDate,
            startTime: sessionData.startTime,
            sessionType: sessionData.sessionType,
            roomName: sessionData.roomName,
          };

          // Send the confirmation email
          return fetch('http://localhost:3000/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
        });
    })
    .then(() => {
      console.log('Email sent');
      // Hide the accept button with a delay
      setTimeout(() => {
        const acceptButton = document.querySelector(`.acceptCurrent`);
        if (acceptButton) {
          acceptButton.style.display = 'none';
        }
      }, 100);
    })
    .catch((error) => {
      console.error(error);
    });
}

//Refund Session
function refundPayment(chargeId) {
  return stripe.refunds.create({
    charge: chargeId,
  });
}

async function refundAndCancelSession(sessionId, chargeId) {
  try {
    // Call Stripe API to refund the payment
    await fetch("/refund", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chargeId: chargeId,
      }),
    });

    // Update the session status in Firestore
    await sessionsDb.doc(sessionId).update({
      status: "refunded",
    });

    // Reload the page to reflect the changes
    location.reload();

    // Update the pay history table
    const snapshot = await sessionsDb
      .where("studioId", "==", studioData.id)
      .orderBy("created", "asc")
      .get();
    renderTransactions(snapshot.docs, 1, 7);
  } catch (error) {
    console.log("refundAndCancelSession error ===", error);
  }
}

//Complete Session
function completeSession(currentSessionData) {
  // Update the session's status in Firestore
  sessionsDb.doc(currentSessionData.id).update({ status: "completed" })
    .then(() => {
      console.log("Session status updated to completed");

      // Update the UI to show that the session is complete
      currentSession.innerHTML = `
        <div class="current-session-data">
          <p class="text-muted" id="notCurrent">No Session Currently Happening</p>
        </div>
      `;

      // Update the currentSessionActions to make them disappear
      const currentSessionActions = document.querySelector(".current-session-actions");
      currentSessionActions.innerHTML = '';

      // Alternatively, you can display a message
      // currentSessionActions.innerHTML = '<p class="text-muted">Session completed.</p>';
    })
    .catch((error) => {
      console.error("Error updating session status: ", error);
    });
}


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

//Go to manage sessions
const viewUpcomingSessionsBtn = document.getElementById("view-upcoming-sessions");
viewUpcomingSessionsBtn.addEventListener("click", () => {
  const sessionManagementLink = document.getElementById("session-management-link");
  sessionManagementLink.click();
});

//Open Reschedule Calendar
document.addEventListener('DOMContentLoaded', () => {
  const sessionContainer = document.getElementById('sessionContainer');
  const calendarModal = new bootstrap.Modal(document.getElementById('calendarModal'), {});

  if (sessionContainer) {
    sessionContainer.addEventListener('click', (event) => {
      if (event.target && event.target.matches('.rescheduleCurrent')) {
        console.log('Reschedule button clicked');
        const upcomingSessionData = JSON.parse(event.target.getAttribute('data-session'));
        console.log(upcomingSessionData);

        // Get the original start and end times from the reschedule button data attributes
        const startTime = event.target.getAttribute('data-start-time');
        const endTime = event.target.getAttribute('data-end-time');

        // Display the original start and end times and date in the modal
        const originalTime = document.getElementById('originalTime');
        originalTime.textContent = `${startTime} - ${endTime}`;
        const originalDate = document.getElementById('originalDate');
        originalDate.textContent = event.target.getAttribute('data-original-date');

        // Show the calendar modal
        calendarModal.show();

        // Add event listener for the calendar save button
        const saveButton = document.getElementById('save-rescheduled-session');
        saveButton.addEventListener('click', () => {
          //Get Date Value
          var selectedDateString = localStorage.getItem("user_selected_date");
          var selectedDate = new Date(selectedDateString);
          var dateOnly = selectedDate.toLocaleDateString();
          console.log(dateOnly)


          //Get Time Value
          var selectedTimeFrame = localStorage.getItem("user_selected_timeframe");
          var time = selectedTimeFrame.split("-");

          // Create date strings in the format "MM/DD/YYYY hh:mm:ss"
          var startDateString = `01/01/2000 ${time[0].split(" ")[4]}`;
          var endDateString = `01/01/2000 ${time[1].split(" ")[7]}`;

          // Create Date objects from the date strings
          var startDate = new Date(startDateString);
          var endDate = new Date(endDateString);

          // Get the formatted time string without seconds
          var startTime = startDate.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' });
          var endTime = endDate.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' });

          console.log(startTime, " & ", endTime);

          // Update the session data
          upcomingSessionData.selectedDate = selectedDate;
          upcomingSessionData.startTime = selectedTime.split('-')[0].trim();
          upcomingSessionData.endTime = selectedTime.split('-')[1].trim();

          // Save the updated session data to Firebase
          firebase.firestore().collection('sessions').doc(upcomingSessionData.id).update(upcomingSessionData)
            .then(() => {
              console.log('Session rescheduled successfully');
            })
            .catch((error) => {
              console.error('Error rescheduling session:', error);
            });

          // Hide the calendar modal
          calendarModal.hide();
        });
      }
    });
  }
});

const upcomingSessionData = {};



function checkStudioData(studioData) {


  if (studioData && studioData.id) {

  } else {
    console.error('studioData.id is undefined');
  }
}

//Display Create Account Button
let connectedAccountId = ""

function toggleAddNewAccountButtonVisibility(user) {
  const addNewAccountButton = document.getElementById("newAccountBtn");


  userDb
    .where("uid", "==", user.uid)
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.connectedAccountId) {
          addNewAccountButton.style.display = "none";

        } else {
          addNewAccountButton.style.display = "block";

        }
      } else {
        console.log("No such document!");
      }
    })
    .catch((error) => {
      console.log("Error getting document:", error);
    });
}


// Create New Stripe Account
function handleAuthorize() {
  const clientId = 'ca_LRsjCkHecTBSfVwVPbWnZF54huh73Dd5';
  const redirectUri = encodeURIComponent('https://studiopick.us/studiodash.html');
  const responseType = 'code';
  const scope = 'read_write';

  // Update the oauthUrl to use the Express flow in live mode
  const oauthUrl = `https://connect.stripe.com/express/oauth/authorize?response_type=${responseType}&client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`;

  window.location.href = oauthUrl;
}


async function createConnectedAccount() {
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');

  const response = await fetch('http://localhost:3000/create_connected_account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      code: authCode,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    const connectedAccountId = data.account;
    const last4 = data.last4; // Add this line
    console.log('Connected account ID:', connectedAccountId);
    console.log('Last 4 digits:', last4);

    // Save the connected account ID and last 4 digits to Firestore
    const user = firebase.auth().currentUser;
    const userDb = firebase.firestore().collection("/studiopick/studios/users");

    userDb
      .doc(user.uid)
      .update({
        connectedAccountId: connectedAccountId,
        last4: last4, // Add this line
      })
      .then(function () {
        console.log("Document written successfully");

      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });

  } else {
    console.error('Error creating connected account:', await response.text());
  }
}


// Call the createConnectedAccount function when the page loads if an auth code is present
if (window.location.search.includes('code')) {
  createConnectedAccount();
}


//Trigger Payout
async function calculateTotalAmountOfCompletedSessions() {
  console.log("Studio data:", studioData);

  const priceDb = firestore.collection("/studiopick/studios/sessions");
  let totalAmount = 0;

  try {
    // Retrieve the session data from Firestore where completed is true
    const snapshot = await priceDb
      .where("studioId", "==", studioData.id)
      .where("status", "==", "completed")
      .get();

    // Calculate the total amount by summing up the sessionPrice for all completed sessions
    snapshot.forEach((doc) => {
      const sessionData = doc.data();
      totalAmount += parseFloat(sessionData.sessionPrice);
    });

  } catch (error) {
    console.log("Error calculating total amount of completed sessions:", error);
  }

  return totalAmount * 100; // Return the total amount in cents
}

async function handlePayout(user) {
  try {
    const totalAmount = await calculateTotalAmountOfCompletedSessions();
    console.log("Total Amount to cash out:", totalAmount);

    // Get the current user's connectedAccountId from the database
    const userDoc = await userDb.doc(user.uid).get();
    const connectedAccountId = userDoc.data().connectedAccountId; // Get connectedAccountId
    console.log("Connected account ID:", connectedAccountId);

    const response = await fetch('http://localhost:3000/create_transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: totalAmount,
        destination: connectedAccountId, // Use connectedAccountId as destination
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Payout initiated:", data.payout); // Access the 'payout' property

      // Reset the total income
      resetTotalIncome();
    } else {
      console.log("Error creating payout:", await response.text());
    }

  } catch (error) {
    console.log("Error handling payout:", error);
  }
}

//Reset Balance After Checking Out
function resetTotalIncome() {
  // Set total income to 0
  const totalIncome = 0;

  // Update the total income in the UI
  document.getElementById("totalIncome").innerHTML = totalIncome.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).toString();
}


//Calculate Total Time Function
function getHours(selectedTimeFrame) {
  const timeFrames = selectedTimeFrame.split(',');
  const startTime = new Date(timeFrames[0]);
  const endTime = new Date(timeFrames[1]);
  const difference = endTime.getTime() - startTime.getTime();
  return difference / (1000 * 60 * 60);
}