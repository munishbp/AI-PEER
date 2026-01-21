# AIPEER - Fall Risk Assessment & Intervention App

A 2025-2026 UCF Senior Design Project led by CS students in collaboration with UCF's College of Medicine to design an app that assesses patients' fall risk and guides them toward safer intervention through the PEER intervention method.

## Project Overview

AIPEER is a HIPAA-compliant mobile application that helps healthcare providers assess fall risk in patients and deliver personalized exercise interventions through video guidance.

### Key Features
- **HIPAA Compliant** - Secure video delivery with time-limited access
- **Mobile First** - Built with React Native/Expo for iOS and Android
- **Video Exercises** - Guided physical therapy exercises
- **Secure Backend** - Node.js API with Google Cloud Storage integration

## Project Structure

```
AIPEER/
├── front-end/              # React Native mobile app
│   └── AI-PEER/           # Expo application
│       ├── app/           # Screen components
│       ├── components/    # Reusable UI components
│       ├── assets/        # Images, fonts, etc.
│       └── package.json   # Frontend dependencies
│
├── API/                   # Backend video API
│   ├── server.js          # Express server
│   ├── routes/            # Video endpoint templates
│   ├── services/          # GCS integration
│   ├── .env.example       # Environment variable template
│   ├── package.json       # Backend dependencies
│   └── README.md          # API documentation
│
└── README.md             # This file
```

## Getting Started

### Prerequisites

- **Node.js** v24.x or higher
- **npm** or **yarn**
- **Expo CLI** (for mobile app)
- **Google Cloud Storage** account (for video hosting)

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd AIPEER
```

#### 2. Set Up the Backend API

```bash
cd API
npm install
cp .env.example .env
# Edit .env with your GCS credentials
node server.js
```

The API will run on `http://localhost:3000`

See [API/README.md](./API/README.md) for detailed backend setup instructions.

#### 3. Set Up the Frontend

```bash
cd front-end/AI-PEER
npm install
npx expo start
```

The Expo dev server will start. Use the Expo Go app to test on your device.

## Component Breakdown

### Backend (API/)

**Purpose:** Serves exercise videos with HIPAA-compliant signed URLs

**Tech Stack:**
- Node.js + Express
- Google Cloud Storage SDK
- dotenv for configuration
- CORS enabled for React Native

**Key Files:**
- `server.js` - Main Express server with health check
- `routes/video_template.js` - Template for creating video endpoints
- `services/GCS_Service.js` - Generates time-limited signed URLs
- `.env` - Stores GCS credentials (NOT committed to git)

**Architecture:** One API endpoint per exercise video (Approach A)

### Frontend (front-end/AI-PEER/)

**Purpose:** Mobile app for patients and healthcare providers

**Tech Stack:**
- React Native
- Expo (managed workflow)
- expo-av for video playback
- TypeScript

**Key Features:**
- Exercise video playback
- Fall risk assessment forms
- Patient progress tracking

## Security & HIPAA Compliance

### Backend Security
- Time-limited signed URLs (1 hour expiration)
- Environment variables for credential management
- `.gitignore` prevents credential leaks
- CORS configuration for authorized origins only
- HTTPS required in production

### Data Protection
- All videos encrypted at rest (GCS)
- All API calls encrypted in transit (HTTPS)
- No public URLs for protected content
- Audit logging capability (future enhancement)

### Compliance Requirements
- Business Associate Agreement (BAA) with Google Cloud
- Regular security audits
- Access control and authentication (future enhancement)

## Video Management Workflow

### Adding a New Exercise Video

1. **Upload video to Google Cloud Storage**
   ```bash
   gsutil cp shoulder-stretch.mp4 gs://your-bucket-name/
   ```

2. **Create new route from template**
   ```bash
   cd API/routes
   cp video_template.js shoulderStretch.js
   ```

