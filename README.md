# Farmaline Farmer Agent

Farmaline is now scoped for the hackathon Domain Agents track: a farmer-first agriculture workspace powered by an OpenAI-backed domain agent.

The app keeps the existing farmer UI and workflows:

- Farmer login and registration
- Farmer dashboard
- Farm mapping
- Weather and crop recommendations
- Plant disease detection
- Produce quality grading
- Product listings and orders
- Equipment rental
- Direct farmer trading
- Government scheme discovery
- Nearby vet booking
- Floating FarmAssist AI agent with tool use

## Agent Focus

FarmAssist is a farmer domain agent. It can call server-side tools for:

- Weather lookup
- Market price search
- Crop recommendations
- Government schemes
- Disease and pest guidance
- Farmer dashboard stats
- Product listing
- Order lookup and status changes
- Vet consultation booking
- Product search

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth, Database, and Edge Functions
- OpenAI API

## Environment

Frontend variables are read from `.env`:

```bash
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Set OpenAI credentials as Supabase Edge Function secrets, not in frontend code:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key
supabase secrets set OPENAI_MODEL=gpt-5.5
```

Optional overrides:

```bash
supabase secrets set OPENAI_FAST_MODEL=gpt-5.5
supabase secrets set OPENAI_VISION_MODEL=gpt-5.5
```

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
