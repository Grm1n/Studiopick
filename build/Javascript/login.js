// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyAfYj2tWB98L7wnzWRv0bFZcW1ppSgxk34",
    authDomain: "studiopick-f6c1f.firebaseapp.com",
    databaseURL: "https://studiopick-f6c1f-default-rtdb.firebaseio.com",
    projectId: "studiopick-f6c1f",
    storageBucket: "studiopick-f6c1f.appspot.com",
    messagingSenderId: "230075033063",
    appId: "1:230075033063:web:3c56a39ea1a84f6f39c942",
    measurementId: "G-9Y07XDWV0W"
};
  
firebase.initializeApp(firebaseConfig);

// Set persistence to session
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
  
// Initialize variables
const auth = firebase.auth()
const firestore = firebase.firestore();
const studioUsersDb = firestore.collection("/studiopick/studios/users")
const artistsUsersDb = firestore.collection("/studiopick/artists/users")

document.getElementById('contactForm')
  .addEventListener('submit', submitForm);


// Set up our login function
function submitForm(e) {
  e.preventDefault();

  // Get all our input fields
  email = getInputVal('email');
  password = getInputVal('password');

  // Validate input fields
  if (validate_email(email) == false || validate_password(password) == false) {
    alert('Email or Password is Outta Line!!')
    return
    // Don't continue running the code
  }

  // Move on with Auth
  auth.signInWithEmailAndPassword(email, password)
    .then(function () {
      // Done
      alert('User Logged In: ' + email);

      // Set userLoggedIn to true in sessionStorage
      sessionStorage.setItem('userLoggedIn', 'true');

      // Check session
      auth.onAuthStateChanged(async function (user) {
        if (user) {
          var user_id = user.uid;
          const userEntityFromDb = await getUserFromDatabase(user_id)

          if (userEntityFromDb.role === 'Studio') {
            // Take user to a different or home page
            window.location.href = "studiodash.html?id=" + user_id;
          } else {
            window.location.href = "artistdash.html?";
          }
        } else {
          alert("No active user please signup or sign in.");
        }
      });
    })
    .catch(function (error) {
      // Firebase will use this to alert of its errors
      var error_code = error.code
      var error_message = error.message

      alert(error_message)
    })
}


// Function to get get form values
function getInputVal(id) {
    return document.getElementById(id).value;
}


// Validate Functions
function validate_email(email) {
    expression = /^[^@]+@\w+(\.\w+)+\w$/
    if (expression.test(email) == true) {
      // Email is good
      return true
    } else {
      // Email is not good
      return false
    }
}
  
function validate_password(password) {
    // Firebase only accepts lengths greater than 6
    if (password < 6) {
        return false
    } else {
        return true
    }
}

  function validate_field(field) {
    if (field == null) {
      return false
    }
  
    if (field.length <= 0) {
      return false
    } else {
      return true
    }
}
  
async function getUserFromDatabase(userId) {
  const doc = await studioUsersDb.doc(userId).get()
    
 
  if (doc.exists) {
    return {
      ...doc.data(),
      id: doc.id,
    };
  }

  const artistUserDoc = await artistsUsersDb.doc(userId).get()

  if (artistUserDoc.exists) {
    return {
      ...artistUserDoc.data(),
      id: doc.id,
    };
  }
    
}
