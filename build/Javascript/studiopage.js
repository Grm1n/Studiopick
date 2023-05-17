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
const studioUserDb = firestore.collection("/studiopick/studios/users");
const artistUserDb = firestore.collection("/studiopick/artists/users");
const stuChats = firestore.collection("/studiopick/studios/chatrooms");
const stuMessages = firestore.collection("/studiopick/studios/messages");
const artChats = firestore.collection("/studiopick/artists/chatrooms");
const artMessages = firestore.collection("/studiopick/artists/messages");
const serviceDb = firestore.collection("/studiopick/studios/services");
const roomDb = firestore.collection("/studiopick/studios/rooms");
const studiosDb = firestore.collection("/studiopick/studios/studios");
const reviewDb = firestore.collection("/studiopick/studios/reviews");
const sessionsDb = firestore.collection("/studiopick/studios/sessions");
const auth = firebase.auth();
const sendBookingData = firebase.functions().httpsCallable('createStripeCheckout')

/* const studioData = {
  rooms: {
    'id1': {
      roomName: 'studio 1',
      services: {
        'serviceId1': {
          serviceName: 'myService'
        }
      }
    },
  },
} */

var studioData = {
  rooms: {},
};

var artistData = {

}

async function loadUserData() {
  await readUserData();
  await readStudioData();
  await readRoomData();
  await readServiceData();

  displayStudioPreview()
  initializeGoogleMapsForStudio();
  readReviews();


}

//Authenticate User
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // ...
    await loadUserData();

    // Fetch artist's information when they sign in
    const artistDoc = await artistUserDb.doc(user.uid).get();
    artistData = artistDoc.data();
    artistData.id = user.uid;

  } else {
    window.location.href = "login.html?error";
    alert("Not logged in? Login or sign up to get started today!");

    // Clear artistData when user is signed out
    artistData = {};
  }
});


async function readStudioData() {
  const urlParams = new URLSearchParams(window.location.search);
  studioData.id = urlParams.get("studioId");
  await studiosDb
    .doc(studioData.id)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return alert('Studio id invalid')
      }

      studioData = {
        ...studioData,
        ...doc.data()
      }
      document.getElementById("studio-name").innerText =
        doc.data().studioName;




      mobiscroll.setOptions({
        locale: mobiscroll.localeEn,  // Specify language like: locale: mobiscroll.localePl or omit setting to use default
        theme: 'ios',                 // Specify theme like: theme: 'ios' or omit setting to use default
        themeVariant: 'light'         // More info about themeVariant: https://docs.mobiscroll.com/5-20-1/javascript/calendar#opt-themeVariant
      });

      let timePicker = null;
      let datePicker = null;

      let bookingCount = {};
      const maxBookings = 10;

      datePicker = mobiscroll.datepicker('#calendar', {
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
        onChange: (event) => {
          let selectedDate = datePicker.getVal();
          localStorage.setItem("user_selected_date", selectedDate);
          timePicker.setVal(selectedDate); // pass the selected date to the time picker
        }
      });



      timePicker = mobiscroll.datepicker('#time', {
        controls: ['timegrid'],
        display: 'inline',
        select: 'range',
        showRangeLabels: true,
        minRange: 7200000,
        maxRange: 43200000,

        onPageLoading: function (event, inst) {
          let selectedDate = datePicker.getVal();

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



    })



}

