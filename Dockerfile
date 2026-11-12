
FROM node:20-bookworm-slim

WORKDIR /app

# Install tools needed by native Node.js packages
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package information
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the application files
COPY . .

# Set production environment
ENV NODE_ENV=production

# Render will provide the PORT environment variable
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
