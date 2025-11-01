# filepath: f:\Towns-whisper\0g_storage_service\Dockerfile

# Use an official Node.js runtime
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3002

# Command to run the app
CMD ["npm", "start"]