async function readUserData() {
  const user = firebase.auth().currentUser;


  //Logged in user's profile 
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

        // Set the dashboard link based on the user type
        document.getElementById("dashboard-link").href = "studiodash.html";
        document.getElementById("messages-link").href = "stumessages.html";


      } else {

      }
    })


  studiosDb
    .where("uid", "==", user.uid)
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        // Get the first matching document (there should be only one)
        const studioDoc = querySnapshot.docs[0];
        const studioId = studioDoc.id;

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
              .where("studioId", "==", studioId)
              .get();



            let unreadMessagesCount = 0;

            // Iterate through chatrooms
            for (const chatroomDoc of chatroomsSnapshot.docs) {
              // Query for unread messages in the current chatroom
              const querySnapshot = await chatroomDoc.ref
                .collection("messages")
                .where("status", "==", "unread")
                .where("recipientId", "==", studioId)
                .get();



              unreadMessagesCount += querySnapshot.size;
            }

            // If there are unread messages, display the badges
            if (unreadMessagesCount > 0) {


              // Update the icon badge
              messageBadge.style.display = "inline-block";
              // Remove the following line to remove the number of notifications from the badge
              messageBadge.innerText = unreadMessagesCount;

              // Update the message-link-badge
              const messageLinkBadge = document.querySelector(".message-link-badge");
              messageLinkBadge.style.display = "inline-block";
              messageLinkBadge.innerText = unreadMessagesCount;
            } else {
              console.log("No unread messages found");
            }

          } catch (error) {
            console.log("Error checking for unread messages: ", error);
          }
        }

        // Call the async function to display the notification badge
        displayNotificationBadge();
      }
    });

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

        // Set the dashboard link based on the user type
        document.getElementById("dashboard-link").href = "artistdash.html";
        document.getElementById("messages-link").href = "artmessages.html";

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


      } else {

      }
    })


}



//Display Rooms
async function readRoomData() {
  var roomStr = "";
  var index = 0;
  var roomArray = []
  return roomDb
    .where("studioId", "==", studioData.id)
    .get()
    .then((querySnapshot) => {
      querySnapshot
        .forEach((doc) => {
          roomArray.push(doc)
        })

      roomArray
        .sort((a, b) => a.data().roomName.localeCompare(b.data().roomName))
        .forEach((doc) => {
          studioData.rooms[doc.id] = {
            ...doc.data(),
            services: {},
          };

          const data = doc.data();

          roomStr += `

        <div class="roomOne col-6" id="room-${doc.id}">
          <div class="service" id="service${index}">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-cassette" id="cassette0" viewBox="0 0 16 16" style="position: relative; left: -40px; top: 25px;">
              <path d="M4 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 6a1 1 0 0 0 0 2h2a1 1 0 1 0 0-2H7Z"></path>
              <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13ZM1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-.691l-1.362-2.724A.5.5 0 0 0 12 10H4a.5.5 0 0 0-.447.276L2.19 13H1.5a.5.5 0 0 1-.5-.5v-9ZM11.691 11l1 2H3.309l1-2h7.382Z"></path>
            </svg>
            <h2 class="roomType">${data.roomName}</h2>
            <div id="servicesContainer-${doc.id}">
              
            </div>
          </div>
        </div>
          `;
          index++;
          document.getElementById("service-body").innerHTML = roomStr;
        });
    })
    .catch((error) => {
      console.log("read rooms error ===", error);
    });
}

//Display Services
async function readServiceData() {
  var serviceStr = "";
  var index = 0;
  // TODO: Filter by studioId -> room -> Service instead of retrieving all services
  return serviceDb
    .where("roomId", "in", Object.keys(studioData.rooms))
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {

        const serviceData = doc.data();

        studioData.rooms[serviceData.roomId].services[doc.id] = serviceData;

        serviceStr = `
        <div class="service-entry">
            <input class="form-check-input" style="height: 13px; width: 13px;" type="radio"
              name="service" id="flexRadioDefault1${index}" value="${doc.id}" data-room-id="${serviceData.roomId}">
            <label class="serviceLabel" for="flexRadioDefault1" id="serviceLabel${index}">
              ${serviceData.serviceType}
            </label>
            <label class="priceLabel" for="flexRadioDefault1" id="priceLabel${index}">
              $${serviceData.servicePrice} /Hr
            </label>
          </div>
          `;
        document.getElementById(`servicesContainer-${serviceData.roomId}`).innerHTML += serviceStr;
        index++;
      });
    })
    .catch((error) => {
      console.log("read services error ===", error);
    });
}

//Display Calendar & Available Dates