3. **Update route configuration**
   ```javascript
   const Vid_ID = 'shoulder-stretch.mp4';
   const Exercise_Name = 'Shoulder Stretch';
   ```

4. **Register route in server.js**
   ```javascript
   const shoulderStretch = require('./routes/shoulderStretch');
   app.get('/api/video/shoulder-stretch', shoulderStretch);
   ```

5. **Add button in mobile app**
   ```javascript
   <Button
     title="Shoulder Stretch"
     onPress={() => fetchVideo('shoulder-stretch')}
   />
   ```

## Development

### Running the Full Stack

**Terminal 1 - Backend:**
```bash
cd API
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd front-end/AI-PEER
npx expo start
```

### Environment Variables

**Backend (.env):**
```env
GCS_PROJECT_ID=your-project-id
GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY=your-private-key
GCS_BUCKET_NAME=your-bucket-name
PORT=3000
NODE_ENV=development
```

**Frontend (.env):**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Mobile App Development

### Testing

- **iOS Simulator:** Press `i` in Expo terminal
- **Android Emulator:** Press `a` in Expo terminal
- **Physical Device:** Scan QR code with Expo Go app

### Building for Production

```bash
cd front-end/AI-PEER
eas build --platform ios
eas build --platform android
```

## Testing

### Backend API Tests

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Video Endpoint:**
```bash
curl http://localhost:3000/api/video/test-video
```

### Frontend Tests

```bash
cd front-end/AI-PEER
npm test
```

## Documentation

- [Backend API Documentation](./API/README.md) - Detailed API setup and usage
- [Expo Documentation](https://docs.expo.dev/) - React Native development
- [Google Cloud Storage](https://cloud.google.com/storage/docs) - Video hosting

## Roadmap

### Current Status (Phase 1)
- [x] Backend API structure with video template
- [x] GCS integration with signed URLs
- [x] HIPAA-compliant security setup
- [x] Frontend Expo app initialized

### Phase 2 (In Progress)
- [ ] Frontend video player component with expo-av
- [ ] User authentication system
- [ ] Fall risk assessment forms
- [ ] Exercise button UI

### Phase 3 (Planned)
- [ ] Patient progress tracking
- [ ] Push notifications for exercise reminders
- [ ] PEER Framework Intervention
- [ ] CV Exercise Assessment 

### Phase 4 (Future)
- [ ] AI-powered fall risk prediction
- [ ] Sit to stand test
- [ ] Multi-language support
- [ ] Gameification Process to Incentivize
- [ ] Speech to Speech functionality

## Team
- Arthur Lookshin- https://www.linkedin.com/in/arthur-lookshin-54ba951b5/
- Beile Han
- Pramodh Miryala- https://www.linkedin.com/in/pramodh-miryala-82ab28292/
- Santiago Echeverry
- Munish Persaud- www.linkedin.com/in/munish-persaud

UCF Senior Design Project 2025-2026
- Computer Science Students
- UCF College of Medicine (Collaboration)

## License

[Add license information]

## Troubleshooting

### Backend won't start
- Check if port 3000 is in use: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
- Verify all dependencies installed: `npm install`
- Check `.env` file exists and has correct credentials

### Frontend can't connect to API
- Verify backend is running on `http://localhost:3000`
- Check CORS is enabled in `server.js`
- Ensure `EXPO_PUBLIC_API_URL` is set correctly

### Video won't play
- Verify video file exists in GCS bucket
- Check signed URL expiration (valid for 1 hour)
- Verify GCS credentials in `.env` are correct

### CORS errors
- Ensure `app.use(cors())` is in `server.js`
- Check API URL matches in frontend config

## Useful Links

- [Node.js Documentation](https://nodejs.org/)
- [Express.js Guide](https://expressjs.com/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Google Cloud Storage](https://cloud.google.com/storage)

## Contact

For questions or issues, please contact the development team or open an issue in the repository.

---

**Last Updated:** October 2025
