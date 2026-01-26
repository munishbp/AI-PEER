
//server.js serves as the main() like in other languages
//basically ties everything together to function in the backend

//loads .env specific from user account
require('dotenv').config();


console.log('GCS_PROJECT_ID:', process.env.GCS_PROJECT_ID);
console.log('GCS_CLIENT_EMAIL:', process.env.GCS_CLIENT_EMAIL);
console.log('GCS_PRIVATE_KEY exists:', !!process.env.GCS_PRIVATE_KEY);
console.log('GCS_PRIVATE_KEY length:', process.env.GCS_PRIVATE_KEY?.length);

const express=require('express');
const cors=require('cors')
const verification=require('./middleware/authMiddleware')

const authRoutes = require('./routes/authRoutes');




const app=express();



//cors (cross origin resource sharing)
//json parser to convert text to objects
app.use(cors());
app.use(express.json());

app.get('/health',(req,res)=>{
    res.json({status:'OK',message:'AI PEER API is running'});
});

app.use('/auth', authRoutes);


app.use(verification);


//handles get request
//health is the URL path
//req what client sends
//response is what you send back

//imports function from video_template.js
const video_template=require('./routes/video_template');

//runs the function above and sends back the json response
app.get('/api/video/test-video',video_template);

const PORT=process.env.PORT||3000;


//app listens at this port
app.listen(PORT, ()=>{
    console.log('Server running!')
});


//routes holds all the video scripts to access them