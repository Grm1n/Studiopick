//Declaring HTML Elements
const imgDiv = document.querySelector('.profile-pic');

const img = document.querySelector('#photo');
const file = document.querySelector('#file');
const uploadBtn = document.querySelector
('#uploadBtn');

//Image displaying
file.addEventListener('change', function(){
    //Refers to file
    const chosedFile = this.files[0];
    //Predefined function of JS

    if (chosedFile) {
        const reader = new FileReader();
        //Predefined function of JS
        
        reader.addEventListener('load', function
        (){
            img.setAttribute('src', reader.
            result);
        });

        reader.readAsDataURL(chosedFile);
         
    }
    
});