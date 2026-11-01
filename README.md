# 🗺️ Prompt-to-Map – AI-Powered Location & Navigation

An interactive web application that converts user prompts into location-based results using Google Maps API. Users can enter a location, address, or destination and visualize the result on an interactive map with navigation from their current location.

## 🚀 Project Overview

**Prompt-to-Map** simplifies location discovery and navigation by allowing users to search for destinations using natural language or address-based inputs.

The application processes user input, identifies the relevant location, and displays it on Google Maps, helping users explore destinations and find routes conveniently.

## ✨ Features

- 🔍 **Prompt-Based Location Search** – Search for locations using text prompts.
- 📍 **Location Identification** – Identify and display the requested destination.
- 🗺️ **Interactive Google Maps** – Visualize locations directly on the map.
- 📌 **Current Location Detection** – Identify the user's current location (with permission).
- 🚗 **Route Navigation** – Display routes between the current location and destination.
- 📱 **Responsive UI** – Designed to work across desktop and mobile devices.

## 🛠️ Technologies Used

- React.js
- JavaScript (ES6+)
- Google Maps API
- HTML5
- CSS3
- Vite

## ⚙️ Getting Started

Follow these steps to run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

### 2. Navigate to the Project Directory

```bash
cd YOUR_REPOSITORY
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

Replace `YOUR_GOOGLE_MAPS_API_KEY` with your Google Maps API key.

### 5. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

## 🔑 API Configuration

This project uses Google Maps Platform services.

Depending on the enabled functionality, configure the required APIs in Google Cloud Console:

- Maps JavaScript API
- Places API
- Geocoding API
- Directions API (if used by the implementation)

**Note:** Enable billing and configure API restrictions according to Google Maps Platform requirements. Never commit API keys or `.env` files to GitHub.

## 📂 Project Structure

```text
prompt-to-map/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .env
├── .gitignore
├── index.html
├── package.json
└── README.md
```

*The structure above is a reference; adjust it to match the actual project.*

## 🎯 Project Goal

The goal of Prompt-to-Map is to explore how modern web technologies and mapping services can make location discovery and navigation simpler through an intuitive prompt-based experience.

## 👨‍💻 Developer

**Mohamed Yasar Arafat**

- GitHub: https://github.com/MohamedYasarArafat
- LinkedIn: https://www.linkedin.com/in/mohamed-yasar-arafat-64b4b0293/
- Portfolio: https://mohamedyasararafat.github.io/yasar---Portfolio/

---

⭐ If you find this project interesting, feel free to explore the repository!
