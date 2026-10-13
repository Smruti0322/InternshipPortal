# Internship Portal

A full-stack web application designed to connect students and job seekers with internship opportunities. The platform includes user authentication, internship applications, subscription plans, resume building, community features, and login security.

## Features

### 1. Multilingual Support
- Multiple language options.
- Language preference management.
- Email OTP verification for French language switching.

### 2. Resume Builder
- Create and manage resumes.
- Premium resume generation with PDF support.
- Payment verification before premium resume access.
- Resume history management.

### 3. Authentication and Password Security
- User registration and login.
- Forgot-password functionality with OTP verification.
- Temporary password and forced password change support.

### 4. Community
- Create and manage posts.
- Friends, follows, comments, likes, and shares.
- Hashtags and notifications.

### 5. Login Security
- Login history and device information.
- Email OTP verification for supported login scenarios.
- Session management and trusted devices.

### 6. Internship Applications and Subscriptions
- Browse internship opportunities.
- Apply for internships.
- Subscription plans with application limits.
- Razorpay payment integration in test mode.
- Subscription history and payment records.

## Tech Stack

**Frontend**
- React.js
- Vite
- JavaScript
- HTML and CSS

**Backend**
- Node.js
- Express.js

**Database**
- MySQL

**Integrations**
- Razorpay payment gateway
- Email delivery and OTP verification

## Project Structure

```text
InternshipPortal/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/
│   ├── server.js
│   └── package.json
├── .gitignore
├── .env.example
└── README.md
```

*The structure above is an example; adjust it to match the actual folders in your project.*

## Prerequisites

- Node.js and npm
- MySQL Server or XAMPP
- Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd InternshipPortal
```

### 2. Configure the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder using `.env.example` as a reference. Add your own local database settings, email configuration, and Razorpay test credentials.

### 3. Configure the Database

1. Start MySQL.
2. Create the database named `internship_portal`.
3. Import the database schema or SQL setup file provided with the project.
4. Update the database configuration in your local `.env` file.

### 4. Start the Backend

```bash
node server.js
```

The backend is configured to use port `5000`, unless changed in your environment configuration.

### 5. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Environment Variables

Configure the required environment variables locally. Refer to `.env.example` for the variable names.

**Never commit real passwords, email credentials, API keys, payment secrets, or private user data.**

## Payment Testing

Use Razorpay test mode and test credentials while developing. Do not use real payment credentials in the public repository.

## Project Status

This project is being developed and tested. Features and integrations may require configuration before they work in a local environment.

## Author

**Smruti Navik**

- GitHub: [Smruti0322](https://github.com/Smruti0322)
- LinkedIn: [Smruti Navik](https://www.linkedin.com/in/smrutinavik/)

## License

No license has been specified yet. All rights are reserved unless a license is added to this repository.