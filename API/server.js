
//server.js serves as the main() like in other languages
//basically ties everything together to function in the backend

//loads .env specific from user account
require('dotenv').config();

const express=require('express');
const cors=require('cors')
const verification=require('./middleware/authMiddleware')



const app=express();



//cors (cross origin resource sharing)
//json parser to convert text to objects
app.use(cors());
app.use(express.json());

app.get('/health',(req,res)=>{
    res.json({status:'OK',message:'Server is not running yet but the code is working?'});
});

app.use(verification);


//handles get request
//health is the URL path
//req what client sends
//response is what you send back

//imports function from video_template.js
const video_template=require('./routes/video_template');

// Routes
app.use("/users", userRoutes);
const userRoutes = require("./routes/userRoutes");


//runs the function above and sends back the json response
app.get('/api/video/test-video',video_template);

const PORT=process.env.PORT||3000;


//app listens at this port
app.listen(PORT, ()=>{
    console.log('Server is still waiting to be setup but this works!')
});


//routes holds all the video scripts to access them