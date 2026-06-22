FROM node:22-alpine

WORKDIR /app

# Install pnpm (pnpm 9 — pnpm 10+ fatalno pade na neodobrenih build skriptah sharp/unrs-resolver)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Run the development server
CMD ["pnpm", "dev"]

