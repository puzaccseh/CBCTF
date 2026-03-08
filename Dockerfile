# Dockerfile for Cyber Bangla CTF
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
