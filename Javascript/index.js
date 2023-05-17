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
const studioUserDb = firestore.collection("/studiopick/studios/users")
const artistUserDb = firestore.collection("/studiopick/artists/users")
const studioDb = firestore.collection("/studiopick/studios/studios");
const reviewDb = firestore.collection("/studiopick/studios/reviews");
const artChats = firestore.collection("/studiopick/artists/chatrooms");
const stuChats = firestore.collection("/studiopick/studios/chatrooms");
const savedStudiosDb = firestore.collection("/studiopick/artists/savedStudios")
const auth = firebase.auth();

var currentUser = undefined;

const savedStudioData = {}

function loadingScreen() {
    var loadingText = document.getElementById("loading-text");
    loadingText.innerText = "Welcome To StudioPick.";
    var delay = 2300;

    setInterval(() => {
        loadingText.innerText = "Loading studios...";
        setInterval(() => {
            loadingText.innerText = "Almost done...";
            setInterval(() => {
                loadingText.innerText = "Let's get started";
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

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {

        // User is logged in, show logged in navigation bar
        document.getElementById("logged-out").style.display = "none";
        document.getElementById("logged-in").style = "display: block; z-index: 5 ";


        currentUser = user
        await readSavedStudiosData()
        await readData()




        // ...
    } else {

        // User is not logged in, show logged out navigation bar
        document.getElementById("logged-in").style.display = "none";
        document.getElementById("logged-out").style = "display: block; z-index: 5 "


    }
});

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

                // Set the dashboard link based on the user type
                document.getElementById("dashboard-link").href = "studiodash.html";
                document.getElementById("messages-link").href = "stumessages.html";
            }
        })



    studioDb
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




}



//Get user's current location and display the studios
function loadStudios() {
    navigator.geolocation.getCurrentPosition(function (position) {
        // Get the user's current location

        var userLat = position.coords.latitude;
        var userLng = position.coords.longitude;

        //Do something with the coordinates, like sending them to Firebase
        // Create a query to retrieve the top 10 closest studios to the user's location
        var query = studioDb.where("addresslocation", ">=", new firebase.firestore.GeoPoint(userLat - 0.1, userLng - 0.1)).where("addresslocation", "<=", new firebase.firestore.GeoPoint(userLat + 0.1, userLng + 0.1));
        var studioStr = "";




        query.get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const studioId = doc.id
                const data = doc.data();

                //Review Reviews and display average
                reviewDb
                    .where("studioId", "==", studioId)
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


                studioStr +=
                    `
                            <!--Studio One-->
                            <div class="stuOne col-6">
                                <div class="stucontainer">
                                    <div class="card1-stack">
                                        <!--Studio Front Page-->
                                        <div class="card1 text-white card-has-bg" 
                                            style="background-image:url('${data.homeImageURL}'); background-size: cover;" onclick="redirectToStudioPage('${studioId}')">
                                            <div class="card-img-overlay d-flex flex-column" >
                                                <div class="card-body" >
                                                    <div class="media">
                                                        <img class="mr-3 rounded-circle" id="stuImage"
                                                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxUXsEFPioqCqDqgp7MeLNpM7iZYL6mt97ElI3LwCnuFoarwmSWbJquoEwbi1AJSRzXBs&usqp=CAU"
                                                            alt="Generic placeholder image"
                                                            style="max-width:50px; position: relative; top: 50px; left: -150px;">
                                                        <div class="media-body">
                                                            <h6 class="card-meta mb-2" ><strong>${data.studioName}</strong></h6>
                                                            <small class="stuLocation">${data.stuCity}, ${data.stuState}</small>
                                                        </div>
                                                    </div>
                                                    <!--Heart Button--->
                                                    <div class="btns1">
                                                        <button style="font-size: 35px; border: none" id="like-button-${studioId}"
                                                            class="btn"><i class="fas fa-heart"></i></button>
                                                    </div>
                                                    <!---Heart Button--->
                                                    <!---Star Rating--->
                                                    <img class="star" src="Images/Star.png">
				                                    <h2 id="current-rating">

                                                    </h2>
                                                    
                                                    <!---Star Rating--->
                                                </div>
                                            </div>
                                            <!--Studio Front Page-->
                                        </div>
                                        
                                    </div>
                                </div>
                            </div>
                                    
                        `

                document.getElementById("studioList").innerHTML = studioStr;

                renderHeartButtonColor(studioId)

                $(`#like-button-${studioId}`).click((e) => {
                    toggleSavedStudio(e, studioId)
                })



            })

        })
            .catch((error) => {
                console.log("read services error ===", error);
            });
    }, function (error) {
        console.log(error);
    });



}




loadStudios();