//Display Room Preview
function displayStudioPreview() {
  var carouselContent = `<div id="carouselExampleCaptions" class="carousel slide" data-bs-ride="carousel">
  <div class="carousel-indicators">`

  Object.values(studioData.rooms).forEach((room, index) => {
    carouselContent += `<button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="${index}" class="active" aria-current="true" aria-label=${room.roomName}"></button>`
  })



  carouselContent += `</div><div class="carousel-inner" id="studio-carousel">`
  Object.values(studioData.rooms).forEach((room, index) => {

    if (room.roomImage) {
      carouselContent += `
      <div class="carousel-item  ${index === 0 ? 'active' : ''}">
          <img src="${room.roomImage}" class="d-block w-100" alt="...">
          <div class="carousel-caption d-none d-md-block">
            <h5>${room.roomName}</h5>
            
          </div>
        </div>
                `
    }
  })
  carouselContent += '</div></div>'
  const studioCarouselElement = document.getElementById('roomPreview')
  studioCarouselElement.innerHTML = carouselContent
}







//Add a new review
function addReview() {
  console.log("add new service ===");

  //Declare Variables
  const user = firebase.auth().currentUser;

  var reviewMessage = document.getElementById("reviewInput").value;
  console.log("reviewInput value ===", reviewMessage);

  // Get the current date
  var currentDate = new Date().toISOString();

  // Get star rating value
  var starRating = 0;
  var selectedStar = document.querySelector('input[name="star"]:checked');
  if (selectedStar) {
    switch (selectedStar.id) {
      case "five":
        starRating = 5;
        break;
      case "four":
        starRating = 4;
        break;
      case "three":
        starRating = 3;
        break;
      case "two":
        starRating = 2;
        break;
      case "one":
        starRating = 1;
        break;
    }
  }

  reviewMessage &&
    reviewDb
      .add({
        artistName: artistData.artistName,
        reviewMessage: reviewMessage,
        uid: user.uid,
        starRating: starRating,
        studioId: studioData.id,
        submittedDate: currentDate
      })
      .then(function (docRef) {
        console.log("Document written with ID: ", docRef);
        readReviews();
      })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
}



// Display Reviews
function readReviews() {
  var reviewStr = "";
  var index = 0;
  reviewDb
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) { // Check if there are no reviews
        reviewStr = "<p class='text-muted' id='noReviews'>No reviews at this time</p>";
      } else {
        querySnapshot.forEach((doc) => {
          console.log("readReviews doc ===", doc.data());
          const data = doc.data();
          reviewStr += `
          <div class="reviewMsg">
            <p style="margin-bottom: 11px; margin-top: -11px;">
            <span class="reviewerName" id="reviewerName${index}">${data.artistName}</span>
            <span class="time-occurred text-muted" id="time-occurred${index}">${data.submittedDate}</span>
            </p>
            <p>
            <span class="textMsg text-muted" id="reviewMsg${index}">${data.reviewMessage}</p>
            </p>
          </div>
          <div class="rating">
            <img class="rStar" src="Images/Star.png">
            <p class="ratingNumber" id="ratingNumber${index}">${data.starRating}/</p>
            <p class="scale text-muted">Out of 5</p>
          </div>
          `;

          index++;
        });
      }

      document.getElementById("review-body").innerHTML = reviewStr;
    })
    .catch((error) => {
      console.log("read services error ===", error);
    });
}


//Book Studio Session
document.getElementById("book").addEventListener("click", async function () {
  //Declare Variables
  const user = firebase.auth().currentUser;

  var radios = document.getElementsByName("service");

  var checkedRadios = 0
  for (const radio of radios) {
    if (radio.checked) {
      checkedRadios++
    }
  }

  if (checkedRadios === 0) {
    alert('There are no services chosen')
    return
  }

  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      const serviceId = radios[i].value
      //Get radio values and send them to stripe and firestore
      console.log(radios[i])
      const roomId = radios[i].getAttribute('data-room-id')
      const service = studioData.rooms[roomId].services[serviceId]
      console.log('chosen service is : ', service)

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


      //Get hours from the selected timeframe
      var hoursGotten = getHours(selectedTimeFrame);
      console.log("hours gotten", hoursGotten)

      //Trigger Stripe Checkout
      const result = await sendBookingData({
        ...service,
        artistId: user.uid,
        artistEmail: user.email,
        studioId: studioData.id,
        serviceId: serviceId,
        studioName: studioData.studioName,
        artistName: artistData.artistName,
        roomName: studioData.rooms[roomId].roomName,
        selectedDate: dateOnly,
        startTime: startTime,
        endTime: endTime,
        hours: hoursGotten
      })

      console.log(result)
      const stripe = Stripe('pk_live_51Kkuj3Ci6903DZushubjUjCxpmuykU3XP8m1W0v8wNFFWwIV8OH3h2PTELkZ6kTIaiALa75MEqmQXm06YReObqcW00rdQIJHzR')

      stripe.redirectToCheckout({
        sessionId: result.data.id
      })

      console.log("Session Booked Successfully!");
      break;
    }
  }
});


