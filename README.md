# 🌿 WildSphere AI

### One small wonder leads you outside.

WildSphere AI is an AI-powered nature exploration platform designed to help people discover, understand, and connect with the natural world. From identifying species in photos to exploring biodiversity around the globe, WildSphere turns curiosity into real-world discovery.

Built around the spirit of **“Touch Grass,”** WildSphere combines AI-assisted exploration, biodiversity data, outdoor challenges, and personal field notes in one nature-inspired experience.

## ✨ Features

### 🔍 AI Nature Identification
Upload a nature photo to explore possible species identifications with AI assistance.

- Designed to help users investigate plants, animals, and other natural discoveries.
- Uses Gemma 3 4B Instruct through OpenRouter, where configured.
- Treat AI identifications as suggestions, not definitive scientific confirmation.

### 🐦 Bird Sound Explorer
Explore bird sounds through an audio-based identification workflow.

- Designed around BirdNET acoustic identification.
- Helps users investigate possible bird species from audio recordings.
- Results depend on the availability and configuration of the audio inference service.

### 🌍 Interactive Biodiversity Explorer
Explore biodiversity records through an interactive world map.

- Select countries and explore recorded observations.
- Browse records by categories such as animals, birds, and plants.
- Open species detail pages to learn more about recorded observations.
- Uses iNaturalist observation data where available.

**Note:** An observation record does not necessarily mean a species is native, common, or currently present in a location.

### 🧭 WildQuest
Turn curiosity into an outdoor adventure with nature-inspired missions.

- Discover activities that encourage real-world observation.
- Explore missions inspired by locations and species.
- Follow practical safety guidance while exploring outdoors.

### 📓 Digital Field Journal
Keep a personal record of your discoveries.

- Record observations and field notes.
- Search and filter saved entries.
- Export journal data where supported.
- Journal entries are stored locally in the browser using localStorage.

Clearing browser data or switching browsers or devices may affect access to locally stored entries. Avoid storing sensitive personal information.

## 🎨 Design Philosophy

WildSphere AI uses a nature-inspired visual style with forest-green tones, warm paper-like surfaces, and a calm field-guide aesthetic.

The goal is to make exploring biodiversity feel approachable, engaging, and accessible to curious learners, nature enthusiasts, and beginners.

## 🧠 AI and Data

WildSphere brings together AI-assisted discovery and biodiversity data sources.

| Component | Technology or source |
|---|---|
| Image identification | Gemma 3 4B Instruct via OpenRouter, where configured |
| Bird sound exploration | BirdNET, where configured |
| Biodiversity observations | iNaturalist |
| Field journal storage | Browser localStorage |

Actual functionality depends on the project's configuration, available services, API access, and deployment environment. AI-generated suggestions and community observation records may be incomplete or incorrect. Verify important identifications with reliable sources or qualified experts.

## 🔒 Privacy

- Field journal entries are designed to remain in the browser's local storage.
- Image and audio processing may involve external services, depending on the active configuration.
- Do not upload private information or sensitive recordings.
- Review the relevant service privacy policies before submitting media.

Local browser storage does not mean every feature operates locally or offline.

## 🚀 Getting Started

To run WildSphere AI locally, clone this repository:

```bash
git clone https://github.com/YOUR-USERNAME/WildSphere-AI.git
cd WildSphere-AI
```

Then follow the setup instructions for the actual framework and package manager used in this project.

For a JavaScript or TypeScript project with a `package.json`, a typical next step may be:

```bash
npm install
npm run dev
```

These commands are examples; check your project's scripts and configuration before running them.

### Environment Variables

Some integrations may require API keys or environment variables.

1. Check the project configuration and integration documentation.
2. Configure required secrets using your local environment or hosting provider's secret manager.
3. Never commit API keys, passwords, access tokens, or `.env` files containing secrets.

## 🛠️ Built With

- Open-weight AI technology
- Gemma via OpenRouter, where configured
- BirdNET, where configured
- iNaturalist observation data
- Web technologies used by the project
- Browser local storage

See the source code and project configuration for the exact frameworks, dependencies, and service integrations.

## 🌱 Why WildSphere AI?

Nature is full of small discoveries that can spark a deeper interest in the world around us.

WildSphere AI aims to make those discoveries easier to pursue by combining technology with outdoor curiosity. Rather than keeping exploration on a screen, it encourages users to take what they learn outside, observe responsibly, and build a personal connection with nature.

**The mission is
