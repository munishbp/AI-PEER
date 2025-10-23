APIs needed:<br>
CRUD<br>
RedCAP<br>


APIs done:<br> 
Video Retrieval Template & Signed URL functionality for that

Video Retrieval API
Provides secure access to the exercise videos in Google Cloud Storage. Each video has its own endpoint and signed URL that expires in 1 hour. 

Use this template to make one API per video
It utilizes the videos being in GCS
It is HIPAA compliant with the signed URLs with expiration
Node.js+Express

1. Install dependencies <br>
Go to API folder<br>
npm install 
2. Copy the example file and put in your GCS creds<br>
Edit .env.example to .env<br>
   GCS_PROJECT_ID=your-gcs-project-id<br>
   GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com<br>
   GCS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-private-key-here...<br>
   GCS_BUCKET_NAME=your-bucket-name<br>
   PORT=3000<br>
   NODE_ENV=development
3. Start your server<br>
node server.js<br>
Do a health check at: http://localhost:3000/health<br>
You should see output

New exercise APIs go in the routes directory<br>
The services directory is for processes like making signed URLs etc...