//Google Maps Function
function initializeGoogleMapsForStudio() {

  //Map controls and default locaation
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: { lat: 37.0902, lng: 95.7129 },
    mapTypeControl: false,
    navigationControl: false,
    disableDefaultUI: true,
    scaleControl: false,
    scrollwheel: false,
    draggable: false,
  });

  // The location of studio
  const geocoder = new google.maps.Geocoder()
  let composedAddress = `${studioData.stuAddress || ''}`
  composedAddress += studioData.stuCity ? `, ${studioData.stuCity}` : ''
  composedAddress += studioData.stuState ? `, ${studioData.stuState}` : ''
  geocoder.geocode({ 'address': composedAddress }, function (results, status) {

    if (status === google.maps.GeocoderStatus.OK) {
      map.setCenter(results[0].geometry.location)
      const marker = new google.maps.Marker({
        position: results[0].geometry.location,
        map: map,
      });
    }
  })


}

//Calculate Total Time Function
function getHours(selectedTimeFrame) {
  const timeFrames = selectedTimeFrame.split(',');
  const startTime = new Date(timeFrames[0]);
  const endTime = new Date(timeFrames[1]);
  const difference = endTime.getTime() - startTime.getTime();
  return difference / (1000 * 60 * 60);
}


//Mobiscroll calendar
document.querySelector('.open-calendar').addEventListener('click', function () {
  // Get the selected radio button
  const selectedRadio = document.querySelector('input[name="service"]:checked');

  if (selectedRadio) {
    // Get the selected service and price from the selected radio button's labels
    const selectedService = selectedRadio.parentNode.querySelector('.serviceLabel').textContent;
    const selectedPrice = selectedRadio.parentNode.querySelector('.priceLabel').textContent;

    // Update the contents of the selectedService and selectedPrice elements
    document.querySelector('#pickedService').textContent = selectedService;
    document.querySelector('#pickedPrice').textContent = selectedPrice;
  }


});

// Create Chatroom
document.querySelector(".send-message").addEventListener("click", async function () {
  // Check if the user is logged in
  if (!firebase.auth().currentUser) {
    console.error("User not logged in");
    return;
  }

  try {
    // Get sender ID
    const senderId = firebase.auth().currentUser.uid;

    // Get recipient ID
    const recipientId = studioData.id;

    // Check if sender ID and recipient ID are available
    if (!senderId || !recipientId) {
      console.error("Sender ID or recipient ID not available");
      return;
    }

    // Create chatroom ID
    const chatroomId = senderId + "_" + recipientId;

    // Check if chatroom already exists
    const stuChatRef = stuChats.doc(chatroomId);
    const doc = await stuChatRef.get();
    if (doc.exists) {
      console.log("Chatroom already exists");
    } else {
      // Create new chatroom document in studio chats collection
      await stuChatRef.set({
        members: [
          { id: senderId, role: "artist" },
          { id: recipientId, role: "studio" }
        ],
        studioId: studioData.id,
        chatRoomId: chatroomId
      });
      console.log("Chatroom created successfully");

      // Create new chatroom document in artist chats collection
      const artChatsRef = artChats.doc(chatroomId);
      await artChatsRef.set({
        members: [
          { id: senderId, role: "artist" },
          { id: recipientId, role: "studio" }
        ],
        artistId: firebase.auth().currentUser.uid,
        chatRoomId: chatroomId
      });
      console.log("Chatroom created successfully in artist database");

      // Navigate to messages page
      window.location.href = "artmessages.html";
    }
  } catch (error) {
    console.error("Error creating chatroom:", error);
  }
});















