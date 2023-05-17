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
const db = firebase.firestore().collection("/studiopick/studios/users");
const studiosDb = firebase.firestore().collection("/studiopick/studios/studios");

const element = document.querySelector("form");
element.addEventListener("submit", (event) => {
  event.preventDefault();

  // renamed from newStudio
  // don't use alert - it blocks the thread
  console.log("debug: retrieving data... please wait");

  // Get data
  (studioName = document.getElementById("studioName").value),
    (email = document.getElementById("email").value),
    (password = document.getElementById("password").value),
    (firstName = document.getElementById("firstName").value),
    (lastName = document.getElementById("lastName").value),
    (phoneNumber = document.getElementById("phoneNumber").value);

  console.log({ studioName, firstName, email }); // note added braces here

  // Validate input fields
  if (!validate_email(email) || !validate_password(password)) {
    // TODO: replace this alert with updating the form with an error message
    alert("Error with email or password");
    return false; // cancel submission
  }

  if (
    !validate_field(firstName) ||
    !validate_field(lastName) ||
    !validate_field(phoneNumber) ||
    !validate_field(studioName)
  ) {
    // TODO: replace this alert with updating the form with an error message
    alert("One or More Extra Fields is Outta Line!!");
    return false; // cancel submission
  }

  console.log("Info grab successful");

  // creates the user, and waits for it to finish being created
  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      console.log("userCredential ===", userCredential);
      var usersRef = db;
      await usersRef.doc(`${userCredential.user.uid}`).set({
        studioName: studioName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phoneNumber: phoneNumber,
        uid: userCredential.user.uid,
        role: 'Studio'
      });

      await studiosDb.add({
        uid: userCredential.user.uid,
        studioName: studioName,
      })

      console.log("firebase.auth().currentUser ===", firebase.auth().currentUser.uid);
      const uid = firebase.auth().currentUser.uid;

      const data = {
        to: email,
        studioName: studioName,

      };

      // once the above tasks succeed, navigate to the dashboard.
      window.location.href = "studiodash.html?id=" + uid;

      console.log("Sending Email")

      // Send the confirmation email
      return fetch('http://localhost:3000/send-swelcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });


    })
    .catch((error) => {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // [START_EXCLUDE]
      if (errorCode == "auth/weak-password") {
        alert("The password is too weak.");
      } else {
        alert(errorMessage);
      }
      console.log(error);
      // [END_EXCLUDE]
    });

  return false;
});

// Validate Functions
function validate_email(email) {
  expression = /^[^@]+@\w+(\.\w+)+\w$/;
  if (expression.test(email) == true) {
    // Email is good
    return true;
  } else {
    // Email is not good
    return false;
  }
}

function validate_password(password) {
  // Firebase only accepts lengths greater than 6
  if (password < 6) {
    return false;
  } else {
    return true;
  }
}

function validate_field(field) {
  if (field == null) {
    return false;
  }

  if (field.length <= 0) {
    return false;
  } else {
    return true;
  }
}
