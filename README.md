# KissOCR

A simple, no-nonsense OCR service that just works. Upload documents, get text. Built with React, Supabase, and Google Gemini Vision API.

## Features

- 🎯 Simple, focused interface
- 📄 Support for images and PDFs
- 🤖 AI-powered text extraction
- 💳 Pay-as-you-go (25¢ per document)
- 📱 Works on all devices
- ⚡ Results in seconds
- 🎁 10 free documents on signup

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase, Netlify Functions
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Payment**: Stripe
- **OCR**: Google Gemini Vision API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- Google Cloud account (for Gemini API)

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development:
   ```bash
   npm run dev
   ```

### Database Setup

1. Connect to Supabase
2. Run migrations
3. Set up storage bucket

## Project Structure

```
├── netlify/
│   └── functions/          # Serverless functions
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── stores/            # State management
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── supabase/
│   └── migrations/        # Database migrations
└── package.json
```

## API Documentation

### Authentication

- `POST /auth`
  - Actions: signup, signin
  - Returns user session

### Document Processing

- `POST /process-document`
  - Processes document
  - Requires auth
  - Uses 1 credit

### Payments

- `POST /create-checkout`
  - Creates checkout session
  - Requires auth

## Development

### Code Style

- Use TypeScript
- Follow ESLint rules
- Use functional components
- Handle errors properly
- Write clear commits

### Security

- Validate all input
- Check authentication
- Rate limit requests
- Follow best practices

## Deployment

### Netlify

1. Connect repository
2. Set environment variables
3. Enable functions
4. Set build command: `npm run build`
5. Set publish directory: `dist`

### Stripe Setup

1. Create webhook
2. Point to `/stripe-webhook`
3. Add webhook secret to env

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Push branch
5. Create pull request

## License

MIT License