//Search functions
function filterData() {
    console.log("Clicked me!")
    // Get the input values from the search fields
    var nameInput = document.getElementById("searchName").value;
    var zipInput = document.getElementById("searchZip").value;
    var radiusBox = document.getElementById("filterBox");
    var radius = radiusBox.value; // get the selected value from the select element

    console.log(nameInput, zipInput, radiusBox, radius)

    console.log("starting filter")

    console.log("its running the filter:")

    //Filter by name
    var filteredData = studioDb.where("studioName", "==", nameInput);
    if (zipInput.length > 0) {
        //Filter by zip if it's provided
        filteredData = studioDb.where("stuZip", "==", zipInput);
    }

    console.log(filteredData)


    // navigator.geolocation.getCurrentPosition(function (position) {

    //     // Get the user's current location
    //     var userLat = position.coords.latitude;
    //     var userLng = position.coords.longitude;

    //     if (radius != "Filter") {
    //         var radiusInMiles = parseFloat(radius); // convert radius from string to float
    //         var userCoords = { latitude: userLat, longitude: userLng }; // create an object with the user's coordinates

    //         filteredData = filteredData.where(function (doc) {
    //             // get the studio's coordinates
    //             var studioCoords = { latitude: doc.data().addresslocation, longitude: doc.data().addresslocation };
    //             // calculate the distance between the user and the studio
    //             var distance = haversine(userCoords, studioCoords, { unit: 'mile' });
    //             // check if the distance is less than or equal to the selected radius
    //             return distance <= radiusInMiles;
    //         });
    //     }

    //     console.log(radiusInMiles)




    // });

    // Get the filtered data from the database
    console.log("getting filter data...")
    filteredData.get().then((querySnapshot) => {
        var studioStr = "";

        // Loop through the filtered data and build a string of HTML to display on the page
        console.log({ querySnapshot })
        querySnapshot.forEach((doc) => {
            const studioId = doc.id
            const data = doc.data();

            //Review Reviews and display average
            reviewDb
                .where("studioId", "==", studioId)
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



            console.log({ data })

            studioStr +=
                `
        <!--Studio One-->
        <div class="stuOne col-6">
            <div class="stucontainer">
                <div class="card1-stack">
                    <!--Studio Front Page-->
                    <div class="card1 text-white card-has-bg" 
                        style="background-image:url('${data.homeImageURL}'); background-size: cover;" onclick="redirectToStudioPage('${studioId}')">
                        <div class="card-img-overlay d-flex flex-column" >
                            <div class="card-body" >
                                <div class="media">
                                    <img class="mr-3 rounded-circle" id="stuImage"
                                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxUXsEFPioqCqDqgp7MeLNpM7iZYL6mt97ElI3LwCnuFoarwmSWbJquoEwbi1AJSRzXBs&usqp=CAU"
                                        alt="Generic placeholder image"
                                        style="max-width:50px; position: relative; top: 50px; left: -150px;">
                                    <div class="media-body">
                                        <h6 class="card-meta mb-2" ><strong>${data.studioName}</strong></h6>
                                        <small class="stuLocation">${data.stuCity}, ${data.stuState}</small>
                                    </div>
                                </div>
                                <!--Heart Button--->
                                <div class="btns1">
                                    <button style="font-size: 35px; border: none" id="like-button-${studioId}"
                                        class="btn"><i class="fas fa-heart"></i></button>
                                </div>
                                <!---Heart Button--->
                                <!---Star Rating--->
                                <img class="star" src="Images/Star.png">
                                <h2 id="current-rating"></h2>
                                
                                <!---Star Rating--->                            
                            </div>
                        </div>
                        <!--Studio Front Page-->
                    </div>

                </div>
            </div>
        </div>

      `

            console.log("displaying...")
            document.getElementById("studioList").innerHTML = studioStr;



            renderHeartButtonColor(studioId)

            $(`#like-button-${studioId}`).click((e) => {
                toggleSavedStudio(e, studioId)
            })

        })
    })
        .catch((error) => {
            console.log("read services error ===", error);
        });

}


//Heart button for studios
async function readSavedStudiosData() {
    const userId = currentUser.uid
    await savedStudiosDb
        .where("uid", "==", userId)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const savedStudioId = doc.id;
                const savedStudioTmpData = doc.data()
                savedStudioData[savedStudioId] = savedStudioTmpData
            })

        })
}

async function markStudioAsSavedOne(studioId) {
    const userId = currentUser.uid
    const doc = await savedStudiosDb.add(
        {
            uid: userId,
            studioId: studioId
        }
    )
    savedStudioData[doc.id] = {
        uid: userId,
        studioId: studioId,
    }
    renderHeartButtonColor(studioId)
}

async function unmarkStudioAsSavedOne(studioId) {
    const userId = currentUser.uid
    await savedStudiosDb
        .where("uid", "==", userId)
        .where("studioId", "==", studioId)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                doc.ref.delete().then(() => {
                    //  Unmark on real time
                    savedStudioData[doc.id] = undefined
                    delete savedStudioData[doc.id]

                    renderHeartButtonColor(studioId)
                    console.log('Document deleted, it should be unmarked')
                })
            })

        })


}

//Heart Button
function toggleSavedStudio(e, studioId) {
    e.preventDefault()
    e.stopPropagation()

    const studio = isStudioInSavedStudios(studioId)
    if (studio) {

        unmarkStudioAsSavedOne(studioId)
    } else {

        markStudioAsSavedOne(studioId)
    }
}

function redirectToStudioPage(studioId) {
    window.location.href = `studiopage.html?studioId=${studioId}`
}

function isStudioInSavedStudios(studioId) {

    return !!Object.values(savedStudioData).find((data) => data.studioId === studioId)
}

function renderHeartButtonColor(studioId) {
    const heartButtonElement = document.getElementById(`like-button-${studioId}`)
    if (isStudioInSavedStudios(studioId)) {
        heartButtonElement.style.color = 'red'
    } else {
        heartButtonElement.style.color = 'grey'
    }
}








